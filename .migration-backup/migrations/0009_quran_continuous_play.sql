-- Quran continuous play preference (Task #150)
-- Lets users opt in to automatically advancing to the next surah when
-- the last ayah of the current surah finishes playing. Stops at surah 114.
-- Default false so existing users keep the current stop-at-surah-end behavior.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "quran_reading_state"
  ADD COLUMN IF NOT EXISTS "continuous_play" boolean NOT NULL DEFAULT false;
