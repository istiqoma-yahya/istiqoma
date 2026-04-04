import pg from "pg";
import { readFileSync } from "fs";

const { Pool } = pg;

const DEST_URL = process.env.SUPABASE_DATABASE_URL;
if (!DEST_URL) {
  console.error("ERROR: SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

const destPool = new Pool({
  connectionString: DEST_URL,
  ssl: { rejectUnauthorized: false },
});

const prodData = JSON.parse(readFileSync("/tmp/prod_data.json", "utf-8"));

async function clearTable(tableName: string) {
  await destPool.query(`DELETE FROM ${tableName}`);
  console.log(`  Cleared: ${tableName}`);
}

async function insertRows(tableName: string, rows: any[]) {
  if (rows.length === 0) {
    console.log(`  ${tableName}: 0 rows (skipped)`);
    return;
  }

  const cols = Object.keys(rows[0]);
  const BATCH_SIZE = 100;

  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(
      (_, rowIdx) =>
        `(${cols.map((_, colIdx) => `$${rowIdx * cols.length + colIdx + 1}`).join(", ")})`
    );
    const values = batch.flatMap((row) => cols.map((col) => row[col]));

    await destPool.query(
      `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders.join(", ")} ON CONFLICT DO NOTHING`,
      values
    );
    total += batch.length;
  }

  console.log(`  ${tableName}: ${total} rows inserted`);
}

async function resetSequence(tableName: string, colName = "id") {
  try {
    await destPool.query(`
      SELECT setval(
        pg_get_serial_sequence('${tableName}', '${colName}'),
        COALESCE((SELECT MAX(${colName}) FROM ${tableName}), 0) + 1,
        false
      )
    `);
  } catch {
    // Table might not have a serial sequence
  }
}

async function main() {
  console.log("=== Migrating PRODUCTION data to Supabase ===\n");

  // Step 1: Clear existing (wrong dev) data in reverse FK order
  console.log("Step 1: Clearing wrong dev data from Supabase...");
  const clearOrder = ["target_history", "push_subscriptions", "targets", "deeds", "categories", "sessions", "users"];
  for (const t of clearOrder) {
    await clearTable(t);
  }

  // Step 2: Insert production data in FK-safe order
  console.log("\nStep 2: Inserting production data...");
  const insertOrder = ["users", "sessions", "categories", "deeds", "targets", "target_history", "push_subscriptions"];
  for (const t of insertOrder) {
    await insertRows(t, prodData[t] || []);
  }

  // Step 3: Reset sequences
  console.log("\nStep 3: Resetting ID sequences...");
  for (const t of ["categories", "deeds", "targets", "target_history", "push_subscriptions"]) {
    await resetSequence(t);
    console.log(`  ${t}: sequence reset`);
  }

  // Step 4: Verify counts
  console.log("\nStep 4: Verifying row counts...");
  let allMatch = true;
  for (const t of insertOrder) {
    const { rows } = await destPool.query(`SELECT COUNT(*) FROM ${t}`);
    const expected = (prodData[t] || []).length;
    const actual = parseInt(rows[0].count);
    const match = expected === actual;
    if (!match) allMatch = false;
    console.log(`  ${t}: expected=${expected} actual=${actual} ${match ? "✓" : "✗ MISMATCH"}`);
  }

  if (allMatch) {
    console.log("\n✅ Production data migration complete — all counts match!");
  } else {
    console.log("\n❌ Row count mismatch detected!");
    process.exit(1);
  }

  await destPool.end();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
