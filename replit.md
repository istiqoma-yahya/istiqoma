# Istiqoma

## Overview

Istiqoma is a spiritual self-improvement application for Muslims, enabling users to track and visualize their daily good deeds. It supports logging deeds with descriptions, categories, and point values, and provides progress statistics. The application includes user authentication, category management, and a modern dark-themed UI with emerald green accents. The application exclusively focuses on tracking good deeds.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with custom CSS variables
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Animations**: Framer Motion
- **Build Tool**: Vite

The frontend uses a component-based architecture with dedicated directories for pages, reusable components, and custom hooks.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with `tsx`
- **API Style**: REST endpoints defined with Zod validation
- **Session Management**: `express-session` with PostgreSQL store

The backend handles Replit Auth integration, CRUD operations for deeds, categories, and targets, streak calculation, push notification management, and static file serving.

### Qur'an Menu
- Routes: `/quran` (chapter list + continue-reading), `/quran/:id` (surah reader), `/quran/bookmarks`.
- Public Qur'an content (chapters, verses, audio) is served by the **Quran Foundation Content API** via a server-side proxy at `/api/qf/content/*` (`server/qf-content.ts`). The proxy holds the OAuth2 `client_credentials` token in process, attaches the required `x-auth-token` / `x-client-id` headers, refreshes 60s before expiry, and on a 401 clears its cache and retries once. If `QF_CONTENT_CLIENT_ID` is unset (e.g. local dev), the proxy transparently falls back to `api.quran.com/api/v4` (identical path shape) so the app keeps working without QF credentials.
- Personal data (verse bookmarks, last-read position, preferred reciter) is persisted via own backend in `quran_bookmarks` and `quran_reading_state` tables.
- **QF credentials**: Both the Content proxy and the User/bookmark flow run against the **production** QF environment (`QF_ENV=production`, `QF_CONTENT_ENV=production`). `QF_CONTENT_CLIENT_ID/SECRET` and `QF_USER_CLIENT_ID/SECRET` point at the same production client, which has been granted `openid`, `offline_access`, and `bookmark` scopes by QF. The OAuth callback URL is fixed via `QF_REDIRECT_URI=https://istiqoma.com/api/qf/callback` (registered with QF alongside the legacy `https://www.istiqoma.com/api/qf/callback`), so the connect flow only completes on the deployed site, not in dev preview. Apex is canonical because Istiqoma's session cookie is host-only on `istiqoma.com` — bouncing OAuth through `www.istiqoma.com` would lose the cookie and 401 the callback.
- **Quran Foundation User API — Bookmarks**: `server/qf-user.ts` implements OAuth2 Authorization Code + PKCE (`scope=openid offline_access bookmark` — QF production rejects the shorthand `offline` with `invalid_scope`). Users opt in from a "Connect Quran Foundation" card on `/profile` (`QuranFoundationConnectCard` in `client/src/pages/ProfilePage.tsx`). Tokens are stored in `qf_user_tokens` (one row per user). When connected, bookmark add/remove is mirrored to QF in the background and `GET /api/quran/bookmarks` merges remote bookmarks into the local list. Mirroring is non-fatal — the local DB is always the source of truth, so a QF outage never breaks the response.
- Surah-level audio uses a single shared `<audio>` element via `QuranAudioProvider`, which powers a Spotify-style mini player and a full-screen Now Playing sheet with reciter picker.
- Full-surah playback tracks the currently-recited ayah using verse timing data from the QF Content API (`?segments=true` on the `chapter_recitations` endpoint, proxied via `/api/qf/content/*`). The `timeupdate` event compares the playback position against `timestamp_from`/`timestamp_to` boundaries to highlight and auto-scroll to the active verse. A `playbackMode` state (`'surah'` | `'ayah'`) distinguishes full-surah from per-verse playback so the two modes don't interfere.

### API Contract & Mobile Readiness
- A typed API contract (`shared/routes.ts`) defines all endpoints with Zod schemas for input/output.
- `API_REFERENCE.md` provides documentation for mobile/external clients.
- The `shared/` directory is designed for type-safe API integration with mobile projects.

### Data Storage
- **Database**: PostgreSQL hosted on Supabase (separate instances for production and development).
- **ORM**: Drizzle ORM with `drizzle-zod`.
- **Schema**: Defined in `shared/schema.ts`.
- **Migrations**: Drizzle Kit.
- **Session Storage**: Replit-managed Postgres (`DATABASE_URL`).

Database tables include `users`, `sessions`, `deeds`, `targets`, `categories`, `push_subscriptions`, and `prayer_completions`.

### Custom Unit System
Users can select from 8 unit types for custom categories in deeds/targets (e.g., hitungan, ayat, halaman, surat, juz, rakaat, hari, uang). Built-in categories have specialized selectors.

### Automatic Point Calculation
Points are calculated by the backend based on category and quantity. This includes flat points for certain activities and quantity-multiplied points for others (e.g., Sholat Fardhu, Puasa, Baca Quran).

