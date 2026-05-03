-- Username + PIN sign-in (Task #98)
-- Independent namespace from `users.username` (the SSO display field).
-- Apply via `npm run db:push` (project convention) or psql.

CREATE TABLE IF NOT EXISTS "username_logins" (
  "user_id" varchar PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "username" varchar NOT NULL,
  "pin_hash" varchar NOT NULL,
  "pin_updated_at" timestamp NOT NULL DEFAULT now(),
  "failed_attempts" integer NOT NULL DEFAULT 0,
  "locked_until" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "username_logins_username_lower_unique"
  ON "username_logins" (lower("username"));
