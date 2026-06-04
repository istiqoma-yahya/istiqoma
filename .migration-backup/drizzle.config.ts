import { defineConfig } from "drizzle-kit";

const isProduction = process.env.NODE_ENV === "production";

const connectionString = isProduction
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.SUPABASE_DEV_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isProduction
      ? "SUPABASE_DATABASE_URL must be set in production for drizzle-kit."
      : "SUPABASE_DEV_DATABASE_URL must be set in development for drizzle-kit. Refusing to fall back to the production database.",
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    // Match the runtime SSL strategy: Supabase's pooler uses a self-signed cert chain
    // not trusted by the Replit CA bundle. rejectUnauthorized:false keeps behavior
    // consistent between schema push and app runtime.
    ssl: { rejectUnauthorized: false },
  },
});
