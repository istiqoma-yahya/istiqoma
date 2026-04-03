import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  // Supabase's transaction pooler presents a self-signed certificate chain that is not
  // trusted by the Node.js default CA bundle in the Replit hosting environment.
  // The connection is still TLS-encrypted; only CA verification is bypassed.
  // This is a known platform constraint — see: https://supabase.com/docs/guides/database/connecting-to-postgres
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });
