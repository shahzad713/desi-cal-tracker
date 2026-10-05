// Day 13 — Sentry browser-side error tracking.
//
// The SDK is DORMANT unless NEXT_PUBLIC_SENTRY_DSN is set (Shahzad adds it
// on Day 14 from the Sentry dashboard). No DSN = zero network calls, zero
// behavior change. DSN is public-by-design (it's a write-only ingest key),
// so the NEXT_PUBLIC_ prefix is correct here.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  // Stay completely inert without a DSN — never phone home from a
  // misconfigured deploy.
  enabled: !!dsn,

  // Keep volume (and cost) low: 10% of transactions, no session replays.
  // Error events are always captured when enabled.
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,


  // Scrub anything that looks like a credential before it leaves the browser.
  beforeSend(event) {
    for (const value of Object.values(event.request?.headers ?? {})) {
      if (typeof value === "string" && /bearer|cookie|authorization/i.test(value)) {
        delete event.request?.headers;
        break;
      }
    }
    return event;
  },
});
