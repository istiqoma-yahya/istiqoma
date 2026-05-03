-- Quran memorization deed-points award ledger (Task #114)
-- Persistent ledger of which (user, surah, verse) tuples have already been
-- awarded deed points for memorization. Kept separate from
-- `quran_memorizations` (which gets deleted on unmark) so users cannot farm
-- points by toggling memorization on/off — once awarded, the row stays.
-- Apply via `npm run db:push` (project convention) or psql.

CREATE TABLE IF NOT EXISTS "quran_memorization_awards" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "surah_number" integer NOT NULL,
  "verse_number" integer NOT NULL,
  "deed_id" integer REFERENCES "deeds"("id") ON DELETE SET NULL,
  "awarded_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_quran_memorization_award_user_verse"
  ON "quran_memorization_awards" ("user_id", "surah_number", "verse_number");
