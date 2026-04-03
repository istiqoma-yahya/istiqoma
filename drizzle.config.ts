import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    // Match the runtime SSL strategy: Supabase's pooler uses a self-signed cert chain
    // not trusted by the Replit CA bundle. rejectUnauthorized:false keeps behavior
    // consistent between schema push and app runtime.
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
  },
});
