// Day 10 — /billing page (protected). Shows the user's plan, their AI scan
// budget, and the upgrade / manage-subscription actions. Stripe prices are
// read from the Stripe API server-side so the displayed price always matches
// the configured test-mode price — nothing is hardcoded.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBillingStatus, FREE_SCANS_PER_HOUR } from "@/lib/billing";
import { getStripe, getProPriceId, isBillingConfigured } from "@/lib/stripe";
import BillingButtons from "./billing-buttons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing — Desi Cal AI",
};

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return "Pro";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { upgraded?: string; canceled?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const status = await getBillingStatus(session.user.id);

  // Price for display only — read live from Stripe so it can't drift.
  let priceLabel = "Pro";
  let priceSub = "per month, cancel anytime";
  if (isBillingConfigured()) {
    try {
      const price = await getStripe().prices.retrieve(getProPriceId());
      priceLabel = formatPrice(price.unit_amount, price.currency ?? "usd");
      const interval = price.recurring?.interval;
      priceSub = interval ? `per ${interval}, cancel anytime` : "cancel anytime";
    } catch {
      // Stripe hiccup: show the generic label, never an error page.
    }
  }

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">💳 Billing</h1>

      {searchParams.upgraded === "1" && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          🎉 Welcome to Pro! Your subscription is being activated — it can take
          up to a minute to show up here.
        </div>
      )}
      {searchParams.canceled === "1" && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-800">
          Checkout was canceled — no charge was made. Pro is here whenever
          you&apos;re ready.
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">
              Current plan
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {status.isPro ? (
                <>
                  Pro <span aria-hidden>✨</span>
                </>
              ) : (
                "Free"
              )}
            </div>
          </div>
          <div
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              status.isPro
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {status.isPro ? "ACTIVE" : "FREE"}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-orange-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              AI photo scans
            </dt>
            <dd className="mt-1 text-lg font-extrabold text-orange-600">
              {status.isPro ? "∞ Unlimited" : `${FREE_SCANS_PER_HOUR}/hour`}
            </dd>
          </div>
          <div className="rounded-xl bg-orange-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Dish database
            </dt>
            <dd className="mt-1 text-lg font-extrabold text-orange-600">
              209 dishes · always free
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <BillingButtons
            isPro={status.isPro}
            hasCustomer={Boolean(status.stripeCustomerId)}
            configured={isBillingConfigured()}
            priceLabel={priceLabel}
            priceSub={priceSub}
          />
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Payments are processed securely by Stripe — we never see or store
          your card details. Test mode while in beta; no real charges.
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/profile" className="font-semibold text-orange-600 underline">
          ← Back to profile
        </Link>
      </p>
    </div>
  );
}
