// Day 10 — POST /api/stripe/portal
// Opens Stripe's hosted Customer Portal so Pro users can update their card,
// view invoices, or cancel — we never touch raw card data ourselves.
//
// SECURITY: identity from the server session; the customer id comes from OUR
// database row for that user, never from the request body.

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStripe, appBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const PORTALS_PER_HOUR_PER_USER = 10;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  if (!checkRateLimit(`portal:${userId}`, PORTALS_PER_HOUR_PER_USER, HOUR_MS)) {
    return Response.json({ error: "Too many attempts — try again later." }, { status: 429 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Billing not configured." },
      { status: 503 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return Response.json(
      { error: "No billing account yet — upgrade to Pro first." },
      { status: 404 }
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appBaseUrl()}/billing`,
  });

  if (!portal.url) {
    return Response.json({ error: "Could not open the portal." }, { status: 502 });
  }
  return Response.json({ url: portal.url });
}
