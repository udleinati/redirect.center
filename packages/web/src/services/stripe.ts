import Stripe from "stripe";
import { getConfig } from "../../../shared/src/config.ts";
import * as usersQuery from "../../../shared/src/db/queries/users.ts";
import * as seatsQuery from "../../../shared/src/db/queries/seats.ts";
import * as domainsQuery from "../../../shared/src/db/queries/domains.ts";
import type { SeatType } from "../../../shared/src/types.ts";

function getStripeClient(): Stripe {
  const config = getConfig();
  if (!config.stripe.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(config.stripe.secretKey, {
    apiVersion: "2023-10-16",
  });
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  seatType: SeatType,
): Promise<string> {
  const config = getConfig();
  const stripe = getStripeClient();

  // Get or create Stripe customer
  const user = await usersQuery.findById(userId);
  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email });
    customerId = customer.id;
    await usersQuery.updateStripeCustomerId(userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.baseUrl}/dashboard/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.baseUrl}/dashboard/subscribe`,
    metadata: {
      user_id: userId,
      seat_type: seatType,
    },
  });

  if (!session.url) {
    throw new Error("Stripe checkout session URL is missing");
  }

  return session.url;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string,
): Promise<string> {
  const config = getConfig();
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${config.baseUrl}/dashboard`,
  });

  return session.url;
}

export async function handleWebhook(
  body: string,
  signature: string,
): Promise<void> {
  const config = getConfig();
  const stripe = getStripeClient();

  let event: Stripe.Event;

  if (!config.stripe.webhookSecret) {
    // No webhook secret configured — parse the event without signature verification.
    // This is useful when using stripe-cli in development (it generates its own secret).
    console.warn("[webhook] STRIPE_WEBHOOK_SECRET not set, skipping signature verification");
    event = JSON.parse(body) as Stripe.Event;
  } else {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      config.stripe.webhookSecret,
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const seatType = (session.metadata?.seat_type ?? "simple") as SeatType;
      const subscriptionId = session.subscription as string;

      if (!userId) {
        console.error("[stripe] checkout.session.completed missing user_id in metadata");
        return;
      }

      // Retrieve subscription to get price ID and period
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;

      await seatsQuery.create(userId, seatType, subscriptionId, priceId);

      console.log(`[stripe] Seat created for user ${userId}, type=${seatType}, sub=${subscriptionId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const seat = await seatsQuery.findByStripeSubscriptionId(subscription.id);

      if (!seat) {
        console.warn(`[stripe] No seat found for subscription ${subscription.id}`);
        return;
      }

      // Update period dates
      const periodStart = new Date(subscription.current_period_start * 1000);
      const periodEnd = new Date(subscription.current_period_end * 1000);
      await seatsQuery.updateStripePeriod(seat.id, periodStart, periodEnd);

      // Update status based on subscription status
      if (subscription.status === "active" || subscription.status === "trialing") {
        await seatsQuery.updateStatus(seat.id, "active");
      } else if (subscription.status === "past_due") {
        await seatsQuery.updateStatus(seat.id, "past_due");
      }

      console.log(`[stripe] Subscription ${subscription.id} updated, status=${subscription.status}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const seat = await seatsQuery.findByStripeSubscriptionId(subscription.id);

      if (!seat) {
        console.warn(`[stripe] No seat found for subscription ${subscription.id}`);
        return;
      }

      await seatsQuery.updateStatus(seat.id, "canceled");
      await domainsQuery.removeBySeatId(seat.id);

      console.log(`[stripe] Subscription ${subscription.id} canceled, domain removed`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) return;

      const seat = await seatsQuery.findByStripeSubscriptionId(subscriptionId);
      if (!seat) {
        console.warn(`[stripe] No seat found for subscription ${subscriptionId}`);
        return;
      }

      await seatsQuery.updateStatus(seat.id, "past_due");
      console.log(`[stripe] Payment failed for subscription ${subscriptionId}, marked past_due`);
      break;
    }

    default:
      console.log(`[stripe] Unhandled event type: ${event.type}`);
  }
}
