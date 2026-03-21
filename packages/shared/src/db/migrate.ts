import { getPool } from "./connection.ts";
import { join, dirname, fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";

const MIGRATIONS_TABLE = "_migrations";

async function ensureMigrationsTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const client = await getPool().connect();
  try {
    const result = await client.queryObject<{ name: string }>(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
    );
    return new Set(result.rows.map((r) => r.name));
  } finally {
    client.release();
  }
}

async function getMigrationFiles(migrationsDir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(migrationsDir)) {
    if (entry.isFile && entry.name.endsWith(".sql")) {
      files.push(entry.name);
    }
  }
  return files.sort();
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(
    dirname(fromFileUrl(import.meta.url)),
    "migrations",
  );

  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles(migrationsDir);
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log("[migrate] All migrations are up to date.");
    return;
  }

  console.log(`[migrate] Found ${pending.length} pending migration(s).`);

  for (const file of pending) {
    const filePath = join(migrationsDir, file);
    const sql = await Deno.readTextFile(filePath);

    const client = await getPool().connect();
    try {
      const transaction = client.createTransaction(`migration_${file}`);
      await transaction.begin();

      await transaction.queryObject(sql);
      await transaction.queryObject(
        `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
        [file],
      );

      await transaction.commit();
      console.log(`[migrate] Applied: ${file}`);
    } catch (error) {
      console.error(`[migrate] Failed to apply ${file}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("[migrate] All migrations applied successfully.");
}
