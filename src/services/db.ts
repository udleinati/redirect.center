// Postgres connection for the v2 durable store (ADR-0002). A single shared pool;
// only constructed when the paid HTTPS tier is enabled. NOTICE messages from
// `CREATE TABLE IF NOT EXISTS` are silenced so they don't spam the access log.

import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

export function createDb(url: string): Sql {
  return postgres(url, { onnotice: () => {} });
}
