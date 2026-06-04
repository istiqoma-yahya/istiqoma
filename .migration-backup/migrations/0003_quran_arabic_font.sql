-- Quran Arabic font preference (Task #110)
-- Adds a per-user choice of Arabic font style for the Quran reader.
-- Default "uthmani" (Amiri) so existing users keep the current rendering.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "quran_reading_state"
  ADD COLUMN IF NOT EXISTS "arabic_font" text NOT NULL DEFAULT 'uthmani';
