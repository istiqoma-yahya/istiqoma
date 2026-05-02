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

### Push Notifications & Reminders
- **Features**: Auto-prompt, daily reminders, Sholat reminders (using `adhan` library), target alerts.
- **Location**: User coordinates stored for prayer time calculation.
- **Scheduler**: 60-second polling for sending reminders.
- **Notification Sound**: User-configurable sound preference (chime, double, ding, none) synthesized via Web Audio API.

### Authentication
- **Provider**: Replit Auth (OpenID Connect).
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL.
- **Security**: `isAuthenticated` middleware for protected routes.

### Interactive Calendar (Target Detail Page)
The `ConsistencyCalendar` allows users to interact with dates to log or update deed progress for targets. It supports checkbox and increment modes, handles future date locking, and fetches real-time status. Period progress bars (weekly, monthly, one-time) visualize target progress. All client-side time calculations use `Asia/Jakarta` timezone for consistency.

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