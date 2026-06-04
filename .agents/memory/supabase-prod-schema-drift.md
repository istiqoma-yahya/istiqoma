---
name: Supabase prod schema drift
description: Why "column does not exist" can hit prod even after publishing, and the correct fix path for this app.
---
Istiqoma stores app data in **external Supabase** (`SUPABASE_DATABASE_URL` = prod, `SUPABASE_DEV_DATABASE_URL` = dev), not Replit-managed Postgres. Session storage is separate (Replit-managed `DATABASE_URL`).

**The trap:** Replit's publish-time schema diff/apply ONLY runs for Replit-managed Postgres. It does NOT touch external Supabase. So `npm run db:push` updates only the **dev** Supabase (NODE_ENV=development → dev URL), and a normal Publish leaves the **prod** Supabase schema untouched. Any schema change shipped this way crashes prod with "column ... does not exist" even though dev works and the deploy "succeeded."

**Why:** Standard guidance "just re-publish to migrate prod" is for Replit-managed DBs and is WRONG here — re-publishing does nothing to Supabase schema.

**How to apply:** When prod errors with missing column/table after a deploy, diff dev vs prod Supabase by connecting with `pg` using both env URLs (ssl `{rejectUnauthorized:false}`), then apply the project's own schema to prod. Either `NODE_ENV=production npm run db:push` (targets prod Supabase via drizzle.config.ts) or a surgical additive `ALTER TABLE` in a transaction. Prefer additive/backwards-compatible changes; verify no duplicate rows before adding unique indexes. Both Supabase URLs are present in the dev workspace env, so the diff can be run locally.
