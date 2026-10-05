// Day 13 — root-level error boundary. Required to render its own <html>/<body>
// because the root layout itself may be the thing that crashed.

"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  Sentry.captureMessage(`global-error:${error.digest ?? "unknown"}`, {
    level: "fatal",
  });

  return (
    <html lang="en">
      <body className="bg-orange-50/50 font-sans text-gray-900">
        <div className="mx-auto max-w-md px-4 pt-24 text-center">
          <div className="text-5xl">🍛</div>
          <h1 className="mt-4 text-2xl font-extrabold">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            The app hit an unexpected error. Your data is safe — try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-full bg-orange-600 px-6 py-2.5 font-semibold text-white hover:bg-orange-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
