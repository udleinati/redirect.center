// Polar API client (Phase 6 reconciliation). The only call we need: list the
// provider's active subscriptions so the reconcile job can rebuild the local
// cache from the source of truth.
//
//   GET {apiBase}/v1/subscriptions/?active=true&page=N&limit=100
//   Authorization: Bearer <org access token>
//
// Items come back in the same shape Polar sends on webhooks, so the reconcile
// job feeds them straight through the pure event->action mapping (mapPlanEvent),
// keeping customer/scope/cap/period extraction in exactly one place.

export interface PolarApiOptions {
  apiBase: string;
  accessToken: string;
}

// The slice of a subscription we read, structurally identical to a webhook's
// `data` payload (the rest of the object is ignored).
export interface PolarSubscriptionItem {
  id?: unknown;
  status?: unknown;
  product_id?: unknown;
  customer_id?: unknown;
  current_period_end?: unknown;
}

interface ListResponse {
  items?: PolarSubscriptionItem[];
  pagination?: { max_page?: number };
}

const PAGE_SIZE = 100; // Polar's max page size

// Fetch every active subscription, following pagination. Fails loud on any
// non-2xx response (the reconcile job must NOT proceed to deactivate rows when
// it can't trust the remote set). `fetchImpl` is injectable for tests.
export async function listActiveSubscriptions(
  opts: PolarApiOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<PolarSubscriptionItem[]> {
  const base = opts.apiBase.replace(/\/+$/, "");
  const items: PolarSubscriptionItem[] = [];

  let page = 1;
  for (;;) {
    const url =
      `${base}/v1/subscriptions/?active=true&page=${page}&limit=${PAGE_SIZE}`;
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Polar API ${res.status} listing subscriptions: ${body.slice(0, 200)}`,
      );
    }
    const data = (await res.json()) as ListResponse;
    for (const item of data.items ?? []) items.push(item);

    const maxPage = data.pagination?.max_page ?? page;
    if (page >= maxPage) break;
    page++;
  }

  return items;
}

// ── Dashboard auth + billing (Phase 10/12) ──────────────────────────────────
// Three small Core API reads/writes the dashboard needs. Each fails loud on a
// non-2xx so callers can decide whether to surface or swallow (e.g. /auth/request
// swallows for anti-enumeration). `fetchImpl` is injectable for tests.

// Resolve a Polar customer id from an exact email (magic-link login). Polar's
// customer list supports an exact `email` filter; we still re-check the returned
// email case-insensitively so a loose match never logs in the wrong account.
// Returns null when no customer has that email.
export async function findCustomerIdByEmail(
  opts: PolarApiOptions,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const base = opts.apiBase.replace(/\/+$/, "");
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  const url = `${base}/v1/customers/?email=${
    encodeURIComponent(wanted)
  }&limit=10`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Polar API ${res.status} looking up customer: ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    items?: Array<{ id?: unknown; email?: unknown }>;
  };
  for (const item of data.items ?? []) {
    if (
      typeof item.id === "string" && typeof item.email === "string" &&
      item.email.toLowerCase() === wanted
    ) {
      return item.id;
    }
  }
  return null;
}

// Resolve the Polar customer (id + email) from a completed checkout, for
// post-checkout auto-login (the checkout's success_url carries the checkout id).
// Returns null when the checkout has no customer yet (not completed).
export async function getCheckoutCustomer(
  opts: PolarApiOptions,
  checkoutId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ customerId: string; email: string } | null> {
  const base = opts.apiBase.replace(/\/+$/, "");
  const url = `${base}/v1/checkouts/${encodeURIComponent(checkoutId)}`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Polar API ${res.status} reading checkout: ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    customer_id?: unknown;
    customer_email?: unknown;
  };
  const customerId = typeof data.customer_id === "string"
    ? data.customer_id
    : "";
  if (!customerId) return null;
  const email = typeof data.customer_email === "string"
    ? data.customer_email
    : "";
  return { customerId, email };
}

// Mint a Polar customer session and return its hosted-portal URL, so the dashboard
// deep-links a Customer into Polar for Tier changes, card, invoices, and cancel
// (Phase 12) without building any billing UI.
export async function createCustomerSession(
  opts: PolarApiOptions,
  customerId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const base = opts.apiBase.replace(/\/+$/, "");
  const res = await fetchImpl(`${base}/v1/customer-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ customer_id: customerId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Polar API ${res.status} creating customer session: ${
        body.slice(0, 200)
      }`,
    );
  }
  const data = (await res.json()) as { customer_portal_url?: unknown };
  if (
    typeof data.customer_portal_url !== "string" || !data.customer_portal_url
  ) {
    throw new Error(
      "Polar customer session response missing customer_portal_url",
    );
  }
  return data.customer_portal_url;
}
