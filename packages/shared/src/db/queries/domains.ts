import { query, queryOne } from "../connection.ts";
import type { Domain } from "../../types.ts";

export async function findBySeatId(seatId: string): Promise<Domain | null> {
  return await queryOne<Domain>(
    "SELECT * FROM domains WHERE seat_id = $1",
    [seatId],
  );
}

export async function findByDomain(domain: string): Promise<Domain | null> {
  return await queryOne<Domain>(
    "SELECT * FROM domains WHERE domain = $1",
    [domain],
  );
}

export async function create(
  seatId: string,
  domain: string,
  isWildcard: boolean = false,
): Promise<Domain> {
  const rows = await query<Domain>(
    `INSERT INTO domains (seat_id, domain, is_wildcard)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [seatId, domain, isWildcard],
  );
  return rows[0];
}

export async function updateDomain(
  id: string,
  domain: string,
  isWildcard: boolean,
): Promise<Domain | null> {
  return await queryOne<Domain>(
    `UPDATE domains SET domain = $1, is_wildcard = $2, validation_status = 'pending', updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [domain, isWildcard, id],
  );
}

export async function removeBySeatId(seatId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    "DELETE FROM domains WHERE seat_id = $1 RETURNING id",
    [seatId],
  );
  return rows.length;
}
