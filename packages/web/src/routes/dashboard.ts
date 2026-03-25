import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.ts";
import { getConfig } from "../../../shared/src/config.ts";
import * as subscriptionQueries from "../../../shared/src/db/queries/subscriptions.ts";
import * as domainQueries from "../../../shared/src/db/queries/domains.ts";
import * as certificateQueries from "../../../shared/src/db/queries/certificates.ts";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  updateSubscriptionQuantity,
} from "../services/stripe.ts";
import {
  dashboardPage,
  subscribePage,
  checkoutSuccessPage,
  errorPage,
} from "../templates/pages.ts";
import type { User, SlotType, Domain, Certificate } from "../../../shared/src/types.ts";

const dashboard = new Hono();

// Apply auth middleware to all dashboard routes
dashboard.use("*", authMiddleware);

dashboard.get("/", async (c) => {
  const user = c.get("user" as never) as User;
  const subscriptions = await subscriptionQueries.findByUserId(user.id);

  // Load domains and certificates for each subscription
  const domains = new Map<string, Domain[]>();
  const certificates = new Map<string, Certificate | null>();
  for (const sub of subscriptions) {
    const subDomains = await domainQueries.findBySubscriptionId(sub.id);
    domains.set(sub.id, subDomains);
    for (const d of subDomains) {
      const cert = await certificateQueries.findByDomainId(d.id);
      certificates.set(d.id, cert);
    }
  }

  return c.html(dashboardPage(user, subscriptions, domains, certificates));
});

dashboard.get("/subscribe", async (c) => {
  const user = c.get("user" as never) as User;
  const config = getConfig();
  const subscriptions = await subscriptionQueries.findByUserId(user.id);

  return c.html(
    subscribePage(
      {
        simpleMonthly: config.stripe.prices.simpleMonthly,
        simpleYearly: config.stripe.prices.simpleYearly,
        wildcardMonthly: config.stripe.prices.wildcardMonthly,
        wildcardYearly: config.stripe.prices.wildcardYearly,
      },
      user,
      subscriptions,
    ),
  );
});

dashboard.post("/subscribe", async (c) => {
  const user = c.get("user" as never) as User;
  const body = await c.req.parseBody();
  const priceId = body["priceId"] as string;
  const slotType = body["slotType"] as SlotType;
  const quantity = parseInt(body["quantity"] as string || "1", 10);

  if (!priceId || !slotType) {
    return c.html(errorPage("Invalid Request", "Missing plan selection."), 400);
  }

  if (slotType !== "simple" && slotType !== "wildcard") {
    return c.html(errorPage("Invalid Request", "Invalid slot type."), 400);
  }

  if (quantity < 1 || isNaN(quantity)) {
    return c.html(errorPage("Invalid Request", "Quantity must be at least 1."), 400);
  }

  try {
    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email,
      priceId,
      slotType,
      quantity,
    );
    return c.redirect(checkoutUrl);
  } catch (error) {
    console.error("[dashboard] Checkout session error:", error);
    return c.html(
      errorPage("Checkout Error", "Failed to create checkout session. Please try again."),
      500,
    );
  }
});

// Add more slots to existing subscription (supports both form POST and AJAX)
dashboard.post("/subscriptions/:id/add-slots", async (c) => {
  const user = c.get("user" as never) as User;
  const subId = c.req.param("id");
  const isAjax = c.req.header("Accept")?.includes("application/json") ||
    c.req.header("X-Requested-With") === "XMLHttpRequest";

  let additionalQuantity: number;
  if (isAjax) {
    const json = await c.req.json().catch(() => ({}));
    additionalQuantity = parseInt(json.quantity || "1", 10);
  } else {
    const body = await c.req.parseBody();
    additionalQuantity = parseInt(body["quantity"] as string || "1", 10);
  }

  if (additionalQuantity < 1 || isNaN(additionalQuantity)) {
    if (isAjax) return c.json({ error: "Quantity must be at least 1." }, 400);
    return c.html(errorPage("Invalid Request", "Quantity must be at least 1."), 400);
  }

  const sub = await subscriptionQueries.findById(subId);
  if (!sub || sub.user_id !== user.id) {
    if (isAjax) return c.json({ error: "Subscription not found." }, 404);
    return c.html(errorPage("Not Found", "Subscription not found."), 404);
  }

  if (sub.status !== "active") {
    if (isAjax) return c.json({ error: "Cannot add slots while subscription is not active." }, 403);
    return c.html(errorPage("Not Allowed", "Cannot add slots while subscription is not active."), 403);
  }

  if (!sub.stripe_subscription_id) {
    if (isAjax) return c.json({ error: "No Stripe subscription linked." }, 400);
    return c.html(errorPage("Error", "No Stripe subscription linked."), 400);
  }

  try {
    const newQuantity = sub.quantity + additionalQuantity;
    await updateSubscriptionQuantity(sub.stripe_subscription_id, newQuantity);
    if (isAjax) return c.json({ ok: true, newQuantity });
    return c.redirect("/dashboard");
  } catch (error) {
    console.error("[dashboard] Add slots error:", error);
    if (isAjax) return c.json({ error: "Failed to add slots. Please try again." }, 500);
    return c.html(
      errorPage("Error", "Failed to add slots. Please try again."),
      500,
    );
  }
});

