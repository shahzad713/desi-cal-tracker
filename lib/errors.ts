// Day 13 — server-side error reporting.
//
// reportError() is the single funnel for server-side failures that should
// reach Sentry when it's configured (SENTRY_DSN, Day 14). Rules:
// - NEVER pass user data, request bodies, images, or secrets in `context`.
//   Context is a small bag of safe labels (route name, operation, public id).
// - Always logs locally too, so errors are visible even without Sentry.
// - Never throws: reporting must not break the request it's reporting on.

import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  route?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
}

export function reportError(err: unknown, context?: ErrorContext): void {
  const message =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);

  // Local log first — works with or without Sentry. No stack-trace PII
  // scrubbing needed here because we never log request/user payloads.
  console.error(
    `[desi-cal-ai] ${context?.route ?? "server"}::${
      context?.operation ?? "unknown"
    } — ${message}`
  );

  try {
    Sentry.captureException(err, {
      tags: {
        route: context?.route ?? "unknown",
        operation: context?.operation ?? "unknown",
      },
      extra: context,
    });
  } catch {
    // Reporting failure must never cascade.
  }
}
