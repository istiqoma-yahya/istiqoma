import pg from "pg";

const { Pool } = pg;

const sourcePool = new Pool({ connectionString: process.env.DATABASE_URL });
const destPool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
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
  console.log("Starting migration from Replit DB → Supabase...\n");

  try {
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
      const [srcRes, dstRes] = await Promise.all([
        sourcePool.query(`SELECT COUNT(*) FROM ${t}`),
        destPool.query(`SELECT COUNT(*) FROM ${t}`),
      ]);
      const src = srcRes.rows[0].count;
      const dst = dstRes.rows[0].count;
      const match = src === dst ? "✓" : "✗ MISMATCH";
      if (src !== dst) allMatch = false;
      console.log(`  ${t}: source=${src} supabase=${dst} ${match}`);
    }

    console.log(allMatch ? "\n✅ Migration complete — all counts match!" : "\n❌ Row count mismatch detected!");
  } finally {
    await sourcePool.end();
    await destPool.end();
  }
}

main().catch((e) => { console.error("Migration failed:", e); process.exit(1); });
