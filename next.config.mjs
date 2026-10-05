// Day 13 — security hardening pass.
//
// Content-Security-Policy (the "Full CSP audit" promised in the Day 2
// config). Design notes:
// - script-src 'unsafe-inline': required by Next.js (inline flight data /
//   hydration scripts). No 'unsafe-eval' — Next 14 doesn't need it in prod.
// - style-src 'unsafe-inline': Tailwind + recharts render inline styles.
// - img-src: same-origin + data:/blob: (upload previews) + Google's avatar
//   CDN (lh3.googleusercontent.com, rendered via a plain <img>).
// - connect-src: same-origin (server actions) + Sentry ingest (only used
//   when a DSN is configured on Day 14; harmless otherwise).
// - frame-ancestors 'none' (+ X-Frame-Options DENY below): no clickjacking.
// - form-action 'self': Auth.js posts to /api/auth/* on our own origin; the
//   Google/Stripe OAuth/checkout steps are top-level navigations, which CSP
//   does not restrict.
// - No remotePatterns for next/image: we don't use the Image Optimizer, so
//   that whole attack surface stays off.
import pkg from "@sentry/nextjs/config";
const { withSentryConfig } = pkg;

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework version (fingerprinting defense).
  poweredByHeader: false,

  // Security headers (non-negotiable checklist).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Only meaningful over HTTPS (Vercel prod, Day 14); harmless locally.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// Sentry: dormant until SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN are set (Day 14).
// Sourcemap upload + build telemetry disabled — Shahzad enables them with an
// auth token if he ever wants release tracking.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
  widenClientFileUpload: false,
});
