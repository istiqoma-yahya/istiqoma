import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import pg from "pg";

async function fixNullTargetNames() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("No DATABASE_URL set, skipping null name fix");
    return;
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const result = await client.query(
      `UPDATE targets SET name = COALESCE(category, 'Target') WHERE name IS NULL`
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`Fixed ${result.rowCount} targets with null names`);
    } else {
      console.log("No null target names found");
    }
  } catch (err) {
    console.error("Warning: could not fix null names:", err);
  } finally {
    await client.end();
  }
}

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  console.log("fixing null target names...");
  await fixNullTargetNames();

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
