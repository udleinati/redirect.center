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
  certificateQueries,
  notificationQueries,
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
  Certificate,
  CertificateStatus,
  Notification,
} from "./types.ts";

export { getConfig } from "./config.ts";
export type { Config } from "./config.ts";
