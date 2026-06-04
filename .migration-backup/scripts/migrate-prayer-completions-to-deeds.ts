/**
 * One-shot migration: convert rows from the legacy `prayer_completions`
 * table into Sholat Fardhu deeds in the `deeds` table.
 *
 * Idempotent — safe to run multiple times. Skips creating a deed when a
 * matching Sholat Fardhu deed (same user / day / sholatType) already exists.
 *
 * Uses raw SQL throughout so it keeps working after the `prayer_completions`
 * table is dropped from the Drizzle schema (and from the database itself
 * after `db:push --force`).
 */
import pg from "pg";

const { Pool } = pg;

type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
type SholatType = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

const PRAYER_TO_SHOLAT: Record<PrayerKey, SholatType> = {
  fajr: "subuh",
  dhuhr: "dzuhur",
  asr: "ashar",
  maghrib: "maghrib",
  isha: "isya",
};

const SHOLAT_LABEL: Record<SholatType, string> = {
  subuh: "Sholat Subuh",
  dzuhur: "Sholat Dzuhur",
  ashar: "Sholat Ashar",
  maghrib: "Sholat Maghrib",
  isya: "Sholat Isya",
};

const SHOLAT_FARDHU_POINTS = 100;

interface PrayerRow {
  user_id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export async function migratePrayerCompletionsToDeeds(pool: pg.Pool): Promise<{
  scanned: number;
  inserted: number;
  skipped: number;
  tableMissing: boolean;
}> {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'prayer_completions'
       ) AS exists`,
    );
    if (!tableCheck.rows[0]?.exists) {
      return { scanned: 0, inserted: 0, skipped: 0, tableMissing: true };
    }

    const { rows } = await client.query<PrayerRow>(
      `SELECT user_id, date, fajr, dhuhr, asr, maghrib, isha FROM prayer_completions`,
    );

    // Resolve a representative timezone per user. The legacy `prayer_completions`
    // stored the user's *local* calendar date, so to dedupe correctly against
    // existing deeds we need to compare on the same local-day basis.
    // `push_subscriptions` carries the user's timezone (default Asia/Jakarta)
    // — we pick any one row per user. If the user has no push subscription
    // we fall back to Asia/Jakarta (the schema default and the app's primary
    // audience).
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const tzByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const tzRes = await client.query<{ user_id: string; timezone: string }>(
        `SELECT DISTINCT ON (user_id) user_id, timezone
           FROM push_subscriptions
          WHERE user_id = ANY($1::varchar[])
          ORDER BY user_id, id ASC`,
        [userIds],
      );
      for (const r of tzRes.rows) tzByUser.set(r.user_id, r.timezone);
    }
    const DEFAULT_TZ = "Asia/Jakarta";

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const userTz = tzByUser.get(row.user_id) ?? DEFAULT_TZ;

      for (const key of Object.keys(PRAYER_TO_SHOLAT) as PrayerKey[]) {
        if (!row[key]) continue;
        const sholatType = PRAYER_TO_SHOLAT[key];

        // Per-user-local-day matching: convert each candidate deed's UTC
        // `created_at` into the user's timezone and compare its local date
        // against `row.date`. This is the same semantics the client uses to
        // bucket sholat deeds by day, so an existing same-local-day deed is
        // skipped exactly when it should be — and adjacent-day deeds for
        // the same prayer are NOT mistakenly matched.
        const existing = await client.query<{ id: number }>(
          `SELECT id FROM deeds
             WHERE user_id = $1
               AND category = 'Sholat Fardhu'
               AND sholat_type = $2
               AND ((created_at AT TIME ZONE $3)::date) = $4::date
             LIMIT 1`,
          [row.user_id, sholatType, userTz, row.date],
        );
        if (existing.rowCount && existing.rowCount > 0) {
          skipped++;
          continue;
        }

        // Anchor the migrated deed at noon in the user's local timezone so
        // its `(created_at AT TIME ZONE userTz)::date` lands exactly on
        // `row.date` — keeping the migrated deed's bucketing consistent with
        // the dedupe check above and with how the client groups deeds.
        const noonLocal = `${row.date} 12:00:00`;
        await client.query(
          `INSERT INTO deeds
             (user_id, description, deed_type, category, points, quantity,
              sholat_type, custom_unit, created_at)
           VALUES ($1, $2, 'good', 'Sholat Fardhu', $3, 1, $4, 'times',
                   ($5::timestamp AT TIME ZONE $6))`,
          [
            row.user_id,
            SHOLAT_LABEL[sholatType],
            SHOLAT_FARDHU_POINTS,
            sholatType,
            noonLocal,
            userTz,
          ],
        );
        inserted++;
      }
    }

    return {
      scanned: rows.length,
      inserted,
      skipped,
      tableMissing: false,
    };
  } finally {
    client.release();
  }
}

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const connectionString = isProduction
    ? process.env.SUPABASE_DATABASE_URL
    : process.env.SUPABASE_DEV_DATABASE_URL;

  if (!connectionString) {
    console.error(
      `[migrate-prayer-completions] Missing ${
        isProduction ? "SUPABASE_DATABASE_URL" : "SUPABASE_DEV_DATABASE_URL"
      }; skipping.`,
    );
    process.exit(0);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await migratePrayerCompletionsToDeeds(pool);
    if (result.tableMissing) {
      console.log(
        "[migrate-prayer-completions] prayer_completions table is gone — nothing to migrate.",
      );
    } else {
      console.log(
        `[migrate-prayer-completions] Done. Scanned ${result.scanned} row(s); inserted ${result.inserted} deed(s); skipped ${result.skipped} already-present deed(s).`,
      );
    }
  } catch (err) {
    console.error("[migrate-prayer-completions] Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("migrate-prayer-completions-to-deeds.ts");
if (isMain) {
  main();
}
