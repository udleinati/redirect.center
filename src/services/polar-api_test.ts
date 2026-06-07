import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import {
  createCustomerSession,
  findCustomerIdByEmail,
  getCheckoutCustomer,
  listActiveSubscriptions,
} from "./polar-api.ts";

const OPTS = { apiBase: "https://api.polar.test", accessToken: "tok_123" };

// A fetch double that records every call and answers from a handler. Typed as
// `typeof fetch` so it slots straight into the injectable `fetchImpl` argument.
function recordingFetch(
  handler: (url: string, init?: RequestInit) => Response,
): { fetch: typeof fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    return Promise.resolve(handler(url, init));
  }) as typeof fetch;
  return { fetch: impl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function authHeader(init?: RequestInit): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

// ── listActiveSubscriptions ────────────────────────────────────────────────

// WHY: the reconcile job must see EVERY active subscription, so pagination must be
// followed to the last page — stopping early would silently deactivate live Plans.
Deno.test("listActiveSubscriptions follows pagination and sends the bearer token", async () => {
  const { fetch, calls } = recordingFetch((url) => {
    const page = new URL(url).searchParams.get("page");
    return page === "1"
      ? json({
        items: [{ id: "s1" }, { id: "s2" }],
        pagination: { max_page: 2 },
      })
      : json({ items: [{ id: "s3" }], pagination: { max_page: 2 } });
  });

  const items = await listActiveSubscriptions(OPTS, fetch);

  assertEquals(items.map((i) => i.id), ["s1", "s2", "s3"]);
  assertEquals(calls.length, 2);
  assertStringIncludes(calls[0].url, "active=true");
  assertStringIncludes(calls[0].url, "limit=100");
  assertStringIncludes(calls[0].url, "page=1");
  assertStringIncludes(calls[1].url, "page=2");
  assertEquals(authHeader(calls[0].init), "Bearer tok_123");
});

// WHY: "fail loud" — a non-2xx must throw, never return [], or the reconcile job
// would treat a transient API outage as "no subscriptions" and revoke everyone.
Deno.test("listActiveSubscriptions throws on a non-2xx response", async () => {
  const { fetch } = recordingFetch(() => json({ error: "boom" }, 500));
  await assertRejects(
    () => listActiveSubscriptions(OPTS, fetch),
    Error,
    "500",
  );
});

// ── findCustomerIdByEmail ──────────────────────────────────────────────────

// WHY: the magic-link login resolves identity by email; the match must be exact
// and case-insensitive, and the request must hit the customers filter for that email.
Deno.test("findCustomerIdByEmail returns the id on a case-insensitive exact match", async () => {
  const { fetch, calls } = recordingFetch(() =>
    json({ items: [{ id: "cus_1", email: "user@example.com" }] })
  );

  const id = await findCustomerIdByEmail(OPTS, "User@Example.COM", fetch);

  assertEquals(id, "cus_1");
  assertStringIncludes(calls[0].url, "/v1/customers/?email=");
  assertStringIncludes(calls[0].url, encodeURIComponent("user@example.com"));
});

// WHY: Polar's filter can return near-matches; logging someone into the wrong
// account is a security incident, so a non-exact email must resolve to null.
Deno.test("findCustomerIdByEmail rejects a non-exact email match", async () => {
  const { fetch } = recordingFetch(() =>
    json({ items: [{ id: "cus_x", email: "someone-else@example.com" }] })
  );
  assertEquals(
    await findCustomerIdByEmail(OPTS, "user@example.com", fetch),
    null,
  );
});

// WHY: an empty email can never identify a customer; we must short-circuit to null
// without spending an API call (and without leaking a blank query upstream).
Deno.test("findCustomerIdByEmail returns null for a blank email without calling the API", async () => {
  const { fetch, calls } = recordingFetch(() => json({ items: [] }));
  assertEquals(await findCustomerIdByEmail(OPTS, "   ", fetch), null);
  assertEquals(calls.length, 0);
});

// WHY: a trailing slash on the configured apiBase must not produce a `//v1` URL
// (some gateways 404 on doubled slashes).
Deno.test("findCustomerIdByEmail normalizes a trailing slash in apiBase", async () => {
  const { fetch, calls } = recordingFetch(() => json({ items: [] }));
  await findCustomerIdByEmail(
    { apiBase: "https://api.polar.test/", accessToken: "t" },
    "a@b.com",
    fetch,
  );
  assertStringIncludes(calls[0].url, "https://api.polar.test/v1/customers");
  assert(!calls[0].url.includes("test//v1"));
});

// ── getCheckoutCustomer ────────────────────────────────────────────────────

// WHY: post-checkout auto-login needs both id and email from the completed checkout.
Deno.test("getCheckoutCustomer returns id and email from a completed checkout", async () => {
  const { fetch } = recordingFetch(() =>
    json({ customer_id: "cus_2", customer_email: "buyer@x.com" })
  );
  assertEquals(await getCheckoutCustomer(OPTS, "chk_1", fetch), {
    customerId: "cus_2",
    email: "buyer@x.com",
  });
});

// WHY: an incomplete checkout has no customer yet — we must return null (not a
// half-built object) so the caller falls back to the normal login.
Deno.test("getCheckoutCustomer returns null when the checkout has no customer", async () => {
  const { fetch } = recordingFetch(() => json({ customer_id: null }));
  assertEquals(await getCheckoutCustomer(OPTS, "chk_1", fetch), null);
});

// ── createCustomerSession ──────────────────────────────────────────────────

// WHY: the billing button deep-links into Polar; we must POST the customer id and
// return the portal URL the API mints.
Deno.test("createCustomerSession posts the customer id and returns the portal URL", async () => {
  const { fetch, calls } = recordingFetch(() =>
    json({ customer_portal_url: "https://polar.test/portal/abc" })
  );

  const url = await createCustomerSession(OPTS, "cus_3", fetch);

  assertEquals(url, "https://polar.test/portal/abc");
  assertEquals(calls[0].init?.method, "POST");
  assertStringIncludes(String(calls[0].init?.body), "cus_3");
  assertStringIncludes(calls[0].url, "/v1/customer-sessions");
});

// WHY: a 2xx with no portal URL is unusable — failing loud beats redirecting the
// customer to an empty/undefined location.
Deno.test("createCustomerSession throws when the portal URL is missing", async () => {
  const { fetch } = recordingFetch(() => json({}));
  await assertRejects(
    () => createCustomerSession(OPTS, "cus_3", fetch),
    Error,
    "customer_portal_url",
  );
});
