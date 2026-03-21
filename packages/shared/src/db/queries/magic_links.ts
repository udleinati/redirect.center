import { query, queryOne } from "../connection.ts";
import type { MagicLink } from "../../types.ts";

export async function create(
  email: string,
  token: string,
  expiresAt: Date,
): Promise<MagicLink> {
  const rows = await query<MagicLink>(
    `INSERT INTO magic_links (email, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, token, expiresAt],
  );
  return rows[0];
}

export async function findByToken(token: string): Promise<MagicLink | null> {
  return await queryOne<MagicLink>(
    "SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL",
    [token],
  );
}

export async function markUsed(id: string): Promise<MagicLink | null> {
  return await queryOne<MagicLink>(
    `UPDATE magic_links SET used_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
}

export async function deleteExpired(): Promise<number> {
  const rows = await query<{ id: string }>(
    "DELETE FROM magic_links WHERE expires_at <= NOW() OR used_at IS NOT NULL RETURNING id",
  );
  return rows.length;
}