### Quran Memorization Rewards
- Marking a verse as memorized via `POST /api/quran/memorizations` automatically logs a deed in category **"Hafalan Quran"** worth **50 points per verse**, so memorization contributes to streaks and the leaderboard like any other deed.
- Deduplication is anchored on a persistent ledger table `quran_memorization_awards` keyed uniquely on `(user_id, surah_number, verse_number)`. The award row is **never deleted on unmark**, so users cannot farm points by toggling memorization on/off — re-marking the same verse simply finds an existing award row and skips deed creation.
- Race-safe: if a concurrent second request inserts the award row first, the duplicate deed created by the loser is rolled back via `deleteDeed` before the response returns.
- Award failures are non-fatal: if deed creation throws, the verse is still marked memorized and the response succeeds; the error is only logged.

### Push Notifications & Reminders
- **Features**: Auto-prompt, daily reminders, Sholat reminders (using `adhan` library), target alerts.
- **Location**: User coordinates stored for prayer time calculation.
- **Scheduler**: 60-second polling for sending reminders.
- **Notification Sound**: User-configurable sound preference (chime, double, ding, none) synthesized via Web Audio API.

### End-to-end tests
- Playwright specs live in `tests/e2e/` and run via `npm run test:e2e` (configured in `playwright.config.ts`). See `tests/README.md` for details, including how to point the runner at an already-running dev server with `PLAYWRIGHT_SKIP_WEBSERVER=1` and how the auth-required specs depend on an OIDC test mock provided by the agent's testing skill.

### Authentication
- **Providers**:
  - Replit Auth (OpenID Connect) — primary, supports Google SSO.
  - Username + PIN — first-class alternative for users without Google. Stored in `username_logins` (separate from `users.username` profile field), scrypt-hashed PINs, per-username lockout (5 wrong PINs → 15 min) and per-IP rate limit (20/10 min). Session marked with `authProvider: "username"` so OIDC token-refresh middleware short-circuits. Endpoints: `POST /api/auth/username/{signup,signin,change-pin}`. UI at `/login/username` with sign-in/sign-up tabs; PIN management on the profile page.
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL (rolling).
- **Security**: `isAuthenticated` middleware for protected routes.

### Interactive Calendar (Target Detail Page)
The `ConsistencyCalendar` allows users to interact with dates to log or update deed progress for targets. It supports checkbox and increment modes, handles future date locking, and fetches real-time status. Period progress bars (weekly, monthly, one-time) visualize target progress. All client-side time calculations use `Asia/Jakarta` timezone for consistency.

### Onboarding Settings
- After completing onboarding, users can revisit and edit their identity (Q5) and Q1–Q5 answers from `/profile/onboarding`. The page reuses `POST /api/onboarding/complete` (idempotent upsert) and the shared `Q4_TO_REMINDER_TIME` map (in `shared/schema.ts`) so changing Q4 also updates `push_subscriptions.reminder_time`. The Profile page exposes a "Your spiritual journey" card linking into this flow. All copy is localized in id/en/ms.

### Islamic Quiz & Localization
- **UI Strings**: The `quiz` namespace in `client/src/i18n/locales/{en,id,ms}.json` covers all UI surfaces (intro, question flow, result modals, leaderboard). All three locales are kept in sync key-for-key.
- **Question Bank Language**: All 100 quiz questions (levels 1–10) carry full Indonesian (`id`) and Malay (`ms`) translations in `server/quiz-seed.ts`. Arabic-derived religious terms (Salah, Wudu, ﷺ, (a.s.), (r.a.), surah names, etc.) are kept literal across all locales. The server reads the `?locale=` query parameter (validated to `en|id|ms`, default `en`) on the `/api/quiz/state`, `/api/quiz/start`, and `/api/quiz/answer` endpoints. The client passes `i18n.language` as the locale and includes it in React Query keys so a language switch automatically refetches localized questions. Locale fields in `quiz_questions`: `question_text_id`, `options_id`, `explanation_id`, `question_text_ms`, `options_ms`, `explanation_ms`.

### Streak Freezer
- **Functionality**: Allows users to "freeze" missed days to maintain streaks using points purchased in-app.
- **Tables**: `streak_freezes`, `point_purchases`, `user_streak_state`.
- **Concurrency**: Uses `pg_advisory_xact_lock` to prevent double-spending during purchases and consumption.
- **No-retroactive-repair**: `user_streak_state.floor_date` prevents users from retroactively repairing streaks beyond a certain point.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect authentication.
- **Supabase**: PostgreSQL database hosting.

### Key NPM Packages
- **Database**: `drizzle-orm`, `pg`, `connect-pg-simple`.
- **Validation**: `zod`, `drizzle-zod`, `@hookform/resolvers`.
- **UI**: `@radix-ui/*`, `tailwindcss`, `framer-motion`, `lucide-react`.
- **Data Fetching**: `@tanstack/react-query`.
- **Auth**: `passport`, `openid-client`, `express-session`.