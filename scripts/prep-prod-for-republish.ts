import pg from "pg";
import { writeFileSync } from "fs";

const { Pool } = pg;

if (process.env.ALLOW_PROD_DB_PREP !== "1") {
  console.error(
    "REFUSING TO RUN: this script writes to PRODUCTION (SUPABASE_DATABASE_URL). " +
      "Re-run with ALLOW_PROD_DB_PREP=1 to confirm.",
  );
  process.exit(1);
}

const PROD_URL = process.env.SUPABASE_DATABASE_URL;
const DEV_URL = process.env.SUPABASE_DEV_DATABASE_URL;

if (!PROD_URL) {
  console.error("ERROR: SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

if (DEV_URL && PROD_URL === DEV_URL) {
  console.error("REFUSING TO RUN: SUPABASE_DATABASE_URL equals SUPABASE_DEV_DATABASE_URL. They must be distinct.");
  process.exit(1);
}

const prodHost = (() => {
  try {
    return new URL(PROD_URL.replace(/^postgres(ql)?:\/\//, "http://")).host.replace(/.*@/, "");
  } catch {
    return "(unparseable)";
  }
})();
console.log(`Connecting to PROD host: ${prodHost}`);

const pool = new Pool({
  connectionString: PROD_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    // ---- Step 1: Read-only snapshot (outside transaction) -------------------
    console.log("\n=== Step 1: Snapshot (read-only) ===");
    const beforeRows = await client.query<{ user_id: string; n: number }>(`
      SELECT user_id, COUNT(*)::int AS n FROM deeds
      WHERE category='Sholat Fardhu' AND sholat_type IS NOT NULL AND sholat_type<>''
      GROUP BY user_id ORDER BY n DESC
    `);
    const totalBefore = beforeRows.rows.reduce((s, r) => s + r.n, 0);
    console.log(`distinct users with prayer rows: ${beforeRows.rows.length}`);
    console.log(`total Sholat Fardhu rows: ${totalBefore}`);

    const dupGroupsBefore = await client.query<{ groups: number; extra_rows: number }>(`
      WITH dups AS (
        SELECT user_id, sholat_type,
               ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date AS local_d,
               COUNT(*)::int AS c
        FROM deeds
        WHERE category='Sholat Fardhu' AND sholat_type IS NOT NULL AND sholat_type<>''
        GROUP BY 1,2,3
        HAVING COUNT(*) > 1
      )
      SELECT COUNT(*)::int AS groups, COALESCE(SUM(c-1),0)::int AS extra_rows FROM dups
    `);
    const expectedExtras = dupGroupsBefore.rows[0].extra_rows;
    console.log(`duplicate groups: ${dupGroupsBefore.rows[0].groups}, extra rows to delete: ${expectedExtras}`);

    writeFileSync(
      "/tmp/prod_prayer_snapshot_before.json",
      JSON.stringify(
        {
          host: prodHost,
          totalBefore,
          users: beforeRows.rows,
          duplicates: dupGroupsBefore.rows[0],
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log("snapshot written to /tmp/prod_prayer_snapshot_before.json");

    // ---- Steps 2-5: All writes in ONE transaction ---------------------------
    // ALTER TABLE ADD COLUMN, UPDATE, DELETE, and CREATE UNIQUE INDEX (without
    // CONCURRENTLY) are all DDL/DML statements that Postgres permits inside a
    // transaction. Wrapping them together guarantees atomicity: either the
    // production database moves all the way to the republish-ready state, or
    // it stays exactly where it started. No half-prepared state is possible.
    console.log("\n=== Steps 2-5: All writes (single transaction) ===");
    await client.query("BEGIN");
    try {
      // Step 2: add column
      await client.query(`ALTER TABLE deeds ADD COLUMN IF NOT EXISTS local_date date`);
      const colCheck = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='deeds' AND column_name='local_date'
      `);
      if (colCheck.rows.length === 0) throw new Error("local_date column missing after ALTER");
      console.log(`  step 2: column present (${colCheck.rows[0].data_type})`);

      // Step 3: backfill
      const backfill = await client.query(`
        UPDATE deeds
        SET local_date = ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date
        WHERE category='Sholat Fardhu'
          AND sholat_type IS NOT NULL
          AND sholat_type<>''
          AND local_date IS NULL
      `);
      console.log(`  step 3: backfilled ${backfill.rowCount} rows`);

      // Step 4: dedupe
      const dedupe = await client.query(`
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY user_id, sholat_type, local_date
                   ORDER BY id ASC
                 ) AS rn
          FROM deeds
          WHERE category='Sholat Fardhu'
            AND sholat_type IS NOT NULL
            AND sholat_type<>''
            AND local_date IS NOT NULL
        )
        DELETE FROM deeds
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      `);
      console.log(`  step 4: deleted ${dedupe.rowCount} duplicate rows (expected ${expectedExtras})`);
      if ((dedupe.rowCount ?? -1) !== expectedExtras) {
        throw new Error(
          `Safety abort: expected to delete ${expectedExtras} duplicates but DELETE removed ${dedupe.rowCount}. Rolling back.`,
        );
      }

      const dupGroupsAfter = await client.query<{ groups: number }>(`
        WITH dups AS (
          SELECT user_id, sholat_type, local_date, COUNT(*)::int AS c
          FROM deeds
          WHERE category='Sholat Fardhu' AND sholat_type IS NOT NULL AND sholat_type<>'' AND local_date IS NOT NULL
          GROUP BY 1,2,3
          HAVING COUNT(*) > 1
        )
        SELECT COUNT(*)::int AS groups FROM dups
      `);
      if (dupGroupsAfter.rows[0].groups !== 0) {
        throw new Error(
          `Safety abort: ${dupGroupsAfter.rows[0].groups} duplicate groups remain after dedupe. Rolling back.`,
        );
      }
      console.log("  step 4: post-dedupe duplicate groups: 0 ✓");

      // Step 5: install unique index (without CONCURRENTLY so it can run in tx)
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uniq_sholat_deed_per_day
        ON deeds (user_id, sholat_type, local_date)
        WHERE category = 'Sholat Fardhu' AND local_date IS NOT NULL AND sholat_type IS NOT NULL
      `);
      const idxCheck = await client.query(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname='public' AND tablename='deeds' AND indexname='uniq_sholat_deed_per_day'
      `);
      if (idxCheck.rows.length === 0) throw new Error("uniq_sholat_deed_per_day index missing after CREATE");
      console.log(`  step 5: index present`);

      await client.query("COMMIT");
      console.log("transaction committed.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    // ---- Step 6: Verify final state (read-only, outside tx) -----------------
    console.log("\n=== Step 6: Verify ===");
    const totalAfter = await client.query<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM deeds
      WHERE category='Sholat Fardhu' AND sholat_type IS NOT NULL AND sholat_type<>''
    `);
    console.log(`Sholat Fardhu rows now: ${totalAfter.rows[0].n} (was ${totalBefore}, expected ${totalBefore - expectedExtras})`);

    const nullLocalDate = await client.query<{ n: number }>(`
      SELECT COUNT(*)::int AS n FROM deeds
      WHERE category='Sholat Fardhu' AND sholat_type IS NOT NULL AND sholat_type<>'' AND local_date IS NULL
    `);
    console.log(`rows with NULL local_date (should be 0): ${nullLocalDate.rows[0].n}`);

    const finalIdx = await client.query(`
      SELECT indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename='deeds' AND indexname='uniq_sholat_deed_per_day'
    `);
    console.log(`final index def: ${finalIdx.rows[0]?.indexdef ?? "MISSING"}`);

    const sampleUser = "55008017";
    const userAfter = await client.query<{ user_id: string; sholat_type: string; local_date: string; n: number }>(
      `
      SELECT user_id, sholat_type, local_date::text, COUNT(*)::int AS n
      FROM deeds
      WHERE user_id=$1 AND category='Sholat Fardhu' AND local_date IS NOT NULL
      GROUP BY 1,2,3
      ORDER BY local_date DESC, sholat_type
      LIMIT 10
      `,
      [sampleUser],
    );
    console.log(`\nspot-check user ${sampleUser} (recent prayer-day groups, should all be n=1):`);
    for (const r of userAfter.rows) console.log(`  ${r.local_date} ${r.sholat_type}: ${r.n}`);
    if (userAfter.rows.some((r) => r.n > 1)) {
      throw new Error(`spot-check user ${sampleUser} still has duplicates`);
    }

    console.log("\n✅ Production database is ready for republish.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e);
  process.exit(1);
});
