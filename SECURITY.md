# Desi Cal AI — Security

The non-negotiable standard: this app must be unhackable and unmanipulable by
tricks. Every day's work is gated on the checklist below, and Day 13 added a
runnable audit (`npm test` → `scripts/security-audit.ts`, 52 checks: static +
DB ownership + live HTTP against a production build).

## Checklist (applies to every change)

- [x] **Auth on every private page + API route.** Edge middleware
      (`middleware.ts`) bounces anonymous visitors from `/track`, `/dashboard`,
      `/charts`, `/profile`, `/history`, `/goals`, `/dishes`, `/billing`,
      `/admin` to `/login`. `/share` (management) enforces auth in the page
      itself because `/share/[token]` must stay public. Every private API
      route calls `auth()` / `requireUserId()` / `requireAdmin()`.
- [x] **Ownership checks.** Every `FoodEntry` query is scoped by the session
      `userId` (`deleteMany`/`updateMany`/`findMany` with `{id, userId}`).
      Forged ids affect 0 rows — verified by the audit's throwaway-DB tests.
- [x] **Server-side validation.** zod schemas on all server actions + API
      routes. AI model output is validated like any untrusted input.
- [x] **Uploads.** JPEG/PNG/WebP allowlist, size cap, magic-byte check;
      extension derived from validated MIME, never the client filename.
- [x] **No secrets in client code or git.** API keys via server env vars only.
      `.env` never committed (audit-verified). `NEXT_PUBLIC_*` allowlist:
      `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`
      (write-only ingest key, public by design).
- [x] **Rate limiting.** Login 10/10min/IP · signup 5/hr/IP · scans 20/hr/user
      (+60/hr/IP) · dish search 60/min · dish log 120/hr · share links 20/hr ·
      waitlist 5/hr/IP + 3/hr/email · Stripe checkout/portal 10/hr/user ·
      webhook 60/min/IP · admin actions 60/min. Buckets are memory-bounded
      (10k cap, oldest evicted). Day 14: move to Redis/Upstash.
- [x] **Security headers.** CSP (`frame-ancestors 'none'`, tight
      `script-src`/`style-src`/`img-src`/`connect-src`/`form-action`), plus
      `X-Frame-Options: DENY`, `nosniff`, strict `Referrer-Policy`,
      `Permissions-Policy` (camera/mic/geo off), HSTS preload, and
      `X-Powered-By` removed.
- [x] **Parameterized queries only.** No `$queryRaw`/`$executeRaw` anywhere
      (audit-verified) — SQL injection impossible by construction.
- [x] **No sensitive data in logs, errors, or client responses.** Login/signup
      errors are generic (no account enumeration); Sentry events are scrubbed
      of credential-shaped headers; `reportError()` context carries labels
      only, never user data.

## Dependency audit (Day 13, 2026-10-05)

`npm audit` is blocked by the sandbox registry policy and osv.dev is
unreachable from the sandbox, so the audit was done via published advisories:

| Finding | Action |
|---|---|
| **next-auth ≤ 5.0.0-beta.31: 4 advisories (2026-08-12), incl. CVE-2026-73421 CRITICAL (auth() fail-open on config errors), CVE-2026-73419/73420/73418** | **UPGRADED to 5.0.0-beta.32** (+ `@auth/prisma-adapter` 2.11.3, `@auth/core` 0.41.3). Audit asserts the floor. |
| CVE-2026-94545 (critical RCE in `next/og` Node.js `ImageResponse`, Satori SVG-escaping) | **Not affected**: advisory range is Next.js ≥ 16.2.0 < 16.3.6; we run 14.2.35. Defense in depth anyway: `lib/sanitize.ts` escapes/strips/caps every dynamic string entering the OG renderer. |
| Next.js 14.2.35 | Latest 14.2.x patch line — includes the CVE-2025-29927 middleware-auth-bypass fix and the Dec-2025 RSC fixes. No newer 14.x exists; a 15/16 migration is a planned follow-up, not a Day-13 change. Residual image-optimizer advisories are mitigated: we don't use `next/image` remote optimization at all. |
| zod 4.6.5, stripe 23, prisma 6.19.3, recharts 3.10.1, bcryptjs 3.0.3, @google/generative-ai 0.24.1, react 18 | No published advisories found for the installed versions. |

## Known residual risks (honest list)

1. **In-memory rate limits** reset on restart and don't share across instances —
   fine for one Vercel instance, must move to Upstash Redis on Day 14 before
   any scale-out.
2. **`x-forwarded-for` trust** in `clientIp()` is best-effort keying only; on
   Vercel the platform sets the header. Not a security boundary.
3. **Next.js 15/16 migration** deferred — 14.2.35 is the newest 14.x, but future
   advisories may only be patched on newer majors.
4. **Admin bootstrap** via `ADMIN_EMAILS` env — whoever controls Vercel env vars
   controls adminship (expected; document the first admin, then manage via
   `/admin` with audit-logged grants).

## Incident history

- 2026-10-05 (Day 13): next-auth upgraded beta.29 → beta.32 (4 advisories);
  CSP finalized; webhook rate-limited; OG renderer input sanitized; Sentry
  wired (dormant); `npm test` security audit added (52 checks, all green).
