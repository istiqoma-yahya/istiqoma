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
- Pages in `client/src/pages/` for route components
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
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`drizzle.config.ts`)

Database tables:
- `users` - User accounts (managed by Replit Auth)
- `sessions` - Session storage for authentication
- `deeds` - User deed entries with description, category, points, and customUnit for custom categories (deedType defaults to "good")
- `targets` - User target/goal entries with customUnit support for custom categories. Note: `manualProgress` field exists but is no longer used; one-time target progress is calculated purely from matching deeds.
- `categories` - Custom user-defined categories

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

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Implementation**: Located in `server/replit_integrations/auth/`
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL
- **Protection**: `isAuthenticated` middleware for protected routes

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

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID` - Replit environment identifier