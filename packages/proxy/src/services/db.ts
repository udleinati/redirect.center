/**
 * Database queries for fetching valid certificates.
 * Uses direct postgres connection (not shared package) to keep proxy lightweight.
 */

import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { logger } from "../utils/logger.ts";

export interface CertRow {
  domain: string;
  certificate_pem: string;
  private_key_pem_encrypted: string;
  private_key_iv: string;
  updated_at: Date;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = Deno.env.get("DATABASE_URL");
    if (!url) throw new Error("DATABASE_URL is required");
    pool = new Pool(url, 3, true);
  }
  return pool;
}

/**
 * Fetch all valid (issued, non-expired) certificates with their domain info.
 */
export async function fetchValidCertificates(): Promise<CertRow[]> {
  const client = await getPool().connect();
  try {
    const result = await client.queryObject<CertRow>(`
      SELECT
        d.domain,
        c.certificate_pem,
        c.private_key_pem_encrypted,
        c.private_key_iv,
        c.updated_at
      FROM certificates c
      JOIN domains d ON d.id = c.domain_id
      WHERE d.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND c.expires_at > NOW()
        AND c.status = 'issued'
        AND d.validation_status = 'validated'
    `);
    return result.rows;
  } catch (error) {
    logger.error("Failed to fetch certificates from database:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
