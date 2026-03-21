import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.ts";
import { getConfig } from "../../../shared/src/config.ts";
import * as seatsQuery from "../../../shared/src/db/queries/seats.ts";
import * as domainsQuery from "../../../shared/src/db/queries/domains.ts";
import { createCheckoutSession, createCustomerPortalSession } from "../services/stripe.ts";
import {
  dashboardPage,
  subscribePage,
  checkoutSuccessPage,
  seatDetailPage,
  errorPage,
} from "../templates/pages.ts";
import type { User, SeatType, Domain } from "../../../shared/src/types.ts";

const dashboard = new Hono();

// Apply auth middleware to all dashboard routes
dashboard.use("*", authMiddleware);

dashboard.get("/", async (c) => {
  const user = c.get("user" as never) as User;
  const seats = await seatsQuery.findByUserId(user.id);

  // Load domains for each seat
  const domains = new Map<string, Domain | null>();
  for (const seat of seats) {
    const domain = await domainsQuery.findBySeatId(seat.id);
    domains.set(seat.id, domain);
  }

  return c.html(dashboardPage(user, seats, domains));
});

dashboard.get("/subscribe", (c) => {
  const user = c.get("user" as never) as User;
  const config = getConfig();

  return c.html(
    subscribePage(
      {
        simpleMonthly: config.stripe.prices.simpleMonthly,
        simpleYearly: config.stripe.prices.simpleYearly,
        wildcardMonthly: config.stripe.prices.wildcardMonthly,
        wildcardYearly: config.stripe.prices.wildcardYearly,
      },
      user,
    ),
  );
});

dashboard.post("/subscribe", async (c) => {
  const user = c.get("user" as never) as User;
  const body = await c.req.parseBody();
  const priceId = body["priceId"] as string;
  const seatType = body["seatType"] as SeatType;

  if (!priceId || !seatType) {
    return c.html(errorPage("Invalid Request", "Missing plan selection."), 400);
  }

  if (seatType !== "simple" && seatType !== "wildcard") {
    return c.html(errorPage("Invalid Request", "Invalid seat type."), 400);
  }

  try {
    const checkoutUrl = await createCheckoutSession(
      user.id,
      user.email,
      priceId,
      seatType,
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

dashboard.get("/checkout/success", (c) => {
  const user = c.get("user" as never) as User;
  return c.html(checkoutSuccessPage(user));
});

dashboard.get("/seats/:id", async (c) => {
  const user = c.get("user" as never) as User;
  const seatId = c.req.param("id");

  const seat = await seatsQuery.findById(seatId);
  if (!seat || seat.user_id !== user.id) {
    return c.html(errorPage("Not Found", "Seat not found."), 404);
  }

  const domain = await domainsQuery.findBySeatId(seat.id);
  return c.html(seatDetailPage(user, seat, domain));
});

dashboard.post("/seats/:id/domain", async (c) => {
  const user = c.get("user" as never) as User;
  const seatId = c.req.param("id");
  const body = await c.req.parseBody();
  const domainName = (body["domain"] as string)?.trim().toLowerCase();

  if (!domainName) {
    return c.html(errorPage("Invalid Request", "Domain name is required."), 400);
  }

  const seat = await seatsQuery.findById(seatId);
  if (!seat || seat.user_id !== user.id) {
    return c.html(errorPage("Not Found", "Seat not found."), 404);
  }

  if (seat.status !== "active") {
    return c.html(errorPage("Not Allowed", "Domain changes are not allowed while seat is not active."), 403);
  }

  const isWildcard = seat.type === "wildcard";

  try {
    const existingDomain = await domainsQuery.findBySeatId(seat.id);

    if (existingDomain) {
      await domainsQuery.updateDomain(existingDomain.id, domainName, isWildcard);
    } else {
      await domainsQuery.create(seat.id, domainName, isWildcard);
    }

    return c.redirect(`/dashboard/seats/${seat.id}`);
  } catch (error) {
    console.error("[dashboard] Domain update error:", error);
    return c.html(
      errorPage("Error", "Failed to update domain. It may already be in use."),
      500,
    );
  }
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
