import { query, queryOne } from "../connection.ts";
import type { Notification } from "../../types.ts";

export async function create(
  userId: string,
  type: string,
  channel: "email" | "panel",
  domainId?: string,
): Promise<Notification> {
  const rows = await query<Notification>(
    `INSERT INTO notifications (user_id, domain_id, type, channel)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, domainId ?? null, type, channel],
  );
  return rows[0];
}

export async function wasRecentlySent(
  userId: string,
  domainId: string,
  type: string,
  channel: "email" | "panel",
  withinHours: number = 24,
): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM notifications
       WHERE user_id = $1
       AND domain_id = $2
       AND type = $3
       AND channel = $4
       AND sent_at > NOW() - ($5 || ' hours')::INTERVAL
     ) as exists`,
    [userId, domainId, type, channel, withinHours.toString()],
  );
  return result?.exists ?? false;
}

export async function findPanelNotifications(userId: string): Promise<Notification[]> {
  return await query<Notification>(
    `SELECT * FROM notifications
     WHERE user_id = $1
     AND channel = 'panel'
     AND sent_at > NOW() - INTERVAL '7 days'
     ORDER BY sent_at DESC`,
    [userId],
  );
}
