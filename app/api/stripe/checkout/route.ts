// Day 10 — POST /api/stripe/checkout
// Starts a Stripe Checkout session for the Pro subscription.
//
// SECURITY:
// - The caller's identity comes from the server session (auth()) — the
//   request body carries NO user id and NO price. The price id is read from
//   server env vars, so the client can't swap in a cheaper price.
// - userId is stamped into the session metadata so the webhook can link the
//   paid customer back to the right account.
// - Rate-limited per user to stop session-spam.

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStripe, getProPriceId, appBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const CHECKOUTS_PER_HOUR_PER_USER = 10;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!checkRateLimit(`checkout:${userId}`, CHECKOUTS_PER_HOUR_PER_USER, HOUR_MS)) {
    return Response.json({ error: "Too many attempts — try again later." }, { status: 429 });
  }

  let stripe;
  let priceId: string;
  try {
    stripe = getStripe();
    priceId = getProPriceId();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Billing not configured." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true, isPro: true },
  });
  if (!user) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }
  if (user.isPro) {
    return Response.json(
      { error: "You're already Pro — manage it from the billing portal." },
      { status: 409 }
    );
  }

  // Reuse the existing Stripe customer if the user has one (e.g. canceled
  // before and resubscribing) — never create duplicates.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = appBaseUrl();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId }, // echoed back in the webhook — links payment → user
    subscription_data: { metadata: { userId } },
    success_url: `${baseUrl}/billing?upgraded=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
  });

  if (!checkout.url) {
    return Response.json({ error: "Could not start checkout." }, { status: 502 });
  }
  return Response.json({ url: checkout.url });
}
