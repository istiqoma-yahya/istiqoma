# Istiqoma — Quran Foundation Hackathon 2026 Submission

## Project title
**Istiqoma — Spiritual self-improvement & habit-tracking for Muslims, powered by the Quran Foundation API.**

## Team
- See `team.txt` (or fill in below before submission)
  - Member 1 — Lead developer
  - Member 2 — Optional
  - Member 3 — Optional
  - Member 4 — Optional

## One-line description
A Muslim habit tracker that turns daily ʿibadah into measurable progress — Sholat, Dzikir, Qur'an reading, memorization, and 8 other categories — with a built-in Qur'an reader, bookmarks, and verse memorization rewards, all backed by the official Quran Foundation Content API.

## Detailed description
Many Muslims feel their connection to the Qur'an deepens during Ramadan and fades afterwards. Istiqoma ("steadfastness") is built around the idea that consistency, not intensity, is what carries that connection forward. The app lets users:

- Log good deeds (`Sholat Fardhu`, `Tilawah`, `Hafalan Qur'an`, `Sedekah`, `Puasa`, `Dzikir`, custom categories) with quantity, unit, and automatic point calculation.
- Read the full Qur'an in 3 languages (English, Indonesian, Malay) with surah-level audio playback synced to the currently-recited ayah, per-verse playback, font/typography controls, and a Spotify-style mini player + Now Playing sheet.
- Bookmark verses and resume their last-read position across devices.
- Mark verses as memorized (Hafalan) — every newly memorized verse automatically logs a 50-point deed, contributing to the user's streak and the leaderboard.
- Set targets and visualise progress on an interactive consistency calendar, freeze missed days with a streak freezer purchased with in-app points.
- Take a 100-question Islamic quiz (10 levels, fully translated in EN/ID/MS).

All Qur'an content (chapters, verses, recitations, audio with per-ayah timing) is served by the **Quran Foundation Content API**, and bookmarks are mirrored to the user's **Quran Foundation User account** via OAuth2 + PKCE so they stay in sync with Quran.com and any other QF-powered surface.

## How we use Quran Foundation APIs

### 1. Quran Foundation Content API (required)
- **Auth**: OAuth2 `client_credentials` with `content` scope.
- **Where**: server-side only (`server/qf-content.ts`). The browser never sees `client_secret`. Tokens are cached in-process and refreshed 60s before expiry; a 401 from upstream triggers exactly one re-auth + retry.
- **Proxy**: `GET /api/qf/content/<path>` forwards to `https://apis.quran.foundation/content/api/v4/<path>` with the required `x-auth-token` and `x-client-id` headers, plus a `Cache-Control: public, max-age=3600` response header.
- **Endpoints used**:
  - `GET /chapters?language=<en|id|ms>` — surah list for the home page.
  - `GET /chapters/{id}?language=<...>` — surah header on the reader.
  - `GET /verses/by_chapter/{id}?translations=<id>&fields=text_uthmani&per_page=300` — full chapter text in one call.
  - `GET /resources/recitations` — reciter picker.
  - `GET /chapter_recitations/{reciter}/{chapter}?segments=true` — full-surah audio + per-ayah timing.
  - `GET /recitations/{reciter}/by_chapter/{chapter}?per_page=300&page=N` — per-verse audio for ayah-only playback.

### 2. Quran Foundation User API — Bookmarks
- **Auth**: OAuth2 Authorization Code + PKCE with scopes `openid offline bookmark`. Implemented in `server/qf-user.ts`.
- **Flow**: User clicks "Connect Quran Foundation" on `/profile` → `GET /api/qf/connect` generates PKCE + state, redirects to `https://oauth2.quran.foundation/oauth2/auth` → QF redirects to `GET /api/qf/callback` → server exchanges code for tokens, persists in `qf_user_tokens`.
- **Endpoints used**:
  - `POST /content/api/v4/user/bookmarks` (mirror local add).
  - `DELETE /content/api/v4/user/bookmarks/{key}` (mirror local remove).
  - `GET /content/api/v4/user/bookmarks` (merge into the list endpoint so users see remote bookmarks too).
