import { query, queryOne } from "../connection.ts";
import type { Subscription, SlotType, SubscriptionStatus, BillingInterval } from "../../types.ts";

export async function findByUserId(userId: string): Promise<Subscription[]> {
  return await query<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at",
    [userId],
  );
}

export async function findById(id: string): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
}

export async function findByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 AND deleted_at IS NULL",
    [stripeSubscriptionId],
  );
}

export async function findByUserIdAndType(
  userId: string,
  type: SlotType,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND type = $2 AND deleted_at IS NULL",
    [userId, type],
  );
}

export async function findAnyActiveByUserId(
  userId: string,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1",
    [userId],
  );
}

export async function create(
  userId: string,
  type: SlotType,
  billingInterval: BillingInterval,
  quantity: number,
  stripeSubscriptionId?: string,
  stripePriceId?: string,
): Promise<Subscription> {
  const rows = await query<Subscription>(
    `INSERT INTO subscriptions (user_id, type, billing_interval, quantity, stripe_subscription_id, stripe_price_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, billingInterval, quantity, stripeSubscriptionId ?? null, stripePriceId ?? null],
  );
  return rows[0];
}

export async function updateStatus(
  id: string,
  status: SubscriptionStatus,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    `UPDATE subscriptions SET status = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [status, id],
  );
}

export async function updateQuantity(
  id: string,
  quantity: number,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    `UPDATE subscriptions SET quantity = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [quantity, id],
  );
}

export async function updateOverLimit(
  id: string,
  overLimit: boolean,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    `UPDATE subscriptions SET over_limit = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [overLimit, id],
  );
}

export async function updateStripePeriod(
  id: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    `UPDATE subscriptions SET current_period_start = $1, current_period_end = $2, updated_at = NOW()
     WHERE id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [currentPeriodStart, currentPeriodEnd, id],
  );
}

export async function setGracePeriod(
  id: string,
): Promise<Subscription | null> {
  return await queryOne<Subscription>(
    `UPDATE subscriptions SET grace_period_end = NOW() + INTERVAL '7 days', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id],
  );
}

export async function softDelete(id: string): Promise<void> {
  await query(
    `UPDATE subscriptions SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

export async function cleanupExpiredGracePeriods(): Promise<number> {
  // Soft delete domains of expired subscriptions
  await query(
    `UPDATE domains SET deleted_at = NOW(), updated_at = NOW()
     WHERE subscription_id IN (
       SELECT id FROM subscriptions
       WHERE status = 'canceled'
       AND grace_period_end < NOW()
       AND deleted_at IS NULL
     )
     AND deleted_at IS NULL`,
  );

  // Soft delete the subscriptions themselves
  const rows = await query<{ id: string }>(
    `UPDATE subscriptions SET deleted_at = NOW(), updated_at = NOW()
     WHERE status = 'canceled'
     AND grace_period_end < NOW()
     AND deleted_at IS NULL
     RETURNING id`,
  );

  return rows.length;
}
