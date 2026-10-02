// Day 10 — billing status helpers (server side).
// The single source of truth for "is this user Pro?" is the `isPro` flag on
// the User row, which only signature-verified Stripe webhooks may set.

import { prisma } from "./db";

export interface BillingStatus {
  isPro: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/** Billing status for the signed-in user. Returns the Free default when the
 *  account row is missing rather than throwing — callers decide how to act. */
export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPro: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  return {
    isPro: user?.isPro ?? false,
    stripeCustomerId: user?.stripeCustomerId ?? null,
    stripeSubscriptionId: user?.stripeSubscriptionId ?? null,
  };
}

/** Free plan: 20 AI scans/hour. Pro plan: unlimited scans (the per-user
 *  bucket is skipped entirely; the per-IP abuse backstop stays). */
export const FREE_SCANS_PER_HOUR = 20;
