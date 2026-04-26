#!/bin/bash
set -e
npm install
# One-shot migration: convert legacy prayer_completions rows into Sholat
# Fardhu deeds before db:push --force drops the table. Idempotent — safe
# to re-run after the table is gone.
npx tsx scripts/migrate-prayer-completions-to-deeds.ts
npm run db:push -- --force
