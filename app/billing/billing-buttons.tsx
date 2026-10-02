"use client";

// Day 10 — client buttons for /billing. They POST to our own API routes and
// follow the Stripe-hosted URL they return. No Stripe.js, no card fields,
// no secrets anywhere near the browser.

import { useState } from "react";

interface Props {
  isPro: boolean;
  hasCustomer: boolean;
  configured: boolean;
  priceLabel: string;
  priceSub: string;
}

async function postJson(path: string): Promise<{ url?: string; error?: string }> {
  const res = await fetch(path, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Something went wrong.");
  }
  return data;
}

export default function BillingButtons({
  isPro,
  hasCustomer,
  configured,
  priceLabel,
  priceSub,
}: Props) {
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (kind: "checkout" | "portal") => {
    setBusy(kind);
    setError(null);
    try {
      const data = await postJson(
        kind === "checkout" ? "/api/stripe/checkout" : "/api/stripe/portal"
      );
      if (!data.url) throw new Error("Could not continue — please try again.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  };

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
        Billing is still being wired up (test mode). Check back soon — your
        Free plan works fully in the meantime.
      </div>
    );
  }

  return (
    <div>
      {!isPro ? (
        <div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go("checkout")}
            className="w-full rounded-2xl bg-orange-600 px-6 py-4 text-lg font-extrabold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.99] disabled:opacity-60"
          >
            {busy === "checkout"
              ? "Starting secure checkout…"
              : `⚡ Upgrade to Pro — ${priceLabel} ${priceSub}`}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500">
            Unlimited AI scans · support the beta · cancel anytime
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy !== null || !hasCustomer}
          onClick={() => go("portal")}
          className="w-full rounded-2xl border-2 border-orange-600 bg-white px-6 py-3.5 text-base font-extrabold text-orange-700 transition hover:bg-orange-50 active:scale-[0.99] disabled:opacity-60"
        >
          {busy === "portal"
            ? "Opening…"
            : "Manage subscription (card, invoices, cancel)"}
        </button>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
