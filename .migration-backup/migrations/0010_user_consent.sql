-- User consent columns for religious data + age gate (Task #220)
-- GDPR Article 9 requires explicit consent before storing sensitive (religious) data.
-- Default false so existing users are prompted on next login.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "consent_religious_data" boolean NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "consent_age_confirmed" boolean NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "consented_at" timestamp;
