import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

const connectionString = isProduction
  ? process.env.SUPABASE_DATABASE_URL
  : process.env.SUPABASE_DEV_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isProduction
      ? "SUPABASE_DATABASE_URL must be set in production. Refusing to start without an explicit prod database."
      : "SUPABASE_DEV_DATABASE_URL must be set in development. Refusing to fall back to the production database — set the dev secret to a separate Supabase project.",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: isProduction
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
