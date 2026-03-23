import { query, queryOne } from "../connection.ts";
import type { User } from "../../types.ts";

export async function findByEmail(email: string): Promise<User | null> {
  return await queryOne<User>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
}

export async function findById(id: string): Promise<User | null> {
  return await queryOne<User>(
    "SELECT * FROM users WHERE id = $1",
    [id],
  );
}

export async function create(email: string): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [email],
  );
  return rows[0];
}

export async function acceptTos(id: string): Promise<User | null> {
  return await queryOne<User>(
    `UPDATE users SET tos_accepted_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
}

export async function updateStripeCustomerId(
  id: string,
  stripeCustomerId: string,
): Promise<User | null> {
  return await queryOne<User>(
    `UPDATE users SET stripe_customer_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [stripeCustomerId, id],
  );
}
