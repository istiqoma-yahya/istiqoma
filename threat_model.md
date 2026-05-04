# Threat Model

## Project Overview

Istiqoma is a React + Express spiritual habit-tracking application for Muslims. Users authenticate with either Replit OIDC or a first-party username+PIN flow, then store personal activity history, targets, Qur'an bookmarks/memorization progress, quiz progress, and push-notification preferences in PostgreSQL. Production traffic is served by the Express app in `server/index.ts` and `server/routes.ts`; browser clients are untrusted.

Production-scope assumptions for this repo:
- `NODE_ENV === "production"` in deployed environments.
- Replit-managed TLS protects client/server transport.
- Mockup/dev-only assets, Vite development helpers, local scripts, and unattached experimental files are out of scope unless explicitly wired into production request paths.

## Assets

- **User accounts and sessions** — OIDC-backed sessions, username+PIN logins, recovery codes, and session cookies. Compromise allows account takeover.
- **Personal activity data** — deeds, targets, streak/freezer history, onboarding answers, bookmarks, reading state, memorization progress, and quiz progress. This is private behavioral data.
- **Push subscription secrets and location data** — web-push endpoint/keys plus optional latitude/longitude and reminder schedule. Exposure enables targeted spam, device correlation, or location privacy loss.
- **Application secrets and service credentials** — database connection strings, VAPID keys, OIDC tokens, and API keys used by AI/audio integrations.
- **Admin-controlled content** — campaign banners and admin-only campaign management routes.

## Trust Boundaries

- **Browser to API** — all `/api/*` requests cross from untrusted clients into the Express server. Every protected route must enforce authn/authz server-side.
- **API to PostgreSQL** — the server has broad database access. Query scoping must prevent cross-user reads/writes.
- **API to external identity provider** — Replit OIDC token refresh and login/logout flows depend on external trust.
- **API to external AI/audio services** — voice parsing/transcription and recommendations send selected user-derived content to third-party APIs.
- **API to object storage** — banner uploads and object retrieval cross into Replit/GCS object storage with ACL enforcement.
- **Public vs authenticated vs admin** — most app data is authenticated-only; campaign reads are public; campaign management is admin-only.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, `server/replit_integrations/auth/*.ts`.
- **Highest-risk areas:** auth/session handling, username recovery flow, response logging in `server/index.ts`, push subscription routes, AI-backed endpoints, and admin campaign/object-storage routes.
- **Public surfaces:** `/api/login`, `/api/callback`, `/api/logout`, username auth endpoints, `/api/campaigns/active`, `/objects/:objectPath(*)`.
- **Authenticated surfaces:** nearly all user data routes in `server/routes.ts` and `server/replit_integrations/auth/routes.ts`.
- **Admin surfaces:** `/api/admin/campaigns*` guarded by `isAdmin` in `server/routes.ts`.
- **Usually dev-only / ignore unless proven reachable:** `scripts/`, `attached_assets/`, Vite/dev server helpers, tests.

## Threat Categories

### Spoofing

The application must ensure that only legitimate users can establish or continue sessions. Protected endpoints MUST require a valid server-side session, username+PIN flows MUST resist brute force and recovery abuse, and admin status MUST be enforced on the server rather than trusted from the client.

### Tampering

Clients can submit deeds, targets, reminders, profile updates, and campaign metadata. The server MUST validate request bodies, calculate sensitive values such as points on the server, and prevent users from mutating records, folders, or campaigns they do not own.

### Information Disclosure

The app stores sensitive behavioral and account-recovery data. API responses, logs, and error paths MUST NOT expose recovery codes, push subscription secrets, precise location data beyond the intended user, tokens, or other users’ private records. Public object routes MUST only serve objects intentionally marked public.

### Denial of Service

Public and authenticated endpoints that trigger expensive work — especially username auth, recovery, voice parsing/transcription, recommendations, push flows, and object handling — MUST apply reasonable validation and throttling so a single client cannot exhaust compute or third-party quotas.

### Elevation of Privilege

All user-specific queries MUST be scoped by authenticated user ID, and admin-only functionality MUST require a server-side admin check. Upload/object-storage flows, recovery flows, and any external-service integration MUST not allow a normal user to access admin content, private objects, or another user’s data.

## Scan Notes

- The leaderboard and quiz leaderboard are intentional authenticated social features in the current product. Do not treat cross-user ranking visibility by itself as a broken-access-control issue unless future changes expose hidden fields, add opt-out/privacy promises, or widen access beyond authenticated users.
- `server/replit_integrations/object_storage/routes.ts` is example wiring and was not found to be registered in the live production route setup. Focus object-storage review on the routes actually registered from `server/routes.ts`.
- The app installs a global `express.json()` parser in `server/index.ts`, so claims about oversized JSON request abuse need to account for that earlier parser and its default body-size behavior.