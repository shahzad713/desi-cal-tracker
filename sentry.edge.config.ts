// Day 13 — Sentry edge-runtime error tracking (middleware).
//
// DORMANT unless SENTRY_DSN is set. Kept minimal: the middleware is a tiny
// auth gate, so we only capture hard crashes, never request details.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: !!dsn,
  tracesSampleRate: 0,
});
