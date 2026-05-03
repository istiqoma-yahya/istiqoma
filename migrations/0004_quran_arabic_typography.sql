-- Quran Arabic typography preferences (Task #111)
-- Lets users pick a verse font size (S/M/L/XL) and line-height
-- (compact/normal/relaxed/loose) on top of the existing arabic_font choice.
-- Defaults preserve current rendering for existing readers.
-- Apply via `npm run db:push` (project convention) or psql.

ALTER TABLE "quran_reading_state"
  ADD COLUMN IF NOT EXISTS "arabic_font_size" text NOT NULL DEFAULT 'md';

ALTER TABLE "quran_reading_state"
  ADD COLUMN IF NOT EXISTS "arabic_line_height" text NOT NULL DEFAULT 'normal';
