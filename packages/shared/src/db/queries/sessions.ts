import { query, queryOne } from "../connection.ts";
import type { Session } from "../../types.ts";

export async function create(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<Session> {
  const rows = await query<Session>(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, token, expiresAt],
  );
  return rows[0];
}

export async function findByToken(token: string): Promise<Session | null> {
  return await queryOne<Session>(
    "SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()",
    [token],
  );
}

export async function deleteExpired(): Promise<number> {
  const rows = await query<{ id: string }>(
    "DELETE FROM sessions WHERE expires_at <= NOW() RETURNING id",
  );
  return rows.length;
}

export async function deleteByUserId(userId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    "DELETE FROM sessions WHERE user_id = $1 RETURNING id",
    [userId],
  );
  return rows.length;
}
