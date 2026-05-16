# Istiqoma — A Better You, One Deed at a Time

> **Quran Foundation Hackathon Submission**

Istiqoma (إستقامة — "steadfastness") is a spiritual self-improvement app for Muslims. It brings together daily good-deed tracking, prayer time reminders, a full Qur'an reader with audio, and a points-and-streak system — all in one dark-themed, mobile-friendly Progressive Web App.

**Live app:** [https://istiqoma.com](https://istiqoma.com)

---

## Screenshots

<table>
  <tr>
    <td align="center"><img src="attached_assets/Screenshot_2026-05-03_at_17.59.44_1777806008957.png" width="480" alt="Landing page"/><br/><sub>Landing page</sub></td>
    <td align="center"><img src="attached_assets/IMG_3949_1777268146468.png" width="220" alt="Dashboard — deeds, streak, Quran memorization target"/><br/><sub>Dashboard — deeds, streak &amp; Quran targets</sub></td>
    <td align="center"><img src="attached_assets/IMG_3206_1772190342604.png" width="220" alt="Activity feed with points per deed"/><br/><sub>Activity feed &amp; points</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="attached_assets/IMG_3201_1772118037170.png" width="220" alt="Khatam Al-Quran — Quran reading target with juz counter and calendar"/><br/><sub>Khatam Al-Quran target (powered by QF Content API)</sub></td>
    <td align="center"><img src="attached_assets/IMG_3947_1777249079115.png" width="220" alt="Prayer tracker — Sholat times"/><br/><sub>Prayer time tracker</sub></td>
    <td align="center"><img src="attached_assets/IMG_3967_1777512496689.png" width="220" alt="Target consistency calendar"/><br/><sub>Target consistency calendar</sub></td>
  </tr>
</table>

---

## Key Features

- **Good-deed log** — record Sholat, Dzikir, Puasa, Quran reading, Sedekah, and custom acts of worship. Points are calculated server-side based on category and quantity.
- **Full Qur'an reader** — all 114 surahs, multiple translations, verse-by-verse Arabic text, powered by the **Quran Foundation Content API**.
- **Spotify-style audio player** — full-surah recitation with a mini player, reciter picker, and real-time verse highlighting driven by QF verse-timing data.
- **Memorization tracker** — mark verses as memorized; each verse earns 50 points and auto-logs a "Hafalan Quran" deed that counts toward your streak and leaderboard rank.
- **Cross-device bookmark sync** — connect your Quran.com / QuranReflect account via **Quran Foundation User API** (OAuth2 + PKCE) and your bookmarks sync between Istiqoma and Quran.com.
- **Prayer times & Qibla** — location-aware prayer schedules using the `adhan` library; live compass for Qibla direction.
- **Streaks & Streak Freezer** — daily streak tracking; spend earned points to freeze a missed day and protect your streak.
- **Spiritual targets** — set recurring goals (daily/weekly/monthly) with interactive consistency calendars.
- **Islamic Quiz** — 100 questions across 10 levels, fully localized in Indonesian, Malay, and English.
- **Leaderboard** — community rankings by total points.
- **Push notifications** — daily reminders, prayer-time alerts, and target nudges.
- **Multilingual** — Indonesian (id), Malay (ms), English (en).

---

## Quran Foundation API Integration

Istiqoma uses two official Quran Foundation APIs as the hackathon-required integrations.

### 1 — Content API (OAuth2 Client Credentials)

**What it powers:** the entire Qur'an reader experience — chapter list, verse text, translations, reciter catalogue, surah-level audio streams, and verse timing data.

| Feature | QF endpoint used |
|---|---|
| Chapter list & metadata | `GET /chapters` |
| Verse text + translations | `GET /verses/by_chapter/{id}` |
| Available reciters | `GET /resources/recitations` |
| Surah audio stream URL | `GET /chapter_recitations/{reciter}/{chapter}` |
| Verse timing segments | `GET /recitations/{reciter}/by_chapter/{chapter}?segments=true` |

**Implementation:** `server/qf-content.ts` is a thin Express proxy at `/api/qf/content/*`. It:

- Fetches an `OAuth2 client_credentials` token (scope: `content`) and caches it in-process.
- Refreshes the token 60 seconds before expiry; on a 401 it clears the cache and retries once.
- Attaches the required `x-auth-token` and `x-client-id` headers on every upstream request so credentials never reach the browser.
- Enforces an allowlist of paths to prevent open-relay abuse.
- Falls back transparently to the public `api.quran.com/api/v4` (identical path shape) when credentials are not configured, so local development works out of the box without QF keys.

Verse-timing data (`?segments=true`) drives the real-time **active-verse highlight and auto-scroll** in the Qur'an reader: the player's `timeupdate` event compares playback position against `timestamp_from`/`timestamp_to` boundaries to scroll and highlight the current ayah as audio plays.

### 2 — User API — Bookmarks (OAuth2 Authorization Code + PKCE)

**What it powers:** cross-device bookmark sync between Istiqoma and users' Quran.com / QuranReflect accounts.

**User flow:** A "Connect Quran Foundation" card on the profile page initiates the OAuth2 PKCE flow (`scope: openid offline_access bookmark`). After authorizing on Quran Foundation's consent page, the user's access and refresh tokens are stored in the `qf_user_tokens` table. From then on, every bookmark add/remove in Istiqoma is mirrored to QF in the background, and `GET /api/quran/bookmarks` merges the remote QF list into the local response.

**Implementation:** `server/qf-user.ts` — key details:

- Token exchange and refresh use `client_secret_basic` (HTTP Basic `Authorization` header) as required by QF production — sending credentials in the POST body is rejected with `invalid_client`.
- The scope string is `openid offline_access bookmark`; the shorthand `offline` is rejected by QF production with `invalid_scope`.
- Mirroring is **non-fatal**: if QF is unreachable, the local database remains the source of truth and the response always succeeds.
- Endpoints: `GET /api/qf/connect` (start flow), `GET /api/qf/callback` (exchange code), `POST /api/qf/disconnect`, `GET /api/qf/status`.

---

## Hackathon Judging Checklist

| Requirement | Where to find it |
|---|---|
| Uses QF Content API | `server/qf-content.ts` — proxy at `/api/qf/content/*`; powering Qur'an reader, audio, verse timing |
| Uses QF User API | `server/qf-user.ts` — OAuth2 PKCE bookmark sync at `/api/qf/*` |
| Production QF credentials configured | `QF_CONTENT_ENV=production`, `QF_ENV=production` in env |
| Real-time verse highlight via QF timing data | `client/src/pages/SurahPage.tsx` — `timeupdate` vs `timestamp_from`/`timestamp_to` |
| Cross-device bookmark sync | Profile page → "Connect Quran Foundation" card → `qf_user_tokens` table |
| Quran memorization rewarded as deeds | `POST /api/quran/memorizations` → auto-logs 50-pt "Hafalan Quran" deed |
| Live at custom domain | [https://istiqoma.com](https://istiqoma.com) |
| Mobile-friendly PWA | Installable from browser; dark theme; bottom navigation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | Wouter |
| State / data | TanStack React Query v5 |
| Styling | Tailwind CSS, shadcn/ui (Radix UI) |
| Animations | Framer Motion |
| Backend | Express.js, TypeScript, Node.js (`tsx`) |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Replit Auth (OIDC / Google SSO) + Username & PIN |
| Sessions | `express-session` with PostgreSQL store |
| Push notifications | Web Push API + VAPID keys |
| Prayer times | `adhan` library |
| Deployment | Replit Autoscale |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Supabase free tier works)

### 1. Fork on Replit or clone

This project is hosted on Replit. To run it yourself:

- **Replit (recommended):** fork the project at [https://replit.com/@your-username/istiqoma](https://replit.com) — dependencies install automatically.
- **Local clone:**

```bash
git clone https://github.com/your-org/istiqoma.git   # replace with actual repo URL
cd istiqoma
npm install
```

### 2. Environment variables

Create a `.env` file (or set these in your hosting environment):

```env
# ── Required ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=a-long-random-string-at-least-32-chars

# ── Web Push (generate with: npx web-push generate-vapid-keys) ────────
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

# ── Quran Foundation Content API (OAuth2 client_credentials) ─────────
# Get credentials at https://api-docs.quran.foundation
QF_CONTENT_CLIENT_ID=your-content-client-id
QF_CONTENT_CLIENT_SECRET=your-content-client-secret
# QF_CONTENT_ENV=production   # default; use "prelive" for testing

# ── Quran Foundation User API (OAuth2 Authorization Code + PKCE) ─────
# Same client if your QF client has the bookmark scope approved
QF_USER_CLIENT_ID=your-user-client-id
QF_USER_CLIENT_SECRET=your-user-client-secret
QF_REDIRECT_URI=https://your-domain.com/api/qf/callback
# QF_ENV=production           # default; use "prelive" for testing
```

> **Local dev without QF credentials:** Both QF integrations degrade gracefully. Without `QF_CONTENT_CLIENT_ID`, the Qur'an reader falls back to the public `api.quran.com/api/v4` API. Without `QF_USER_CLIENT_ID`, the "Connect Quran Foundation" button is hidden and bookmark sync is skipped — all other features work normally.

### 3. Run database migrations

```bash
npm run db:push
```

### 4. Start the development server

```bash
npm run dev
```

The app runs on [http://localhost:5000](http://localhost:5000) — Express serves both the API and the Vite-built frontend on the same port.

---

## Project Structure

```
istiqoma/
├── client/          # React frontend (pages, components, hooks, i18n)
├── server/          # Express backend (routes, storage, QF proxies)
│   ├── qf-content.ts   # QF Content API proxy
│   └── qf-user.ts      # QF User API (OAuth2 + bookmarks)
├── shared/          # Drizzle schema, Zod types, API contract
└── API_REFERENCE.md # Full REST API documentation
```

---

## API Reference

See [`API_REFERENCE.md`](./API_REFERENCE.md) for the complete REST API documentation including the QF proxy endpoints and all data types.

---

## License

MIT
