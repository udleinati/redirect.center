// Reconcile CLI (modules #4, v2). Pulls active subscriptions from Polar and
// rebuilds the local Postgres `plans` table, establishing the provider as the
// source of truth for Plans. The `domains` table is app-owned and never touched.
// Run it on a schedule, or after wiping/replacing `plans` to recover Plan state
// (certs already persist in S3, so no re-issuance happens):
//
//   deno task reconcile
//   docker compose run --rm app deno task reconcile
//
// Fails loud (non-zero exit) on missing config or any API error — and fetches the
// remote set BEFORE touching the store, so a provider outage never deactivates
// local Plans.

import { config } from "./config.ts";
import { createDb } from "./services/db.ts";
import { listActiveSubscriptions } from "./services/polar-api.ts";
import { buildTierLadders } from "./services/polar-webhook.ts";
import { reconcilePlans } from "./services/reconcile.ts";

if (!config.polarAccessToken) {
  console.error("[reconcile] POLAR_ACCESS_TOKEN is required");
  Deno.exit(1);
}

const productTiers = buildTierLadders(
  config.polarProductSingleId,
  config.polarProductWholeDomainId,
  config.polarProductTiers,
);
if (productTiers.size === 0) {
  console.error(
    "[reconcile] no Tier products configured — set POLAR_PRODUCT_SINGLE_ID / POLAR_PRODUCT_WHOLE_DOMAIN_ID (cap-1) and/or POLAR_PRODUCT_TIERS",
  );
  Deno.exit(1);
}

console.log(
  `[reconcile] fetching active subscriptions from ${config.polarApiBase} ...`,
);
const items = await listActiveSubscriptions({
  apiBase: config.polarApiBase,
  accessToken: config.polarAccessToken,
});

const sql = createDb(config.databaseUrl);
try {
  const result = await reconcilePlans(sql, productTiers, items, Date.now());
  console.log(
    `[reconcile] remote=${result.remoteTotal} activated=${result.activated} ` +
      `deactivated=${result.deactivated} skipped=${result.skipped}`,
  );
} finally {
  await sql.end();
}