dashboard.get("/checkout/success", (c) => {
  const user = c.get("user" as never) as User;
  return c.html(checkoutSuccessPage(user));
});

// Add domain to subscription
dashboard.post("/subscriptions/:id/domains", async (c) => {
  const user = c.get("user" as never) as User;
  const subId = c.req.param("id");
  const body = await c.req.parseBody();
  const domainName = (body["domain"] as string)?.trim().toLowerCase();

  if (!domainName) {
    return c.html(errorPage("Invalid Request", "Domain name is required."), 400);
  }

  const sub = await subscriptionQueries.findById(subId);
  if (!sub || sub.user_id !== user.id) {
    return c.html(errorPage("Not Found", "Subscription not found."), 404);
  }

  if (sub.status === "past_due") {
    return c.html(errorPage("Not Allowed", "Resolve the pending payment before adding domains."), 403);
  }

  if (sub.over_limit) {
    return c.html(errorPage("Not Allowed", "Remove excess domains before adding new ones."), 403);
  }

  // Check slot availability
  const domainCount = await domainQueries.countBySubscriptionId(sub.id);
  if (domainCount >= sub.quantity) {
    return c.html(errorPage("No Slots Available", "All slots are in use. Buy more slots to add domains."), 403);
  }

  const isWildcard = sub.type === "wildcard";

  try {
    await domainQueries.create(sub.id, domainName, isWildcard);

    // Don't request validation immediately — let the user configure DNS first
    // and click "Validate Domain" when ready
    return c.redirect("/dashboard");
  } catch (error) {
    console.error("[dashboard] Domain add error:", error);
    return c.html(
      errorPage("Error", "Failed to add domain. It may already be in use."),
      500,
    );
  }
});

// Request domain validation (supports both form POST and AJAX)
dashboard.post("/domains/:id/validate", async (c) => {
  const user = c.get("user" as never) as User;
  const domainId = c.req.param("id");
  const isAjax = c.req.header("Accept")?.includes("application/json") ||
    c.req.header("X-Requested-With") === "XMLHttpRequest";

  const domain = await domainQueries.findById(domainId);
  if (!domain) {
    if (isAjax) return c.json({ error: "Domain not found." }, 404);
    return c.html(errorPage("Not Found", "Domain not found."), 404);
  }

  // Verify ownership
  const sub = await subscriptionQueries.findById(domain.subscription_id);
  if (!sub || sub.user_id !== user.id) {
    if (isAjax) return c.json({ error: "Domain not found." }, 404);
    return c.html(errorPage("Not Found", "Domain not found."), 404);
  }

  // Reset validation status if failed
  if (domain.validation_status === "failed") {
    await domainQueries.updateValidationStatus(domain.id, "pending");
  }

  // Set validation_requested_at so the certmanager picks it up
  await domainQueries.requestValidation(domain.id);

  if (isAjax) return c.json({ ok: true, status: "pending" });
  return c.redirect("/dashboard");
});

// Poll domain validation status (AJAX)
dashboard.get("/domains/:id/status", async (c) => {
  const user = c.get("user" as never) as User;
  const domainId = c.req.param("id");

  const domain = await domainQueries.findById(domainId);
  if (!domain) return c.json({ error: "Domain not found." }, 404);

  const sub = await subscriptionQueries.findById(domain.subscription_id);
  if (!sub || sub.user_id !== user.id) return c.json({ error: "Domain not found." }, 404);

  const cert = await certificateQueries.findByDomainId(domainId);

  return c.json({
    validation_status: domain.validation_status,
    cert_status: cert?.status ?? null,
    error_message: cert?.error_message ?? null,
  });
});

// Remove domain (soft delete)
dashboard.post("/domains/:id/remove", async (c) => {
  const user = c.get("user" as never) as User;
  const domainId = c.req.param("id");

  const domain = await domainQueries.findById(domainId);
  if (!domain) {
    return c.html(errorPage("Not Found", "Domain not found."), 404);
  }

  // Verify ownership
  const sub = await subscriptionQueries.findById(domain.subscription_id);
  if (!sub || sub.user_id !== user.id) {
    return c.html(errorPage("Not Found", "Domain not found."), 404);
  }

  // Soft delete certificate if exists
  const cert = await certificateQueries.findByDomainId(domainId);
  if (cert) {
    await certificateQueries.softDelete(cert.id);
  }

  await domainQueries.softDelete(domainId);

  // Check if over_limit is resolved
  if (sub.over_limit) {
    const domainCount = await domainQueries.countBySubscriptionId(sub.id);
    if (domainCount <= sub.quantity) {
      await subscriptionQueries.updateOverLimit(sub.id, false);
    }
  }

  return c.redirect("/dashboard");
});

dashboard.get("/portal", async (c) => {
  const user = c.get("user" as never) as User;

  if (!user.stripe_customer_id) {
    return c.html(
      errorPage("No Billing Account", "You don't have a billing account yet. Subscribe to a plan first."),
      400,
    );
  }

  try {
    const portalUrl = await createCustomerPortalSession(user.stripe_customer_id);
    return c.redirect(portalUrl);
  } catch (error) {
    console.error("[dashboard] Portal session error:", error);
    return c.html(
      errorPage("Billing Error", "Failed to open the billing portal. Please try again."),
      500,
    );
  }
});

export default dashboard;
