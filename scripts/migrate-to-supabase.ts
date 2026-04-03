/**
 * Data migration script: OLD Replit PostgreSQL → Supabase
 *
 * Source:      OLD_DATABASE_URL  (old Replit-managed PostgreSQL)
 * Destination: SUPABASE_DATABASE_URL (Supabase PostgreSQL, transaction pooler port 6543)
 *
 * SSL note: Supabase's pooler presents a self-signed certificate chain that is not
 * trusted by the Node.js default CA bundle in the Replit environment. Setting
 * rejectUnauthorized: false is required to establish the connection. The connection
 * is still encrypted in transit; only certificate-authority verification is skipped.
 *
 * Run: npx tsx scripts/migrate-to-supabase.ts
 */
import pg from "pg";

const { Pool } = pg;

const SOURCE_URL = process.env.OLD_DATABASE_URL;
const DEST_URL = process.env.SUPABASE_DATABASE_URL;

if (!SOURCE_URL) {
  console.error("ERROR: OLD_DATABASE_URL is not set. Aborting migration.");
  process.exit(1);
}
if (!DEST_URL) {
  console.error("ERROR: SUPABASE_DATABASE_URL is not set. Aborting migration.");
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: SOURCE_URL });
const destPool = new Pool({
  connectionString: DEST_URL,
  // Required: Supabase pooler uses a self-signed cert chain not trusted by the Replit CA bundle.
  ssl: { rejectUnauthorized: false },
});

async function migrateTable(tableName: string, orderBy = "id") {
  const { rows } = await sourcePool.query(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`);
  if (rows.length === 0) {
    console.log(`  ${tableName}: 0 rows (skipped)`);
    return 0;
  }

  const cols = Object.keys(rows[0]);
  const placeholders = rows.map(
    (_, rowIdx) => `(${cols.map((_, colIdx) => `$${rowIdx * cols.length + colIdx + 1}`).join(", ")})`
  );
  const values = rows.flatMap((row) => cols.map((col) => row[col]));

  await destPool.query(
    `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`,
    values
  );

  console.log(`  ${tableName}: ${rows.length} rows migrated`);
  return rows.length;
}

async function resetSequence(tableName: string, colName = "id") {
  await destPool.query(`
    SELECT setval(
      pg_get_serial_sequence('${tableName}', '${colName}'),
      COALESCE((SELECT MAX(${colName}) FROM ${tableName}), 0) + 1,
      false
    )
  `);
}

async function main() {
  console.log("Starting migration from OLD Replit DB → Supabase...\n");

  try {
    // Verify source is the old Replit DB (not Supabase) by checking the host
    const srcRes = await sourcePool.query("SELECT current_database(), inet_server_addr()");
    console.log("Source DB:", JSON.stringify(srcRes.rows[0]));
    const dstRes = await destPool.query("SELECT current_database(), version()");
    console.log("Destination DB:", JSON.stringify(dstRes.rows[0]));
    console.log();

    // Migrate in dependency order
    console.log("Migrating tables:");
    await migrateTable("users", "created_at");
    await migrateTable("sessions", "expire");
    await migrateTable("categories", "id");
    await migrateTable("deeds", "id");
    await migrateTable("targets", "id");
    await migrateTable("target_history", "id");
    await migrateTable("push_subscriptions", "id");

    // Reset sequences so new inserts get correct IDs
    console.log("\nResetting ID sequences:");
    for (const t of ["categories", "deeds", "targets", "target_history", "push_subscriptions"]) {
      await resetSequence(t);
      console.log(`  ${t}: sequence reset`);
    }

    // Verify row counts match
    console.log("\nVerifying row counts:");
    const tables = ["users", "sessions", "categories", "deeds", "targets", "target_history", "push_subscriptions"];
    let allMatch = true;
    for (const t of tables) {
      const [srcCount, dstCount] = await Promise.all([
        sourcePool.query(`SELECT COUNT(*) FROM ${t}`),
        destPool.query(`SELECT COUNT(*) FROM ${t}`),
      ]);
      const src = srcCount.rows[0].count;
      const dst = dstCount.rows[0].count;
      const match = src === dst;
      if (!match) allMatch = false;
      console.log(`  ${t}: source=${src} supabase=${dst} ${match ? "✓" : "✗ MISMATCH"}`);
    }

    if (allMatch) {
      console.log("\n✅ Migration complete — all counts match!");
    } else {
      console.log("\n❌ Row count mismatch detected!");
      process.exit(1);
    }
  } finally {
    await sourcePool.end();
    await destPool.end();
  }
}

main().catch((e) => { console.error("Migration failed:", e); process.exit(1); });
