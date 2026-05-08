#!/bin/bash
# Post-merge setup. Runs after every task merge.
#
# Goal: keep BOTH the dev and the production database in sync with
# `shared/schema.ts` so production never silently drifts behind dev.
#
# Strategy:
#   1. Run the one-shot prayer-completions migration against both databases
#      (idempotent; no-op once the legacy table is gone).
#   2. Push the schema to dev with `--force` (dev is disposable; auto-apply
#      any data-loss statements so additive + destructive changes both land).
#   3. Push the schema to prod WITHOUT `--force`. drizzle-kit will apply
#      additive changes (new tables/columns) automatically, but on a
#      destructive change it prompts for confirmation. Stdin is closed
#      during post-merge, so the prompt EOFs and the script fails loudly.
#      That is the safety net: production cannot be silently broken by a
#      destructive schema change — the merge surfaces the failure and the
#      agent must handle it explicitly (e.g. write a data migration first,
#      then re-run with --force, or split the change).

set -e

npm install

run_with_env() {
  local label="$1"
  local node_env="$2"
  shift 2
  echo ""
  echo "=== [$label] $* ==="
  NODE_ENV="$node_env" "$@"
}

# 1. Legacy data migration against both DBs (no-op once table is gone).
run_with_env "dev"  "development" npx tsx scripts/migrate-prayer-completions-to-deeds.ts
run_with_env "prod" "production"  npx tsx scripts/migrate-prayer-completions-to-deeds.ts

# 2. Dev: force-apply everything. Dev is disposable.
run_with_env "dev"  "development" npm run db:push -- --force

# 3. Prod: additive changes auto-apply; destructive changes fail loudly
#    (drizzle-kit prompts for confirmation, stdin is closed -> EOF -> error).
run_with_env "prod" "production"  npm run db:push
