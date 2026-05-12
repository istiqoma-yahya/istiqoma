-- Quran Foundation per-user OAuth token storage (Task #248).
-- Stores access/refresh tokens issued by Quran Foundation's User API
-- (Authorization Code + PKCE flow) so we can mirror bookmarks to QF on
-- behalf of users who have connected their account.
CREATE TABLE IF NOT EXISTS "qf_user_tokens" (
  "user_id" varchar PRIMARY KEY REFERENCES "users"("id"),
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp NOT NULL,
  "scope" text,
  "qf_account_id" text,
  "connected_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
