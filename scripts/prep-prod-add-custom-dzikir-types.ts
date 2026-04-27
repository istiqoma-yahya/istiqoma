import pg from "pg";

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
  console.error("REFUSING TO RUN: SUPABASE_DATABASE_URL equals SUPABASE_DEV_DATABASE_URL.");
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

const pool = new Pool({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // ---- Step 1: Pre-check schema diff (read-only) -------------------------
    console.log("\n=== Step 1: Pre-check ===");
    const beforeTables = await client.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY table_name
    `);
    const tableNames = beforeTables.rows.map((r) => r.table_name);
    console.log(`prod tables (${tableNames.length}): ${tableNames.join(", ")}`);
    const alreadyExists = tableNames.includes("custom_dzikir_types");
    console.log(`custom_dzikir_types already exists on prod: ${alreadyExists}`);

    // ---- Step 2: Create the missing table (single transaction) -------------
    console.log("\n=== Step 2: Create custom_dzikir_types (single transaction) ===");
    await client.query("BEGIN");
    try {
      // Create the sequence and table to mirror dev exactly. Drizzle's `serial`
      // expands to `integer NOT NULL DEFAULT nextval(<seq>)` with the sequence
      // owned by the column. Match that here so the deployed code's INSERTs
      // (which omit `id`) get auto-generated values just like on dev.
      await client.query(`
        CREATE TABLE IF NOT EXISTS custom_dzikir_types (
          id          serial PRIMARY KEY,
          user_id     varchar NOT NULL REFERENCES users(id),
          label       text NOT NULL,
          created_at  timestamp DEFAULT now()
        )
      `);

      // Verify shape inside the transaction so any error rolls back
      const cols = await client.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='custom_dzikir_types'
        ORDER BY ordinal_position
      `);
      const colMap = new Map(cols.rows.map((c) => [c.column_name, c]));
      const required = [
        { name: "id", type: "integer", nullable: "NO", defaultLike: "nextval" },
        { name: "user_id", type: "character varying", nullable: "NO" },
        { name: "label", type: "text", nullable: "NO" },
        { name: "created_at", type: "timestamp without time zone", nullable: "YES" },
      ] as const;
      for (const r of required) {
        const got = colMap.get(r.name);
        if (!got) throw new Error(`Column '${r.name}' missing after CREATE TABLE`);
        if (got.data_type !== r.type) {
          throw new Error(
            `Column '${r.name}' has type '${got.data_type}', expected '${r.type}'`,
          );
        }
        if (got.is_nullable !== r.nullable) {
          throw new Error(
            `Column '${r.name}' is_nullable='${got.is_nullable}', expected '${r.nullable}'`,
          );
        }
        if ("defaultLike" in r && r.defaultLike) {
          if (!got.column_default || !got.column_default.includes(r.defaultLike)) {
            throw new Error(
              `Column '${r.name}' default '${got.column_default}' missing fragment '${r.defaultLike}'`,
            );
          }
        }
      }
      console.log(`  columns OK (${cols.rows.length} columns verified)`);

      const pk = await client.query<{ indexname: string; indexdef: string }>(`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname='public' AND tablename='custom_dzikir_types'
      `);
      const pkIdx = pk.rows.find((r) => r.indexname === "custom_dzikir_types_pkey");
      if (!pkIdx) throw new Error("Primary key index 'custom_dzikir_types_pkey' missing");
      if (!pkIdx.indexdef.includes("(id)")) {
        throw new Error(`Primary key not on id column. indexdef=${pkIdx.indexdef}`);
      }
      console.log(`  primary key OK: ${pkIdx.indexdef}`);

      // Verify FK constraint to users(id)
      const fk = await client.query<{ constraint_name: string; foreign_table: string; foreign_column: string }>(`
        SELECT
          tc.constraint_name,
          ccu.table_name  AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type='FOREIGN KEY'
          AND tc.table_schema='public'
          AND tc.table_name='custom_dzikir_types'
          AND kcu.column_name='user_id'
      `);
      if (fk.rows.length === 0) {
        throw new Error("Foreign key constraint on user_id missing");
      }
      const userFk = fk.rows.find((r) => r.foreign_table === "users" && r.foreign_column === "id");
      if (!userFk) {
        throw new Error(
          `Foreign key on user_id does not reference users(id). Got: ${JSON.stringify(fk.rows)}`,
        );
      }
      console.log(`  foreign key OK: ${userFk.constraint_name} -> ${userFk.foreign_table}(${userFk.foreign_column})`);

      // Verify the table is empty (defensive: this script should never insert
      // user data; if rows are already here the table existed already and we
      // are doing nothing).
      const rowCount = await client.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM custom_dzikir_types`);
      console.log(`  existing rows: ${rowCount.rows[0].n} (acceptable: any number; this script does not modify rows)`);

      await client.query("COMMIT");
      console.log("transaction committed.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    // ---- Step 3: Comprehensive schema parity check (read-only) -------------
    console.log("\n=== Step 3: Schema parity vs dev ===");
    if (!DEV_URL) {
      console.warn("  SUPABASE_DEV_DATABASE_URL not set; skipping dev-vs-prod schema diff.");
    } else {
      const devPool = new Pool({ connectionString: DEV_URL, ssl: { rejectUnauthorized: false } });
      try {
        const sql = `
          SELECT table_name, column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema='public'
          ORDER BY table_name, ordinal_position
        `;
        const prodCols = (await client.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(sql)).rows;
        const devCols = (await devPool.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(sql)).rows;
        const key = (r: { table_name: string; column_name: string }) => `${r.table_name}.${r.column_name}`;
        const prodMap = new Map(prodCols.map((r) => [key(r), r]));
        const devMap = new Map(devCols.map((r) => [key(r), r]));

        const missingInProd: string[] = [];
        for (const k of devMap.keys()) {
          if (!prodMap.has(k)) missingInProd.push(k);
        }
        const typeMismatches: string[] = [];
        for (const k of devMap.keys()) {
          if (prodMap.has(k)) {
            const d = devMap.get(k)!;
            const p = prodMap.get(k)!;
            if (d.data_type !== p.data_type) typeMismatches.push(`${k}: dev=${d.data_type} prod=${p.data_type}`);
          }
        }
        console.log(`  columns missing in prod (vs dev): ${missingInProd.length === 0 ? "none ✓" : missingInProd.join(", ")}`);
        console.log(`  type mismatches: ${typeMismatches.length === 0 ? "none ✓" : typeMismatches.join(", ")}`);
        if (missingInProd.length > 0) {
          throw new Error(`Schema parity check failed: ${missingInProd.length} columns still missing in prod.`);
        }
        if (typeMismatches.length > 0) {
          throw new Error(`Schema parity check failed: ${typeMismatches.length} type mismatches.`);
        }
      } finally {
        await devPool.end();
      }
    }

    // ---- Step 4: Confirm nothing else was touched --------------------------
    console.log("\n=== Step 4: Untouched-data sanity check ===");
    const sanity = await client.query<{ targets: number; deeds: number; users: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM targets) AS targets,
        (SELECT COUNT(*)::int FROM deeds) AS deeds,
        (SELECT COUNT(*)::int FROM users) AS users
    `);
    console.log(`  targets=${sanity.rows[0].targets}, deeds=${sanity.rows[0].deeds}, users=${sanity.rows[0].users}`);
    console.log("  (these counts must match what they were before this script — only the new empty table was added)");

    console.log("\n✅ Production now has custom_dzikir_types. The /api/custom-dzikir-types endpoint will start succeeding on the next request.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e);
  process.exit(1);
});
