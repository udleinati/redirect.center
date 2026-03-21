export {
  getPool,
  query,
  queryOne,
  closePool,
  runMigrations,
  userQueries,
  sessionQueries,
  magicLinkQueries,
  subscriptionQueries,
  domainQueries,
} from "./db/mod.ts";

export type {
  User,
  Session,
  MagicLink,
  Subscription,
  SlotType,
  SubscriptionStatus,
  BillingInterval,
  Domain,
  ValidationStatus,
} from "./types.ts";

export { getConfig } from "./config.ts";
export type { Config } from "./config.ts";
