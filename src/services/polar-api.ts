// Polar API client (Phase 6 reconciliation). The only call we need: list the
// provider's active subscriptions so the reconcile job can rebuild the local
// cache from the source of truth.
//
//   GET {apiBase}/v1/subscriptions/?active=true&page=N&limit=100
//   Authorization: Bearer <org access token>
//
// Items come back in the same shape Polar sends on webhooks, so the reconcile
// job feeds them straight through the pure event->action mapping (mapEvent),
// keeping domain/scope/period extraction in exactly one place.

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
  current_period_end?: unknown;
  custom_field_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
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
    const url = `${base}/v1/subscriptions/?active=true&page=${page}&limit=${PAGE_SIZE}`;
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Polar API ${res.status} listing subscriptions: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as ListResponse;
    for (const item of data.items ?? []) items.push(item);

    const maxPage = data.pagination?.max_page ?? page;
    if (page >= maxPage) break;
    page++;
  }

  return items;
}
