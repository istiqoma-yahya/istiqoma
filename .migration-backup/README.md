# Istiqoma — إستقامة

> **"Steadfastness"** — Your daily companion for spiritual growth and Islamic self-improvement.

**Live app → [istiqoma.com](https://istiqoma.com)**

---

## What is Istiqoma?

Istiqoma (إستقامة) is a spiritual self-improvement app for Muslims. It brings together everything you need to build and maintain consistent Islamic habits — a full Qur'an reader with audio and memorization tools, daily deed tracking, targets, prayer times, Qibla, dzikir counter, and more — all in one dark-themed, mobile-friendly Progressive Web App.

<p align="center">
  <img src="attached_assets/Screenshot_2026-05-17_at_06.48.42_1778975349367.png" width="820" alt="Istiqoma landing page"/>
</p>

---

## Features

### 📖 Full Qur'an Reader with Audio
Read the complete Qur'an — all 114 surahs with multiple translations and verse-by-verse Arabic text. A built-in Spotify-style audio player streams full-surah recitation with a mini player, reciter picker, and **real-time verse highlighting** that auto-scrolls to the ayah currently being recited. Powered by the **Quran Foundation Content API**.

<p align="center">
  <img src="attached_assets/IMG_4213_1778976738085.PNG" width="240" alt="Quran chapter list with Continue Reading and Bookmarks/Memorize tiles"/>
  <img src="attached_assets/IMG_4215_1778976738086.PNG" width="240" alt="Now Playing — full-surah audio with auto-advance and continuous play"/>
  <img src="attached_assets/IMG_4214_1778976738086.PNG" width="240" alt="Cross-device bookmarks synced via Quran Foundation User API"/>
</p>

### 🧠 Qur'an Memorization (Hifz)
Practice and strengthen your memorization with an interactive tool that lets you **hide and reveal verses** (show full, first-and-last word, or fully hidden). **Record your own voice** to assess and review your recitation and tajweed. Each memorized verse earns 50 points and is automatically logged as a "Hafalan Quran" deed so it counts toward your streak and leaderboard rank.

<p align="center">
  <img src="attached_assets/IMG_4216_1778976738087.PNG" width="240" alt="Memorization mode with hide/reveal controls"/>
  <img src="attached_assets/IMG_4217_1778976738087.PNG" width="240" alt="In-app voice recording for self-assessment of recitation"/>
  <img src="attached_assets/IMG_4218_1778976738088.PNG" width="240" alt="Playback of your own recorded recitation"/>
</p>

### 🔁 Cross-device Bookmark Sync
Connect your Quran.com / QuranReflect account via the **Quran Foundation User API** (OAuth2 + PKCE) and your verse bookmarks sync seamlessly between Istiqoma and Quran.com — read a verse here, bookmark it, and find it waiting for you on every device.

### 🕌 Daily Good Deed Tracking
Log Sholat, Dzikir, Puasa, Quran reading, Sedekah, kindness to parents, seeking knowledge, and any custom act of worship. Points are calculated server-side based on category and quantity, fueling a streak system that rewards consistency.

<p align="center">
  <img src="attached_assets/IMG_4205_1778976738082.PNG" width="240" alt="Dashboard — daily greeting, record deed CTA, points, streak, targets"/>
  <img src="attached_assets/IMG_3103_1778976738080.PNG" width="240" alt="Streak celebration modal after logging a deed"/>
</p>

### 🎯 Personal & Community Targets
Set meaningful commitments — daily, weekly, monthly, or one-time. Organize related goals into **folders**, track progress on an interactive consistency calendar, and join **community targets** to pursue shared spiritual goals with others.

<p align="center">
  <img src="attached_assets/IMG_4207_1778976738083.PNG" width="240" alt="Targets organized into folders with Individual/Community tabs"/>
</p>

### 📊 Progress Analytics
Visualize your spiritual growth over time through beautiful line charts and category breakdowns. See patterns in your deed history across all categories — Dzikir, Fasting, Memorization, Recitation, Sholat, and more.

<p align="center">
  <img src="attached_assets/IMG_4208_1778976738083.PNG" width="240" alt="Spiritual Progress charts — line chart per category and deeds-by-category pie"/>
</p>

### 📚 Islamic Quiz
Test and expand your knowledge of Islam through 100 questions across 10 levels, with a global leaderboard. Fully localized in English, Indonesian, and Malay — religious terms (Salah, Wudu, ﷺ, surah names, etc.) are kept literal across all locales.

<p align="center">
  <img src="attached_assets/IMG_4206_1778976738082.PNG" width="240" alt="Islamic Quiz — Level 8 question about the Conquest of Makkah"/>
</p>

### 🕐 Prayer Times & 🧭 Qibla Finder
Accurate, location-based prayer schedules (Fajr, Dhuhr, Asr, Maghrib, Isha — plus Imsak, Sunrise, Dhuha, Tahajjud windows) powered by the `adhan` library. Mark prayers as complete to log them as deeds. Find the Qibla wherever you are with a live compass.

<p align="center">
  <img src="attached_assets/IMG_4211_1778976738084.PNG" width="240" alt="Prayer page — today's prayer times for Depok, Jawa Barat"/>
  <img src="attached_assets/IMG_4212_1778976738085.PNG" width="240" alt="Live Qibla compass showing 295°"/>
</p>

### 📿 Dzikir Counter
A simple, distraction-free digital tasbih for post-prayer remembrance and daily wird. Pick from common adhkar (Subhanallah, Alhamdulillah, Allahu Akbar, …) or add your own. Every tap is a point.

<p align="center">
  <img src="attached_assets/IMG_4209_1778976738084.PNG" width="240" alt="Dzikir Counter — tap-to-count tasbih"/>
</p>

### ❄️ Streaks & Streak Freezer
Daily streak tracking that survives life's chaos — spend earned points to **freeze a missed day** and protect your streak. A floor date prevents retroactive repair beyond a safe horizon, and concurrent-safe locking prevents double-spends.

### 🔔 Smart Push Notifications
- Daily reminders at a time of your choosing (defaults derived from your onboarding answers).
- Per-prayer Sholat reminders computed from your location.
- Target nudges when you're falling behind.
- Configurable notification sound (chime, double, ding, none).

### 🌐 Multilingual
Full UI translation in **English, Indonesian (Bahasa), and Malay** — including all 100 quiz questions.

### 🔐 Flexible Authentication
- **Google Sign-In** via Replit Auth (OIDC).
- **Username + PIN** for users without Google, with brute-force protection (per-username lockout + per-IP rate limit) and scrypt-hashed PINs.
- 90-day rolling sessions so you stay signed in.

---

## Quran Foundation API Integration

Istiqoma uses **two** official Quran Foundation APIs:

### 1 — Content API (OAuth2 Client Credentials)
Powers the entire Qur'an reader experience — chapter list, verse text, translations, reciter catalogue, surah audio streams, and **verse timing data** for the real-time active-ayah highlight. Implemented as a thin server-side proxy at `/api/qf/content/*` (`server/qf-content.ts`) so credentials never reach the browser. Falls back transparently to the public `api.quran.com/api/v4` when QF credentials aren't configured, so local development works out of the box.

### 2 — User API — Bookmarks (OAuth2 Authorization Code + PKCE)
Powers cross-device bookmark sync between Istiqoma and users' Quran.com / QuranReflect accounts. Implemented in `server/qf-user.ts` with `scope=openid offline_access bookmark` and `client_secret_basic` token-endpoint authentication (both required by QF production). Mirroring is **non-fatal** — the local database is always the source of truth, so a QF outage never breaks the response.

| QF endpoint | Used for |
|---|---|
| `GET /chapters` | Chapter list & metadata |
| `GET /verses/by_chapter/{id}` | Verse text + translations |
| `GET /resources/recitations` | Available reciters |
| `GET /chapter_recitations/{reciter}/{chapter}` | Surah audio stream URL |
| `GET /recitations/{reciter}/by_chapter/{chapter}?segments=true` | Verse timing data driving the live ayah highlight |
| `GET/POST/DELETE /bookmarks` (User API) | Cross-device bookmark sync |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), Framer Motion, Wouter, TanStack React Query v5 |
| Backend | Express.js, TypeScript, Node.js (`tsx`) |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Replit Auth (OIDC / Google SSO) + Username & PIN |
| Sessions | `express-session` with PostgreSQL store |
| Push | Web Push API + VAPID keys |
| Prayer times | `adhan` library |
| Deployment | Replit Autoscale (PWA, installable on any device) |

---

## Getting Started

Just visit **[istiqoma.com](https://istiqoma.com)** — no download required. Install it as a PWA from your browser for the full app experience on iOS, Android, or desktop.

### Running locally

```bash
git clone https://github.com/your-org/istiqoma.git
cd istiqoma
npm install
```

Create a `.env` file:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=a-long-random-string-at-least-32-chars

# Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

# Quran Foundation Content API (optional — falls back to api.quran.com)
QF_CONTENT_CLIENT_ID=your-content-client-id
QF_CONTENT_CLIENT_SECRET=your-content-client-secret

# Quran Foundation User API (optional — hides "Connect QF" button if unset)
QF_USER_CLIENT_ID=your-user-client-id
QF_USER_CLIENT_SECRET=your-user-client-secret
QF_REDIRECT_URI=https://your-domain.com/api/qf/callback
```

Then:

```bash
npm run db:push   # apply database schema
npm run dev       # start the app on http://localhost:5000
```

See [`API_REFERENCE.md`](./API_REFERENCE.md) for the full REST API documentation.

---

## Contributing

Contributions, bug reports, and feature suggestions are welcome. Open an issue or submit a pull request.

---

*May this app be a source of barakah for every Muslim who uses it. 🤲*
