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
- CRUD operations for deeds and categories
- Static file serving in production

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema migrations (`drizzle.config.ts`)

Database tables:
- `users` - User accounts (managed by Replit Auth)
- `sessions` - Session storage for authentication
- `deeds` - User deed entries with description, category, points, and customUnit for custom categories (deedType defaults to "good")
- `targets` - User target/goal entries with customUnit support for custom categories
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