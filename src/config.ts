export interface AppConfig {
  fqdn: string;
  entryIp: string;
  listenPort: number;
  listenIp: string;
  environment: string;
  projectName: string;
  loggerLevel: string;
  // Paid HTTPS tier (off by default => byte-for-byte legacy behavior).
  httpsTierEnabled: boolean;
  // Trust X-Forwarded-* (only when running behind a reverse proxy, e.g. Caddy).
  trustProxy: boolean;
  // Path to the SQLite subscription cache (file needs --allow-write; ":memory:" ok).
  subscriptionsDbPath: string;
  // Demo seed: "domain:scope,domain:scope" upserted as active subs on startup.
  seedSubscriptions: string;
}

export function loadConfig(): AppConfig {
  return {
    fqdn: Deno.env.get("FQDN") || "localhost",
    entryIp: Deno.env.get("ENTRY_IP") || "127.0.0.1",
    listenPort: Number(Deno.env.get("LISTEN_PORT")) || 3000,
    listenIp: Deno.env.get("LISTEN_IP") || "0.0.0.0",
    environment: Deno.env.get("ENVIRONMENT") || "dev1",
    projectName: Deno.env.get("PROJECT_NAME") || "redirect.center",
    loggerLevel: Deno.env.get("LOGGER_LEVEL") || "debug",
    httpsTierEnabled: Deno.env.get("HTTPS_TIER_ENABLED") === "true",
    trustProxy: Deno.env.get("TRUST_PROXY") === "true",
    subscriptionsDbPath: Deno.env.get("SUBSCRIPTIONS_DB_PATH") || "db/subscriptions.db",
    seedSubscriptions: Deno.env.get("SEED_SUBSCRIPTIONS") || "",
  };
}

export const config = loadConfig();
