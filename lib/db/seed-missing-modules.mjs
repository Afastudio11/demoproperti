/**
 * Compatibility wrapper.
 *
 * Missing-module seed data has been merged into docs/seed-data.sql so there is
 * only one source of truth for demo data across all dashboard sub-menus.
 *
 * Usage from repo root:
 *   DATABASE_URL="postgres://..." node lib/db/seed-missing-modules.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL wajib diisi sebelum menjalankan seed.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const sqlPath = resolve(repoRoot, "docs/seed-data.sql");
const sql = await readFile(sqlPath, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log(`Menjalankan seed terpadu dari ${sqlPath}`);
  await pool.query(sql);
  console.log("Seed terpadu selesai. Semua data sub-menu sekarang berasal dari docs/seed-data.sql.");
} finally {
  await pool.end();
}
