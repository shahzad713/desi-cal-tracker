// Day 10 — Stripe billing (test mode). SERVER ONLY.
// This module reads STRIPE_SECRET_KEY, so it must NEVER be imported from
// client components or anything bundled for the browser. Import it only in
// route handlers, server actions, and server components.

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Lazily-constructed Stripe client. Throws a friendly error when the
 *  server isn't configured yet (test-mode keys not set) instead of crashing
 *  at import time — the /billing page renders a setup note in that case. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Billing is not configured yet (STRIPE_SECRET_KEY is missing)."
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-09-30.endive",
      appInfo: { name: "Desi Cal AI", version: "0.1.0" },
    });
  }
  return stripeClient;
}

/** Is Stripe wired up on this server? Used to render graceful fallbacks. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** The Pro subscription price id (test-mode price from the Stripe dashboard). */
export function getProPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) {
    throw new Error(
      "Billing is not configured yet (STRIPE_PRICE_ID is missing)."
    );
  }
  return id;
}

/** Stripe subscription statuses that count as "Pro = paid up". Anything else
 *  (past_due, canceled, unpaid, incomplete…) is NOT Pro — access must never
 *  be granted on a lapsed subscription. */
const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
]);

/** True when a Stripe subscription status means the user has paid access. */
export function subscriptionGrantsPro(status: string): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

/** Public base URL for building absolute success/cancel redirect URLs. */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}
