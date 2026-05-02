# Istiqoma

## Overview

Istiqoma is a spiritual self-improvement application designed for Muslims to track their daily good deeds. Users can log deeds with descriptions, categories, and point values, then visualize their progress through statistics. The application features user authentication via Replit Auth, category management, and a modern dark-themed UI with emerald green accents inspired by Islamic art.

**Note**: The app exclusively tracks good deeds - all bad deed tracking functionality has been removed. The `deedType` field in the database defaults to "good" for backward compatibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with React plugin

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` for route components (including DeedHistoryPage at `/deeds` for browsing/filtering all deeds)
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/` for data fetching and business logic
- Shared types and API definitions imported from `@shared/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Style**: REST endpoints defined in `shared/routes.ts` with Zod validation
- **Session Management**: express-session with PostgreSQL store (connect-pg-simple)

The server handles:
- Authentication via Replit Auth integration
- CRUD operations for deeds, categories, and targets
- Streak calculation - consecutive days with deeds + weekly active days
- Push notification subscription and management
- Static file serving in production

### API Contract & Mobile Readiness
- **Typed API Contract**: `shared/routes.ts` defines every endpoint with HTTP method, path, Zod input/output schemas
- **API Documentation**: `API_REFERENCE.md` provides complete endpoint reference with examples for mobile/external clients
- All route handlers in `server/routes.ts` reference `api.*` from `shared/routes.ts` (single source of truth)
- The `shared/` directory (`schema.ts`, `routes.ts`, `models/auth.ts`) can be copied to a mobile project for type-safe API calls

### Data Storage
- **Database**: PostgreSQL hosted on **Supabase** (migrated from Replit DB to reduce costs)
- **Two separate Supabase projects** — DO NOT collapse these back into one:
  - **Production** uses `SUPABASE_DATABASE_URL` (currently `aws-1-ap-southeast-1` region). Read by the deployed app and by `drizzle-kit` when `NODE_ENV=production`.
  - **Development** uses `SUPABASE_DEV_DATABASE_URL` (separate Supabase project, currently `aws-1-ap-southeast-2`). Read by `npm run dev` and by `drizzle-kit` when `NODE_ENV` is anything other than `production`.
  - Both are Transaction mode pooler connections (port 6543, SSL enabled).
  - `server/db.ts` and `drizzle.config.ts` branch on `NODE_ENV` and **fail fast** in dev if `SUPABASE_DEV_DATABASE_URL` is missing — there is intentionally NO fallback to the prod URL, so dev work cannot accidentally pollute production. If the dev secret ever goes missing, set it before starting the workflow.
  - To provision a fresh dev DB: create a new Supabase project, copy its Transaction mode pooled URI (port 6543), and store it in the `SUPABASE_DEV_DATABASE_URL` secret. Then run `SUPABASE_DATABASE_URL=$SUPABASE_DEV_DATABASE_URL NODE_ENV=production npx drizzle-kit push --force` to create the schema (or just `npx drizzle-kit push --force` since dev defaults to the dev URL).
- **Sessions**: `server/replit_integrations/auth/replitAuth.ts` uses `DATABASE_URL` (Replit-managed Postgres) for the session store. This is intentionally per-environment — Replit scopes `DATABASE_URL` separately for dev and prod, so sessions stay isolated automatically.
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit (`drizzle.config.ts`)
  - To push schema changes in dev: `npx drizzle-kit push --force` (defaults to dev DB)
  - To push schema changes against prod: `NODE_ENV=production npx drizzle-kit push --force`

Database tables:
- `users` - User accounts (managed by Replit Auth)
- `sessions` - Session storage for authentication
- `deeds` - User deed entries with description, category, points, and customUnit for custom categories (deedType defaults to "good")
- `targets` - User target/goal entries with customUnit support for custom categories. Note: `manualProgress` field exists but is no longer used; one-time target progress is calculated purely from matching deeds.
- `categories` - Custom user-defined categories
- `push_subscriptions` - Push notification subscriptions with settings (dailyReminder, reminderTime, targetAlerts, sholatReminder, latitude, longitude, timezone)
- `prayer_completions` - Daily 5-prayer completion log keyed by `(user_id, date)` where `date` is `YYYY-MM-DD` (user's local day). Five booleans (fajr/dhuhr/asr/maghrib/isha) are upserted via REST endpoints under `/api/prayer-completions/:date`. The Sholat page reads/writes via react-query with optimistic updates and mirrors values to localStorage as an offline cache; legacy `sholat_done_<date>` localStorage values are migrated into the database on first load.

### Custom Unit System
When users create deeds or targets with custom (non-built-in) categories, they can select a unit type from 8 options:
- hitungan (Kali) - Count-based
- ayat - Quran verses
- halaman - Pages
- surat - Surahs/chapters
- juz - Juz (30-part Quran divisions)
- rakaat - Prayer units
- hari - Days
- uang (Jumlah) - Money amount

Built-in categories (Dzikir, Sholat, Puasa, Baca Quran, Shodaqoh) have their own specialized type selectors and don't show the generic unit dropdown.

### Automatic Point Calculation
Points are calculated automatically by the backend based on category and quantity. The calculation logic is in `server/calculatePoints.ts`:

**Flat points per session (ignores quantity):**
- Dzikir = 10 points
- Shodaqoh/Sedekah = 100 points
- Custom categories = 50 points

**Points multiplied by quantity:**
- Sholat Fardhu = 100 × quantity (+50 if jamaah)
- Sholat Sunnah = 50 × quantity (+50 if jamaah)
- Puasa (Fardhu types: ramadhan, qadha, kaffarah, nadzar) = 500 × quantity
- Puasa (Sunnah types: seninkamis, ayyamulbidh, arafah, asyura, syawal, daud) = 250 × quantity
- Baca Quran:
  - Ayat = 1 × quantity
  - Halaman = 10 × quantity
  - Juz = 200 × quantity
  - Surat = 200 × quantity

### Push Notifications & Reminders
- **Auto-prompt**: After login, users who haven't subscribed see a notification prompt banner (dismissible for 7 days)
- **Daily Reminder**: Default at 21:00 (night) in user's timezone, configurable
- **Sholat Reminders**: Sends notification 10 minutes before each prayer time (Subuh, Dzuhur, Ashar, Maghrib, Isya) using the `adhan` library for calculation
- **Location**: User coordinates (lat/lng) stored in `push_subscriptions` for prayer time calculation, collected during notification opt-in
- **Scheduler**: 60-second polling interval in `server/index.ts` runs `sendDailyReminders()`, `sendTargetReminders()`, and `sendSholatReminders()`
- **Key files**: `server/sholatReminders.ts`, `server/pushNotifications.ts`, `client/src/components/NotificationPrompt.tsx`, `client/src/components/NotificationSettings.tsx`

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Implementation**: Located in `server/replit_integrations/auth/`
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL
- **Protection**: `isAuthenticated` middleware for protected routes

## Notification Sound Feature
Push notifications include a user-configurable sound preference:
- 4 options: `chime` (default), `double` (double chime), `ding` (soft ding), `none`
- Sounds synthesized via Web Audio API — no audio files required
- When app is open: service worker posts `PLAY_NOTIFICATION_SOUND` message to all open windows; App.tsx listener plays the sound
- When app is closed: OS default system sound plays (browser behavior)
- Preference stored in `pushSubscriptions.notificationSound` column
- UI: 4-tile picker in NotificationSettings with live preview buttons
- All server-side push payloads include `sound` field from user's saved preference

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect authentication provider using Replit's identity service
- **PostgreSQL Database**: Provisioned through Replit, connection via `DATABASE_URL` environment variable

### Key NPM Packages
- **Database**: `drizzle-orm`, `pg`, `connect-pg-simple`
- **Validation**: `zod`, `drizzle-zod`, `@hookform/resolvers`
- **UI**: `@radix-ui/*` components, `tailwindcss`, `framer-motion`, `lucide-react`
- **Data Fetching**: `@tanstack/react-query`
- **Auth**: `passport`, `openid-client`, `express-session`

### Interactive Calendar (Target Detail Page)
The `ConsistencyCalendar` in `TargetDetailPage.tsx` supports two interaction modes:
- **Checkbox mode** (targetValue=1): Tap past/today dates to toggle completion (creates/deletes deed)
- **Increment mode** (targetValue>1): Tap opens `CalendarDateProgressDialog` with +/- controls and circular progress rings
- Future dates are locked (non-interactive)
- Today's status is fetched in real-time via `GET /api/targets/:id/deeds-for-date?date=YYYY-MM-DD` (history excludes current day)
- Backend `getDeedsForTargetOnDate` in `server/storage.ts` matches deeds using the same predicates as target progress (including `isJamaah`)
- **Period progress bars** (`PeriodProgressBars` component):
  - Weekly targets: per-week progress bars (4-5 rows per month)
  - Monthly targets: single monthly progress bar
  - One-time targets: overall progress bar using `currentValue/targetValue`
  - Daily targets: no period bars (use circular rings per cell instead)
- **Current period aggregation**: Weekly/monthly targets use `target.currentValue` for the current period's progress (since history excludes the current period); past periods use history data (both `currentValue` and history use `deed.quantity` for consistency)
- **Timezone consistency**: All client-side time calculations use `Asia/Jakarta` timezone via `toZonedTime` from `date-fns-tz`, matching the server's `DEFAULT_TIMEZONE` — this includes week/month boundaries, today detection, and date interactivity checks
- **Consistent date coloring** across ALL target types:
  - Completed: `bg-emerald-500` (green) — uniform for checkbox and increment modes
  - Partial: `bg-amber-100` (amber)
  - Missed/no progress: transparent (no tint — color only for completed/partial)
  - Future: transparent/dimmed
- One-time targets: dates within `startDate`–`dueDate` range show progress; dates outside are dimmed/non-interactive

### Streak Freezer (Task #65)
- Tables: `streak_freezes` (uniqueIndex on user_id + frozen_date), `point_purchases` (append-only ledger), `user_streak_state` (per-user `floor_date` boundary that prevents retroactive streak revival).
- Balances are computed from ledgers (no counter columns) — points available = SUM(deeds.points) − SUM(point_purchases.points_cost); freezers available = SUM(point_purchases.freezers_granted) − COUNT(streak_freezes).
- Packs (`STREAK_FREEZER_PACKS` in `shared/schema.ts`): 1=500, 10=4500 (10% off), 25=10000 (20% off), 50=18750 (25% off), 100=35000 (30% off).
- **Concurrency**: both `purchaseStreakFreezers` and `consumeFreezerForDate` open a transaction and call `pg_advisory_xact_lock(hashtextextended('streak-freezer:'||userId, 0))` BEFORE the read-then-insert. This serializes all freezer point ops per user so rapid double-clicks cannot double-spend and concurrent walks cannot consume more freezers than owned. Inserts on `streak_freezes` are still 23505-tolerant for defense-in-depth.
- **No-retroactive-repair (`user_streak_state.floor_date`)**: `GET /api/streak` first reads the user's floor; if null, runs a one-time *migration walk* (no consume) that finds the most recent natural break in deed history and persists it as the floor. The real walk then refuses to look at any date `<= floor`. When the real walk runs out of freezers on a past gap it sets `floor = gap_date` and breaks. Net effect: once a streak is broken, buying more freezers later cannot bring it back from the dead.
- `GET /api/streak` walks back from today; today is never auto-frozen, but past gaps strictly above the floor consume one freezer each. Returns `{streakCount, weekDays, hasActivityToday, frozenDays}`.
- `GET /api/streak-freezer` returns balances + frozenDates + pack catalog. `POST /api/streak-freezer/purchase` body `{packSize}` returns 402 with `code: "INSUFFICIENT_POINTS"` on insufficient funds.
- Frontend: `/streak-freezer` page (`StreakFreezerPage.tsx`) with `text-freezer-balance` / `text-points-balance` testids and per-pack `text-pack-shortfall-N` "Need N more points" affordability copy; freezer chip on dashboard streak card (links to page); frozen-day rendering (sky-blue Snowflake) in `StreakDialog`. i18n keys under `streakFreezer.*` for en/id/ms include i18next `_one`/`_other` plurals for `needMorePoints`.

### Environment Variables Required
- `SUPABASE_DATABASE_URL` - Production Supabase connection string (used when `NODE_ENV=production`)
- `SUPABASE_DEV_DATABASE_URL` - Development Supabase connection string (used otherwise; keep this on a separate Supabase project)
- `DATABASE_URL` - Replit-managed Postgres connection string, used only by `replitAuth.ts` for the session store (per-environment, scoped automatically by Replit)
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier