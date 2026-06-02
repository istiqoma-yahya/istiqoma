import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

async function main() {
  const sqlPath = path.join(process.cwd(), 'migrations', '0015_push_native_platform.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DEV_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration 0015 applied successfully');
  } catch (e: any) {
    if (e.message?.includes('already exists') || e.code === '42701' || e.code === '42P07') {
      console.log('Migration already applied (columns/table already exist).');
    } else {
      console.error('Migration error:', e.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}
main();
