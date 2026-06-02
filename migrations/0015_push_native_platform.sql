-- Extend push_subscriptions to support native (APNs / FCM) tokens alongside
-- existing VAPID Web Push rows.
--
-- Changes:
--   • platform  — "web" | "ios" | "android", default "web" so all existing rows
--                 become web rows with no data migration.
--   • device_token — APNs device token or FCM registration ID (native rows only).
--   • endpoint / p256dh / auth are now nullable because native rows do not use
--     VAPID keys.
--   • Unique constraint (user_id, platform) replaces the implicit one-row-per-user
--     assumption; a user can now have up to three independent subscriptions.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS platform     text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS device_token text;

ALTER TABLE push_subscriptions
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN p256dh   DROP NOT NULL,
  ALTER COLUMN auth     DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_push_sub_user_platform
  ON push_subscriptions (user_id, platform);
