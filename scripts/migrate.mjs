#!/usr/bin/env node
/**
 * Applies all SQL files in supabase/migrations/ in order via psql.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Requires SUPABASE_DB_URL in .env.local (a Session-pooler Postgres URI).
 * Requires `psql` on PATH.
 *
 * This is intentionally idempotent-free: it re-runs every file. Migrations
 * must be written so re-application does not break anything in dev. When we
 * move to production we'll switch to `supabase db push` which tracks applied
 * migrations in a schema_migrations table.
 */
import { execSync } from "node:child_process"
import { readdirSync } from "node:fs"
import { join } from "node:path"

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set. Add it to .env.local.")
  process.exit(1)
}

const dir = "supabase/migrations"
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()

if (files.length === 0) {
  console.log("No migrations found.")
  process.exit(0)
}

for (const f of files) {
  console.log(`\n→ Applying ${f}...`)
  execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f ${join(dir, f)}`, {
    stdio: "inherit",
  })
}
console.log("\nDone.")
