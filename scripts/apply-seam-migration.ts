/**
 * One-off: apply supabase/migrations/20260407120000_seam_smart_lock.sql
 * Run: pnpm exec tsx scripts/apply-seam-migration.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: path.join(process.cwd(), ".env.local") });

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (.env.local).");
    process.exit(1);
  }
  return url;
}

async function main() {
  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  const migration = readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260407120000_seam_smart_lock.sql"),
    "utf8"
  );

  try {
    await sql.unsafe(migration);
    console.log("Seam smart-lock migration applied successfully.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
