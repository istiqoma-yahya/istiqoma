-- Add composite indexes on the deeds table for fast per-user time-windowed
-- and category-filtered queries. These eliminate the full sequential scans
-- that were causing the target detail page to take 20+ seconds.
--
-- deeds_user_created_at_idx: speeds up all time-windowed deed fetches
--   (e.g. history window scans, period-scoped queries).
-- deeds_user_category_idx: speeds up category-filtered lifetime-total queries.

CREATE INDEX IF NOT EXISTS "deeds_user_created_at_idx" ON "deeds" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "deeds_user_category_idx" ON "deeds" ("user_id", "category");
