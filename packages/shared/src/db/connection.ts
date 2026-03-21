import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { getConfig } from "../config.ts";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getConfig();
    pool = new Pool(config.database.url, 10, true);
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.queryObject<T>(sql, args);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
