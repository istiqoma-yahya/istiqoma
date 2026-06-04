-- Quran auto-advance ayah preference (Task #145)
-- Lets users opt in to automatically playing the next ayah after the
-- current one finishes, without having to tap each verse individually.
-- Default false so existing users keep the current stop-after-one behavior.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "quran_reading_state"
  ADD COLUMN IF NOT EXISTS "auto_advance_ayah" boolean NOT NULL DEFAULT false;
