-- Quran memorization tracking (Task #112)
-- Per-user, per-verse memorized flag. Presence of a row means the verse
-- is marked memorized for that user. Unique on (user, surah, verse).
-- Apply via `npm run db:push` (project convention) or psql.

CREATE TABLE IF NOT EXISTS "quran_memorizations" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "surah_number" integer NOT NULL,
  "verse_number" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_quran_memorization_user_verse"
  ON "quran_memorizations" ("user_id", "surah_number", "verse_number");
