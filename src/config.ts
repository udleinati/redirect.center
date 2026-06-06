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
  // v1 store; superseded by Postgres in v2 (kept until the v1 webhook is removed).
  subscriptionsDbPath: string;
  // v2 durable store (ADR-0002): Postgres connection URL. Holds Plans + Domains;
  // the in-process authorization cache is loaded from here. Only read when the
  // paid HTTPS tier is enabled.
  databaseUrl: string;
  // Demo seed (v1): "domain:scope,domain:scope" upserted as active subs on startup.
  seedSubscriptions: string;
  // Demo seed (v2): plan blocks "customerId|scope|cap|domain,domain;…" seeded as
  // active Plans + Domains on startup (see paid-store.seedPlans).
  seedPlansSpec: string;
  // Polar webhook (Phase 3/4). Secret signs deliveries; product ids map to a
  // tier/scope; the domain custom-field slug locates the purchased domain.
  polarWebhookSecret: string;
  polarProductSingleId: string;
  polarProductWholeDomainId: string;
  polarDomainFieldSlug: string;
  // S3 cert storage (shared with Caddy). Phase 4 deletes a revoked domain's
  // cert objects here. Only read when httpsTierEnabled.
  s3Host: string; // "host:port" (dev) or "s3.<region>.amazonaws.com" (prod)
  s3Bucket: string;
  s3AccessId: string;
  s3SecretKey: string;
  s3Region: string; // SigV4 signing region; must match the bucket's region.
  s3Prefix: string;
  s3Insecure: boolean;
  // On-demand TLS issuance rate limit (Phase 7). Caddy dropped its built-in
  // on_demand rate limit in 2.9, so the `ask` endpoint caps how many new certs
  // may be authorized per window to prevent mass ACME issuance.
  tlsIssuanceRateLimit: number;
  tlsIssuanceRateWindowMs: number;
  // Polar checkout links (Phase 5). Base hosted-checkout URLs per tier; the
  // homepage funnel appends the entered domain as a prefilled custom field.
  checkoutSingleUrl: string;
  checkoutWholeDomainUrl: string;
  // Polar API (Phase 6 reconciliation). Org access token + API base; the
  // reconcile job pulls active subscriptions and rebuilds the local cache.
  polarAccessToken: string;
  polarApiBase: string;
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
    databaseUrl: Deno.env.get("DATABASE_URL") || "postgres://redirect:redirect@postgres:5432/redirect",
    seedSubscriptions: Deno.env.get("SEED_SUBSCRIPTIONS") || "",
    seedPlansSpec: Deno.env.get("SEED_PLANS") || "",
    polarWebhookSecret: Deno.env.get("POLAR_WEBHOOK_SECRET") || "",
    polarProductSingleId: Deno.env.get("POLAR_PRODUCT_SINGLE_ID") || "",
    polarProductWholeDomainId: Deno.env.get("POLAR_PRODUCT_WHOLE_DOMAIN_ID") || "",
    polarDomainFieldSlug: Deno.env.get("POLAR_DOMAIN_FIELD_SLUG") || "domain",
    s3Host: Deno.env.get("S3_HOST") || "",
    s3Bucket: Deno.env.get("S3_BUCKET") || "",
    s3AccessId: Deno.env.get("S3_ACCESS_ID") || "",
    s3SecretKey: Deno.env.get("S3_SECRET_KEY") || "",
    s3Region: Deno.env.get("S3_REGION") || "us-east-1",
    s3Prefix: Deno.env.get("S3_PREFIX") || "certs",
    s3Insecure: Deno.env.get("S3_INSECURE") === "true",
    tlsIssuanceRateLimit: Number(Deno.env.get("TLS_ISSUANCE_RATE_LIMIT")) || 20,
    tlsIssuanceRateWindowMs: Number(Deno.env.get("TLS_ISSUANCE_RATE_WINDOW_MS")) || 300_000,
    checkoutSingleUrl: Deno.env.get("POLAR_CHECKOUT_SINGLE_URL") || "",
    checkoutWholeDomainUrl: Deno.env.get("POLAR_CHECKOUT_WHOLE_DOMAIN_URL") || "",
    polarAccessToken: Deno.env.get("POLAR_ACCESS_TOKEN") || "",
    polarApiBase: Deno.env.get("POLAR_API_BASE") || "https://api.polar.sh",
  };
}

export const config = loadConfig();
