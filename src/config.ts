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
  // Polar webhook (Phase 3/4). Secret signs deliveries; product ids map to a
  // tier/scope; the domain custom-field slug locates the purchased domain.
  polarWebhookSecret: string;
  polarProductSingleId: string;
  polarProductWholeDomainId: string;
  polarDomainFieldSlug: string;
  // S3 cert storage (shared with Caddy). Phase 4 deletes a revoked domain's
  // cert objects here. Only read when httpsTierEnabled.
  s3Host: string; // "host:port"
  s3Bucket: string;
  s3AccessId: string;
  s3SecretKey: string;
  s3Prefix: string;
  s3Insecure: boolean;
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
    polarWebhookSecret: Deno.env.get("POLAR_WEBHOOK_SECRET") || "",
    polarProductSingleId: Deno.env.get("POLAR_PRODUCT_SINGLE_ID") || "",
    polarProductWholeDomainId: Deno.env.get("POLAR_PRODUCT_WHOLE_DOMAIN_ID") || "",
    polarDomainFieldSlug: Deno.env.get("POLAR_DOMAIN_FIELD_SLUG") || "domain",
    s3Host: Deno.env.get("S3_HOST") || "",
    s3Bucket: Deno.env.get("S3_BUCKET") || "",
    s3AccessId: Deno.env.get("S3_ACCESS_ID") || "",
    s3SecretKey: Deno.env.get("S3_SECRET_KEY") || "",
    s3Prefix: Deno.env.get("S3_PREFIX") || "certs",
    s3Insecure: Deno.env.get("S3_INSECURE") === "true",
  };
}

export const config = loadConfig();
