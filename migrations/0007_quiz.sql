-- Islamic knowledge quiz (Task #116)
-- Question bank is seeded by developers; users progress through levels of
-- 10 multiple-choice questions, advancing only on a perfect score.
-- Progress is independent of deed points.
-- Apply via `npm run db:push` (project convention) or psql.

CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" serial PRIMARY KEY,
  "level" integer NOT NULL,
  "question_text" text NOT NULL,
  "options" text[] NOT NULL,
  "correct_index" integer NOT NULL,
  "explanation" text NOT NULL,
  "category" text
);

CREATE INDEX IF NOT EXISTS "quiz_questions_level_idx"
  ON "quiz_questions" ("level");

CREATE TABLE IF NOT EXISTS "user_quiz_progress" (
  "user_id" varchar PRIMARY KEY REFERENCES "users"("id"),
  "current_level" integer NOT NULL DEFAULT 1,
  "total_correct" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "level" integer NOT NULL,
  "question_ids" integer[] NOT NULL,
  "answers" integer[] NOT NULL DEFAULT '{}'::int[],
  "completed" boolean NOT NULL DEFAULT false,
  "all_correct" boolean NOT NULL DEFAULT false,
  "started_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_active_idx"
  ON "quiz_attempts" ("user_id", "completed");
