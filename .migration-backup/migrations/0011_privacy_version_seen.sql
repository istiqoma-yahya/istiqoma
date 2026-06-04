-- Privacy policy version tracking (Task #221)
-- Stores the last policy version string the user acknowledged via the in-app banner.
-- NULL means the user has not yet acknowledged any version (banner will be shown).
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "privacy_version_seen" varchar;
