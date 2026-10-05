// Day 13 — route-segment error boundary. Catches render/action errors in any
// nested segment and shows a friendly recovery UI instead of a blank crash.
// The digest is reported to Sentry client-side (dormant without a DSN).

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest only — never the full message, which could contain user data.
    Sentry.captureMessage(`route-error:${error.digest ?? "unknown"}`, {
      level: "error",
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <div className="text-5xl">🍛</div>
      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        The kitchen had a hiccup. Your logged meals are safe — try again.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-full bg-orange-600 px-6 py-2.5 font-semibold text-white hover:bg-orange-700"
      >
        Try again
      </button>
    </div>
  );
}
