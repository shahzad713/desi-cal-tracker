// Day 13 — Sentry server-side error tracking.
//
// DORMANT unless SENTRY_DSN is set server-side (Vercel dashboard, Day 14).
// No DSN = init is a no-op, no network calls, no behavior change. The DSN is
// read from a server-only env var and never reaches the client bundle.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: !!dsn,

  tracesSampleRate: 0.1,


  // Defense in depth: strip anything credential-shaped from the event before
  // it leaves the server. Error MESSAGES never contain secrets by construction
  // (see lib/errors.ts reportError).
  beforeSend(event) {
    if (event.request?.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (/cookie|authorization|secret|token|key/i.test(key)) {
          delete event.request.headers[key];
        }
      }
    }
    return event;
  },
});
