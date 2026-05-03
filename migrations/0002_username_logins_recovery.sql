-- Username + PIN recovery flow (Task #99)
-- Adds a one-time recovery code (scrypt-hashed) plus an independent lockout
-- counter for the recovery endpoint, so a PIN-signin lockout never blocks
-- legitimate recovery and vice versa.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "username_logins"
  ADD COLUMN IF NOT EXISTS "recovery_code_hash" varchar,
  ADD COLUMN IF NOT EXISTS "recovery_code_used_at" timestamp,
  ADD COLUMN IF NOT EXISTS "recovery_failed_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recovery_locked_until" timestamp;
