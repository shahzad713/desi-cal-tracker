# Desi Cal AI — 15-day build progress

**Goal:** working AI calorie tracker for desi food, live in 15 days.

## ✅ Day 1 — Foundation (2026-09-24)

- [x] Next.js 14 + TypeScript + Tailwind + ESLint scaffold
- [x] Prisma schema: `User`, `FoodEntry`, `Dish` (SQLite dev, Postgres-compatible)
- [x] `lib/analyzeFood.ts` — demo mode with 8 rotating realistic desi-dish samples; one-function Gemini swap documented
- [x] `lib/actions.ts` — server actions: `analyzePhoto`, `saveEntry`, `deleteEntry`, `getTodayEntries`
- [x] `lib/db.ts` — Prisma singleton
- [x] Pages: `/` landing (hero, 3-step how-it-works, CTA), `/track` (upload + preview + analyze + result card + save), `/dashboard` (today's entries, totals, macro bars, delete)
- [x] Uploads stored under `public/uploads/` (gitignored)
- [x] Seed script: 10 common desi dishes (`npx prisma db seed`)
- [x] README, `.env.example`, `.gitignore`, `npm run build` green
- [x] Initial commit

## ✅ Day 2 — Auth.js + protected routes (2026-09-24)

- [x] Auth.js v5: Credentials (email/password, bcrypt cost 12) + Google OAuth providers
- [x] JWT sessions signed with `AUTH_SECRET` (edge-middleware compatible; Prisma can't run on edge)
- [x] Prisma schema: `Account`, `Session`, `VerificationToken` models + `passwordHash` on `User` (migration `auth`)
- [x] Edge middleware: `/track`, `/dashboard`, `/profile` require sign-in → bounce to `/login`
- [x] Pages: `/login` (credentials + Google), `/signup` (zod-validated, rate-limited), `/profile` (stats + sign-out)
- [x] Session-aware nav (account chip + sign-out when signed in)
- [x] SECURITY: every `FoodEntry` query scoped by session `userId`; `deleteEntry` uses `deleteMany({id, userId})` (forged ids delete nothing)
- [x] SECURITY: zod validation on all actions; upload imagePath must match `/uploads/<uuid>.<ext>`
- [x] SECURITY: upload magic-byte check (JPEG/PNG/WebP) + MIME allowlist; extension derived from validated MIME, never client filename
- [x] SECURITY: no info leak on bad login (same error for wrong email/password); signup won't confirm registered emails
- [x] SECURITY: rate limits — login 10/10min/IP, signup 5/hour/IP (`lib/rateLimit.ts`)
- [x] SECURITY: headers — X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS (`next.config.mjs`)
- [x] Smoke-tested: anon → 307 to /login; wrong password → generic error; correct password → 200 on protected pages; session carries user.id
- [x] `npm run build` green

## ⏳ Day 3 — Real Gemini vision integration (2026-09-25)

- [x] `@google/generative-ai` SDK installed
- [x] `lib/analyzeFood.ts` rewritten: real mode calls Gemini 2.0 Flash vision with a strict JSON prompt (`responseMimeType: application/json`); model output validated with zod (coerced + bounded — untrusted input treated like any other)
- [x] Graceful demo fallback: forced by `NEXT_PUBLIC_DEMO_MODE=true`, missing `GEMINI_API_KEY`, rate-limit/outage/timeout/bad response — app never breaks, warning logged server-side (no secrets, no images in logs)
- [x] One retry on 429/5xx with backoff; 45s request timeout race; data-URL MIME re-validated server-side (defense in depth)
- [x] `AnalyzeResult.mode` ("demo" | "gemini") flows to UI; TrackForm shows honest "Analyzed by Gemini AI ✨" vs "Demo mode" label
- [x] SECURITY: scan endpoint rate-limited — 20 scans/hour per user + 60/hour per IP (`lib/rateLimit.ts`, no cost blowout)
- [x] SECURITY: `GEMINI_API_KEY` read server-side only (`lib/analyzeFood.ts`), never in client bundle (no NEXT_PUBLIC_ prefix), never in git
- [x] Smoke-tested: forced demo → demo samples; real path without key → warning + graceful demo fallback
- [x] `npm run build` green

## ⏳ Day 4 — Entry history + edit + portion adjust

## ⏳ Day 5 — Weekly charts (recharts)

## ⏳ Day 6 — Daily targets + streaks

## ⏳ Day 7 — Desi food database (200+ dishes, search, Urdu names)

## ⏳ Day 8 — PWA + mobile camera capture

## ⏳ Day 9 — Marketing landing v2 + waitlist

## ⏳ Day 10 — Stripe subscriptions (Pro = unlimited scans)

## ⏳ Day 11 — Shareable daily-summary image

## ⏳ Day 12 — Admin panel

## ⏳ Day 13 — Performance / SEO / Sentry polish

## ⏳ Day 14 — Vercel deploy + Postgres (Neon)

## ⏳ Day 15 — Launch kit + final QA
