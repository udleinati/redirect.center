// Reconcile CLI (Phase 6). Pulls active subscriptions from Polar and rebuilds the
// local SQLite cache, establishing the provider as the source of truth. Run it on
// a schedule, or after wiping/replacing the box to recover full paid-HTTPS state
// (certs already persist in S3, so no re-issuance happens):
//
//   deno task reconcile
//   docker compose run --rm app deno task reconcile
//
// Fails loud (non-zero exit) on missing config or any API error — and fetches the
// remote set BEFORE touching the store, so a provider outage never deactivates
// local rows.

import { config } from "./config.ts";
import { SubscriptionStore } from "./services/subscription-store.ts";
import { listActiveSubscriptions } from "./services/polar-api.ts";
import { buildProductScopes } from "./services/polar-webhook.ts";
import { reconcile } from "./services/reconcile.ts";

if (!config.polarAccessToken) {
  console.error("[reconcile] POLAR_ACCESS_TOKEN is required");
  Deno.exit(1);
}

const productScopes = buildProductScopes(config.polarProductSingleId, config.polarProductWholeDomainId);
if (productScopes.size === 0) {
  console.error("[reconcile] no POLAR_PRODUCT_SINGLE_ID / POLAR_PRODUCT_WHOLE_DOMAIN_ID configured — nothing maps to a scope");
  Deno.exit(1);
}

console.log(`[reconcile] fetching active subscriptions from ${config.polarApiBase} ...`);
const items = await listActiveSubscriptions({
  apiBase: config.polarApiBase,
  accessToken: config.polarAccessToken,
});

const store = new SubscriptionStore(config.subscriptionsDbPath);
try {
  const result = reconcile(
    store,
    { productScopes, domainFieldSlug: config.polarDomainFieldSlug },
    items,
    Date.now(),
  );
  console.log(
    `[reconcile] remote=${result.remoteTotal} activated=${result.activated} ` +
      `deactivated=${result.deactivated} skipped=${result.skipped}`,
  );
} finally {
  store.close();
}
