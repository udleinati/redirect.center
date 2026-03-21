export {
  getPool,
  query,
  queryOne,
  closePool,
  runMigrations,
  userQueries,
  sessionQueries,
  magicLinkQueries,
  seatQueries,
  domainQueries,
} from "./db/mod.ts";

export type {
  User,
  Session,
  MagicLink,
  Seat,
  SeatType,
  SeatStatus,
  Domain,
  ValidationStatus,
} from "./types.ts";

export { getConfig } from "./config.ts";
export type { Config } from "./config.ts";
