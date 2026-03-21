import { query, queryOne } from "../connection.ts";
import type { Domain } from "../../types.ts";

export async function findBySubscriptionId(subscriptionId: string): Promise<Domain[]> {
  return await query<Domain>(
    "SELECT * FROM domains WHERE subscription_id = $1 AND deleted_at IS NULL ORDER BY created_at",
    [subscriptionId],
  );
}

export async function findById(id: string): Promise<Domain | null> {
  return await queryOne<Domain>(
    "SELECT * FROM domains WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
}

export async function findByDomain(domain: string): Promise<Domain | null> {
  return await queryOne<Domain>(
    "SELECT * FROM domains WHERE domain = $1 AND deleted_at IS NULL",
    [domain],
  );
}

export async function countBySubscriptionId(subscriptionId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM domains WHERE subscription_id = $1 AND deleted_at IS NULL",
    [subscriptionId],
  );
  return parseInt(result?.count ?? "0", 10);
}

export async function create(
  subscriptionId: string,
  domain: string,
  isWildcard: boolean = false,
): Promise<Domain> {
  const rows = await query<Domain>(
    `INSERT INTO domains (subscription_id, domain, is_wildcard)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [subscriptionId, domain, isWildcard],
  );
  return rows[0];
}

export async function softDelete(id: string): Promise<void> {
  await query(
    `UPDATE domains SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

export async function softDeleteBySubscriptionId(subscriptionId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE domains SET deleted_at = NOW(), updated_at = NOW()
     WHERE subscription_id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [subscriptionId],
  );
  return rows.length;
}
