import { query, queryOne } from "../connection.ts";
import type { Seat, SeatType, SeatStatus } from "../../types.ts";

export async function findByUserId(userId: string): Promise<Seat[]> {
  return await query<Seat>(
    "SELECT * FROM seats WHERE user_id = $1 ORDER BY created_at",
    [userId],
  );
}

export async function findById(id: string): Promise<Seat | null> {
  return await queryOne<Seat>(
    "SELECT * FROM seats WHERE id = $1",
    [id],
  );
}

export async function findByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<Seat | null> {
  return await queryOne<Seat>(
    "SELECT * FROM seats WHERE stripe_subscription_id = $1",
    [stripeSubscriptionId],
  );
}

export async function create(
  userId: string,
  type: SeatType,
  stripeSubscriptionId?: string,
  stripePriceId?: string,
): Promise<Seat> {
  const rows = await query<Seat>(
    `INSERT INTO seats (user_id, type, stripe_subscription_id, stripe_price_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, type, stripeSubscriptionId ?? null, stripePriceId ?? null],
  );
  return rows[0];
}

export async function updateStatus(
  id: string,
  status: SeatStatus,
): Promise<Seat | null> {
  return await queryOne<Seat>(
    `UPDATE seats SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id],
  );
}

export async function updateStripePeriod(
  id: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
): Promise<Seat | null> {
  return await queryOne<Seat>(
    `UPDATE seats SET current_period_start = $1, current_period_end = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [currentPeriodStart, currentPeriodEnd, id],
  );
}
