import { Hono } from "hono";
import { handleWebhook } from "../services/stripe.ts";

const webhook = new Hono();

webhook.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  try {
    const body = await c.req.text();
    await handleWebhook(body, signature);
    return c.json({ received: true });
  } catch (error) {
    console.error("[webhook] Stripe webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 400);
  }
});

export default webhook;
