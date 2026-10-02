// Day 10 — POST /api/stripe/webhook
// Stripe event receiver. This is a PUBLIC endpoint by design, but it is NOT
// an open door: every event is authenticated with the webhook signing secret
// (STRIPE_WEBHOOK_SECRET). Without a valid signature the body is rejected —
// so nobody can forge "payment completed" events and grant themselves Pro.
//
// SECURITY rules for this route:
// - Raw request body is used for signature verification (no JSON parsing
//   before constructEvent — parsing first would break the signature).
// - The user is identified by the Stripe customer id (or the cuid-validated
//   metadata.userId Stripe echoes back from OUR checkout session) — never by
//   any value the browser could set.
// - isPro is derived from Stripe's subscription STATUS, not from the event
//   type alone. A canceled/past_due subscription is never Pro.
// - Unknown event types are acknowledged (200) and ignored — Stripe retries
//   unacknowledged deliveries, so we never 4xx a well-formed event.

import { z } from "zod";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  getStripe,
  subscriptionGrantsPro,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

const metadataUserIdSchema = z.object({
  userId: z.string().cuid(),
});

/** Find the app user for a Stripe customer, falling back to the userId we
 *  stamped into the checkout session metadata (cuid-validated). */
async function findUserForCustomer(
  customerId: string,
  metadata: Stripe.Metadata | null
): Promise<string | null> {
  const byCustomer = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byCustomer) return byCustomer.id;

  const parsed = metadataUserIdSchema.safeParse(metadata ?? {});
  if (!parsed.success) return null;

  const byId = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  return byId?.id ?? null;
}

/** Apply a subscription's state to the user row. Idempotent: re-deliveries
 *  of the same event write the same values. */
async function applySubscriptionState(
  userId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      // NEVER trust "a subscription exists" — only active/trialing = Pro.
      isPro: subscriptionGrantsPro(sub.status),
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfigured server must not silently accept unsigned events.
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    // Bad signature / malformed payload — reject, don't process.
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!customerId || !subscriptionId) break;

        const userId = await findUserForCustomer(customerId, session.metadata);
        if (!userId) break;

        // Fetch the subscription to read its authoritative status —
        // checkout.session.completed alone doesn't say it's paid/active.
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        await applySubscriptionState(userId, sub);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const userId = await findUserForCustomer(customerId, sub.metadata);
        if (!userId) break;
        await applySubscriptionState(userId, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const userId = await findUserForCustomer(customerId, sub.metadata);
        if (!userId) break;
        // Lapsed/canceled subscription: Pro is revoked, ids are kept for
        // history and so a resubscribe re-links the same customer.
        await prisma.user.update({
          where: { id: userId },
          data: { isPro: false, stripeSubscriptionId: null },
        });
        break;
      }

      default:
        // Unknown event types are acknowledged and ignored (no retries).
        break;
    }
  } catch {
    // DB hiccup: return 500 so Stripe retries the delivery.
    return Response.json({ error: "Processing failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
