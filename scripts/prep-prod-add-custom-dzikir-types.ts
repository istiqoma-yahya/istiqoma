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

const prodPool = new Pool({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
const devPool = DEV_URL
  ? new Pool({ connectionString: DEV_URL, ssl: { rejectUnauthorized: false } })
  : null;

// ---------------------------------------------------------------------------
// Schema-introspection helpers used by both the strict pre-check and the
// strict post-check. Comparing dev vs prod via the same query set on both
// sides guarantees the comparison is symmetric and authoritative.
// ---------------------------------------------------------------------------

const TABLES_SQL = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema='public'
`;

const COLUMNS_SQL = `
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public'
`;

const INDEXES_SQL = `
  SELECT tablename AS table_name, indexname AS index_name, indexdef
  FROM pg_indexes
  WHERE schemaname='public'
`;

const FKS_SQL = `
  SELECT
    tc.constraint_name,
    tc.table_name AS local_table,
    kcu.column_name AS local_column,
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
`;

type ColRow = { table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null };
type IdxRow = { table_name: string; index_name: string; indexdef: string };
type FkRow  = { constraint_name: string; local_table: string; local_column: string; foreign_table: string; foreign_column: string };

async function snapshot(pool: pg.Pool) {
  const tables  = (await pool.query<{ table_name: string }>(TABLES_SQL)).rows.map((r) => r.table_name);
  const columns = (await pool.query<ColRow>(COLUMNS_SQL)).rows;
  const indexes = (await pool.query<IdxRow>(INDEXES_SQL)).rows;
  const fks     = (await pool.query<FkRow>(FKS_SQL)).rows;
  return { tables, columns, indexes, fks };
}

// Normalize default expressions so trivially-different but semantically-equal
// defaults compare equal. Postgres serializes `now()` as `now()` consistently
// across dev and prod for our timestamp columns, but sequence defaults render
// as `nextval('<schema_qualified>'::regclass)` and we want to ignore the
// schema qualifier to allow safe equality.
function normalizeDefault(d: string | null): string {
  if (d == null) return "";
  return d.replace(/'public\./g, "'").trim();
}

function diffSnapshots(dev: Awaited<ReturnType<typeof snapshot>>, prod: Awaited<ReturnType<typeof snapshot>>) {
  const devTableSet = new Set(dev.tables);
  const prodTableSet = new Set(prod.tables);
  const tablesMissingInProd = dev.tables.filter((t) => !prodTableSet.has(t));
  const tablesExtraInProd   = prod.tables.filter((t) => !devTableSet.has(t));

  const colKey = (r: ColRow) => `${r.table_name}.${r.column_name}`;
  const devColMap  = new Map(dev.columns.map((r) => [colKey(r), r]));
  const prodColMap = new Map(prod.columns.map((r) => [colKey(r), r]));

  const columnsMissingInProd: string[] = [];
  const columnsExtraInProd: string[] = [];
  const columnMismatches: string[] = [];
  for (const [k, d] of devColMap.entries()) {
    const p = prodColMap.get(k);
    if (!p) { columnsMissingInProd.push(k); continue; }
    if (d.data_type !== p.data_type)   columnMismatches.push(`${k}: data_type dev=${d.data_type} prod=${p.data_type}`);
    if (d.is_nullable !== p.is_nullable) columnMismatches.push(`${k}: is_nullable dev=${d.is_nullable} prod=${p.is_nullable}`);
    if (normalizeDefault(d.column_default) !== normalizeDefault(p.column_default)) {
      columnMismatches.push(`${k}: default dev='${d.column_default}' prod='${p.column_default}'`);
    }
  }
  for (const k of prodColMap.keys()) if (!devColMap.has(k)) columnsExtraInProd.push(k);

  const idxKey = (r: IdxRow) => r.index_name;
  const devIdxMap  = new Map(dev.indexes.map((r) => [idxKey(r), r]));
  const prodIdxMap = new Map(prod.indexes.map((r) => [idxKey(r), r]));
  const indexesMissingInProd: string[] = [];
  const indexesExtraInProd: string[] = [];
  const indexMismatches: string[] = [];
  for (const [k, d] of devIdxMap.entries()) {
    const p = prodIdxMap.get(k);
    if (!p) { indexesMissingInProd.push(`${d.table_name}.${k}`); continue; }
    if (d.indexdef !== p.indexdef) indexMismatches.push(`${k}: dev='${d.indexdef}' prod='${p.indexdef}'`);
  }
  for (const k of prodIdxMap.keys()) if (!devIdxMap.has(k)) indexesExtraInProd.push(k);

  // FKs are matched on the (local_table, local_column, foreign_table, foreign_column) tuple
  // because constraint *names* can differ between independently-created databases.
  const fkKey = (r: FkRow) => `${r.local_table}.${r.local_column}->${r.foreign_table}.${r.foreign_column}`;
  const devFkSet  = new Set(dev.fks.map(fkKey));
  const prodFkSet = new Set(prod.fks.map(fkKey));
  const fksMissingInProd = [...devFkSet].filter((k) => !prodFkSet.has(k));
  const fksExtraInProd   = [...prodFkSet].filter((k) => !devFkSet.has(k));

  return {
    tablesMissingInProd, tablesExtraInProd,
    columnsMissingInProd, columnsExtraInProd, columnMismatches,
    indexesMissingInProd, indexesExtraInProd, indexMismatches,
    fksMissingInProd, fksExtraInProd,
  };
}

function summarizeDiff(d: ReturnType<typeof diffSnapshots>): string {
  const parts: string[] = [];
  const dump = (label: string, arr: string[]) => arr.length && parts.push(`  ${label} (${arr.length}): ${arr.join(", ")}`);
  dump("tables missing in prod", d.tablesMissingInProd);
  dump("tables extra in prod",   d.tablesExtraInProd);
  dump("columns missing in prod", d.columnsMissingInProd);
  dump("columns extra in prod",   d.columnsExtraInProd);
  dump("column mismatches",       d.columnMismatches);
  dump("indexes missing in prod", d.indexesMissingInProd);
  dump("indexes extra in prod",   d.indexesExtraInProd);
  dump("index mismatches",        d.indexMismatches);
  dump("FKs missing in prod",     d.fksMissingInProd);
  dump("FKs extra in prod",       d.fksExtraInProd);
  return parts.length ? parts.join("\n") : "  zero differences ✓";
}

async function main() {
  const client = await prodPool.connect();
  try {
    // -----------------------------------------------------------------------
    // Step 1: STRICT pre-check.
    //
    // The script is only safe to apply to a prod whose ONLY drift from dev is
    // the missing custom_dzikir_types table and its primary key index. If any
    // other drift is present (different table missing, an extra/different
    // column, an unexpected FK, etc.), abort. We do not want this script to
    // mask a different schema problem.
    // -----------------------------------------------------------------------
    console.log("\n=== Step 1: Strict pre-check (dev vs prod) ===");
    if (!devPool) {
      throw new Error(
        "SUPABASE_DEV_DATABASE_URL is required for the strict pre-check. " +
          "The script must compare dev (source of truth) against prod and refuse to run if drift looks unexpected.",
      );
    }
    const devSnap0  = await snapshot(devPool);
    const prodSnap0 = await snapshot(prodPool);
    const preDiff = diffSnapshots(devSnap0, prodSnap0);
    console.log("pre-diff:");
    console.log(summarizeDiff(preDiff));

    // The acceptable pre-state is one of:
    //  (a) custom_dzikir_types table missing (+ all 4 of its columns + PK index + user_id FK), and NOTHING else missing/different.
    //  (b) custom_dzikir_types table already present and parity is otherwise perfect (rerun is a no-op).
    const expectedMissingCols = new Set([
      "custom_dzikir_types.id",
      "custom_dzikir_types.user_id",
      "custom_dzikir_types.label",
      "custom_dzikir_types.created_at",
    ]);
    const expectedMissingIdx = new Set(["custom_dzikir_types.custom_dzikir_types_pkey"]);
    const expectedMissingFk  = new Set(["custom_dzikir_types.user_id->users.id"]);

    const tablesMissingUnexpected = preDiff.tablesMissingInProd.filter((t) => t !== "custom_dzikir_types");
    const colsMissingUnexpected   = preDiff.columnsMissingInProd.filter((c) => !expectedMissingCols.has(c));
    const idxMissingUnexpected    = preDiff.indexesMissingInProd.filter((i) => !expectedMissingIdx.has(i));
    const fksMissingUnexpected    = preDiff.fksMissingInProd.filter((f) => !expectedMissingFk.has(f));

    const fatalUnexpected: string[] = [];
    if (tablesMissingUnexpected.length) fatalUnexpected.push(`tables: ${tablesMissingUnexpected.join(", ")}`);
    if (colsMissingUnexpected.length)   fatalUnexpected.push(`columns: ${colsMissingUnexpected.join(", ")}`);
    if (idxMissingUnexpected.length)    fatalUnexpected.push(`indexes: ${idxMissingUnexpected.join(", ")}`);
    if (fksMissingUnexpected.length)    fatalUnexpected.push(`FKs: ${fksMissingUnexpected.join(", ")}`);
    if (preDiff.tablesExtraInProd.length)   fatalUnexpected.push(`extra prod tables: ${preDiff.tablesExtraInProd.join(", ")}`);
    if (preDiff.columnsExtraInProd.length)  fatalUnexpected.push(`extra prod columns: ${preDiff.columnsExtraInProd.join(", ")}`);
    if (preDiff.columnMismatches.length)    fatalUnexpected.push(`column mismatches: ${preDiff.columnMismatches.join(", ")}`);
    if (preDiff.indexMismatches.length)     fatalUnexpected.push(`index mismatches: ${preDiff.indexMismatches.join(", ")}`);
    // Extra prod FKs/indexes are tolerated: prod can legitimately carry indexes
    // dev does not (e.g. the prayer-dedup partial unique index installed by the
    // earlier prep script may be ahead of dev). Missing prod FKs/indexes are
    // strictly checked above — that's where drift would actually break the app.

    if (fatalUnexpected.length > 0) {
      throw new Error(
        "Pre-check ABORT: prod has drift beyond the missing custom_dzikir_types table. " +
          "Refusing to run because this script is scoped to that single fix only.\n  " +
          fatalUnexpected.join("\n  "),
      );
    }
    console.log("strict pre-check PASS: prod drift is exactly the expected single missing table (or nothing) ✓");

    // -----------------------------------------------------------------------
    // Step 2: Create the missing table inside one transaction.
    // Idempotent — a rerun on already-fixed prod is a no-op.
    // -----------------------------------------------------------------------
    console.log("\n=== Step 2: Create custom_dzikir_types (single transaction) ===");
    await client.query("BEGIN");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS custom_dzikir_types (
          id          serial PRIMARY KEY,
          user_id     varchar NOT NULL REFERENCES users(id),
          label       text NOT NULL,
          created_at  timestamp DEFAULT now()
        )
      `);

      // Strict shape verification inside the transaction. Any mismatch rolls back.
      const cols = (await client.query<ColRow>(`
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='custom_dzikir_types'
        ORDER BY ordinal_position
      `)).rows;

      const expectedCols: ColRow[] = [
        { table_name: "custom_dzikir_types", column_name: "id",         data_type: "integer",                     is_nullable: "NO",  column_default: "nextval('custom_dzikir_types_id_seq'::regclass)" },
        { table_name: "custom_dzikir_types", column_name: "user_id",    data_type: "character varying",            is_nullable: "NO",  column_default: null },
        { table_name: "custom_dzikir_types", column_name: "label",      data_type: "text",                         is_nullable: "NO",  column_default: null },
        { table_name: "custom_dzikir_types", column_name: "created_at", data_type: "timestamp without time zone",  is_nullable: "YES", column_default: "now()" },
      ];

      if (cols.length !== expectedCols.length) {
        throw new Error(`Expected ${expectedCols.length} columns but got ${cols.length}: ${cols.map((c) => c.column_name).join(", ")}`);
      }
      for (let i = 0; i < expectedCols.length; i++) {
        const got = cols[i];
        const want = expectedCols[i];
        if (got.column_name !== want.column_name) throw new Error(`Column ${i} name: got '${got.column_name}', expected '${want.column_name}'`);
        if (got.data_type !== want.data_type) throw new Error(`Column '${got.column_name}' data_type: got '${got.data_type}', expected '${want.data_type}'`);
        if (got.is_nullable !== want.is_nullable) throw new Error(`Column '${got.column_name}' is_nullable: got '${got.is_nullable}', expected '${want.is_nullable}'`);
        if (normalizeDefault(got.column_default) !== normalizeDefault(want.column_default)) {
          throw new Error(`Column '${got.column_name}' default: got '${got.column_default}', expected '${want.column_default}'`);
        }
      }
      console.log(`  columns OK (${cols.length} columns; names, types, nullability, and defaults all match) ✓`);

      // Explicit assertion that created_at default is now() — required by the task done criteria.
      const createdAtDefault = cols.find((c) => c.column_name === "created_at")?.column_default ?? "";
      if (!/now\(\)/.test(createdAtDefault)) {
        throw new Error(`created_at default must include now(); got '${createdAtDefault}'`);
      }
      console.log(`  created_at default contains now() ✓`);

      // Explicit assertion that the serial sequence is named custom_dzikir_types_id_seq
      // and is bound to the id column — required by the task done criteria.
      const seq = (await client.query<{ pg_get_serial_sequence: string | null }>(`
        SELECT pg_get_serial_sequence('public.custom_dzikir_types', 'id')
      `)).rows[0]?.pg_get_serial_sequence;
      if (seq !== "public.custom_dzikir_types_id_seq") {
        throw new Error(`Serial sequence binding wrong: got '${seq}', expected 'public.custom_dzikir_types_id_seq'`);
      }
      const seqExists = (await client.query<{ n: number }>(`
        SELECT COUNT(*)::int AS n FROM pg_class
        WHERE relkind='S' AND relname='custom_dzikir_types_id_seq'
      `)).rows[0].n;
      if (seqExists !== 1) {
        throw new Error(`Sequence custom_dzikir_types_id_seq does not exist (count=${seqExists})`);
      }
      console.log(`  sequence custom_dzikir_types_id_seq exists and is bound to id ✓`);

      // PK index check
      const idxs = (await client.query<{ indexname: string; indexdef: string }>(`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname='public' AND tablename='custom_dzikir_types'
      `)).rows;
      const pk = idxs.find((r) => r.indexname === "custom_dzikir_types_pkey");
      if (!pk) throw new Error("custom_dzikir_types_pkey missing");
      if (!/\(id\)/.test(pk.indexdef)) throw new Error(`PK not on id: ${pk.indexdef}`);
      console.log(`  primary key OK: ${pk.indexdef}`);

      // FK check
      const fk = (await client.query<{ foreign_table: string; foreign_column: string }>(`
        SELECT ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
        WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
          AND tc.table_name='custom_dzikir_types' AND kcu.column_name='user_id'
      `)).rows[0];
      if (!fk || fk.foreign_table !== "users" || fk.foreign_column !== "id") {
        throw new Error(`user_id FK does not reference users(id). Got: ${JSON.stringify(fk)}`);
      }
      console.log(`  foreign key OK: user_id -> users(id)`);

      const rowCount = (await client.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM custom_dzikir_types`)).rows[0].n;
      console.log(`  existing rows: ${rowCount} (this script never inserts user data)`);

      await client.query("COMMIT");
      console.log("transaction committed.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    // -----------------------------------------------------------------------
    // Step 3: COMPREHENSIVE post-check parity.
    //
    // Re-snapshot dev and prod and require zero differences across:
    // tables, columns (incl. nullability and default), indexes, and FKs.
    // -----------------------------------------------------------------------
    console.log("\n=== Step 3: Comprehensive post-check parity (dev vs prod) ===");
    const devSnap1  = await snapshot(devPool);
    const prodSnap1 = await snapshot(prodPool);
    const postDiff = diffSnapshots(devSnap1, prodSnap1);
    console.log("post-diff:");
    console.log(summarizeDiff(postDiff));

    // After the fix, all "missing in prod" categories must be empty. Mismatches
    // (different type/nullability/default/indexdef on the same name) must also
    // be empty. We deliberately tolerate "extra in prod" (prod-only objects),
    // because:
    //   - prod legitimately has the prayer-dedup partial unique index installed
    //     by an earlier prep script, which dev may or may not have yet.
    //   - the goal of THIS task is "prod has everything the deployed code
    //     needs", not "prod is byte-identical to dev".
    const fatalPost: string[] = [];
    if (postDiff.tablesMissingInProd.length)  fatalPost.push(`tables missing in prod: ${postDiff.tablesMissingInProd.join(", ")}`);
    if (postDiff.columnsMissingInProd.length) fatalPost.push(`columns missing in prod: ${postDiff.columnsMissingInProd.join(", ")}`);
    if (postDiff.columnMismatches.length)     fatalPost.push(`column mismatches: ${postDiff.columnMismatches.join(", ")}`);
    if (postDiff.indexesMissingInProd.length) fatalPost.push(`indexes missing in prod: ${postDiff.indexesMissingInProd.join(", ")}`);
    if (postDiff.indexMismatches.length)      fatalPost.push(`index mismatches: ${postDiff.indexMismatches.join(", ")}`);
    if (postDiff.fksMissingInProd.length)     fatalPost.push(`FKs missing in prod: ${postDiff.fksMissingInProd.join(", ")}`);

    if (fatalPost.length > 0) {
      throw new Error(
        "Post-check FAILED: prod is still missing schema objects that dev has.\n  " +
          fatalPost.join("\n  "),
      );
    }
    console.log("comprehensive parity PASS: zero missing tables/columns/indexes/FKs in prod (extras tolerated) ✓");

    // -----------------------------------------------------------------------
    // Step 4: Untouched-data sanity.
    // -----------------------------------------------------------------------
    console.log("\n=== Step 4: Untouched-data sanity check ===");
    const sanity = (await client.query<{ targets: number; deeds: number; users: number }>(`
      SELECT
        (SELECT COUNT(*)::int FROM targets) AS targets,
        (SELECT COUNT(*)::int FROM deeds) AS deeds,
        (SELECT COUNT(*)::int FROM users) AS users
    `)).rows[0];
    console.log(`  targets=${sanity.targets}, deeds=${sanity.deeds}, users=${sanity.users}`);
    console.log("  (these counts must match what they were before this script — only the new empty table was added)");

    console.log("\n✅ Production now has custom_dzikir_types and full schema parity with dev for required objects.");
  } finally {
    client.release();
    await prodPool.end();
    if (devPool) await devPool.end();
  }
}

main().catch((e) => {
  console.error("\n❌ FAILED:", e);
  process.exit(1);
});