- **Failure model**: Mirroring is non-fatal and runs after the local DB write. If QF is down, the local bookmark still succeeds and the user notices nothing.

### What we deliberately do **not** use
Per scope guidance for hackathon judging, we integrate **Bookmarks only** from the User API. We do not call Activity, Goals, Streak, Collections, or Posts endpoints — Istiqoma already has its own first-class streak, target, and category systems that are deeply integrated with the deed/points/leaderboard pipeline, and re-implementing them via QF would add friction without user benefit.

## Demo

### Demo URL
https://istiqoma.replit.app (production) — connect a Quran Foundation account from the Profile page to see end-to-end bookmark sync.

### Demo video script (≈ 90 s)
1. **0:00–0:10** — Open Istiqoma. Show home dashboard with today's deeds and streak.
2. **0:10–0:25** — Tap **Qur'an** → surah list loads from QF Content API. Open Surah Al-Baqarah → verses + Indonesian translation render, surah audio starts → highlight follows the active ayah.
3. **0:25–0:40** — Tap the bookmark icon on verse 2:255 (Ayat al-Kursi). Toast confirms. Open `/quran/bookmarks` → verse appears.
4. **0:40–0:55** — Mark verses 2:1–2:5 as memorized → 5 × 50 = 250 points appear in today's deeds under "Hafalan Qur'an".
5. **0:55–1:15** — Go to **Profile** → tap **Connect Quran Foundation** → sign in on QF → redirected back, "Connected" badge shows. Add another bookmark → it now appears in Quran.com.
6. **1:15–1:30** — Show the Profile **Disconnect** button + the streak/leaderboard pages to convey scope.

## Technical highlights

- **Stack**: React 18 + TypeScript + Vite (frontend), Node 20 + Express + Drizzle ORM + PostgreSQL (backend), Tailwind + shadcn/ui (design), Wouter (routing), TanStack Query (data fetching), Framer Motion (animation), Playwright (e2e).
- **Auth**: Replit OIDC + first-party username + PIN.
- **i18n**: 3 languages (EN/ID/MS) keyed across UI, Qur'an translations, and the 100-question quiz bank.
- **Push reminders**: web-push with VAPID, computed Sholat times via `adhan` library, per-target alerts.
- **Streak system**: `pg_advisory_xact_lock`-protected streak freezer purchases, no-retroactive-repair invariant via `floor_date`.
- **Mobile-ready**: typed API contract in `shared/routes.ts` + `API_REFERENCE.md` for external clients.
- **Security**: see `threat_model.md` for the full STRIDE analysis. All QF Content API credentials stay server-side; user OAuth uses session-bound PKCE state.

## Source code map (where to read what)

| Concern | File |
| --- | --- |
| QF Content API token cache + proxy | `server/qf-content.ts` |
| QF User API PKCE + bookmark mirror | `server/qf-user.ts` |
| Bookmark add/remove + merge | `server/routes.ts` (lines around `api.quran.listBookmarks`) |
| Client-side QF API wrappers | `client/src/lib/quranApi.ts` |
| Connect/Disconnect UI | `client/src/pages/ProfilePage.tsx` (`QuranFoundationConnectCard`) |
| Migration | `migrations/0013_qf_user_tokens.sql` |
| End-to-end test | `tests/e2e/qf-content.spec.ts` |

## Required environment variables

| Name | Required | Description |
| --- | --- | --- |
| `QF_CONTENT_CLIENT_ID` | yes | Client ID for the Content API client. |
| `QF_CONTENT_CLIENT_SECRET` | yes | Client secret for the Content API client. |
| `QF_USER_CLIENT_ID` | optional | Client ID for the User API client (bookmarks). Without it, the Profile "Connect" card is hidden. |
| `QF_USER_CLIENT_SECRET` | optional | Client secret for the User API client. |
| `QF_REDIRECT_URI` | optional | Override the OAuth redirect URI. Defaults to `<deployment-host>/api/qf/callback`. |
| `QF_ENV` | optional | `production` (default) or `prelive`. Selects QF auth + API base URLs. |

## License & IP
Per the hackathon rules, the team retains full ownership of the project. Quran Foundation may showcase the work for educational and promotional purposes.
