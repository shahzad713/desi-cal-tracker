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

## ✅ Day 4 — Entry history + edit + portion adjust (2026-09-26)

- [x] New protected `/history` page with date navigation: prev/next/today buttons, jump-to-date picker, `?date=YYYY-MM-DD` URL state; invalid or future dates fall back to today
- [x] `getEntriesForDate(dateStr)` — strict zod date validation (real calendar date, no future), entries scoped by session userId, day totals card
- [x] `updateEntry(id, input)` — full edit dialog (dish name, Urdu name, portion, calories + macros); ownership enforced via `updateMany({id, userId})`; edited values become the new portion base
- [x] `setPortionScale(id, scale)` — portion adjust (¼ / ½ / ¾ / 1 / 1¼ / 1½ / 2×) with drift-free math: values always `round(base * scale)`; base columns locked in the WHERE clause (optimistic lock); new schema fields `portionScale`, `baseCalories/Protein/Carbs/Fat` + migration with backfill
- [x] Shared `EntryCard` component: thumbnail, ×N scale badge, portion select, edit dialog, delete with confirm; `saveEntry`/`deleteEntry` now revalidate both `/dashboard` and `/history`
- [x] SECURITY: middleware matcher extended to `/history/:path*`; edit/scale/delete verify ownership server-side (forged ids touch nothing); all inputs zod-validated; portion scale restricted to a fixed allowlist (no arbitrary multipliers)
- [x] Smoke-tested: scale math verified drift-free across repeated adjustments (650 → 2×/0.5×/1.5×/… → exactly 650); `npm run build` green

## ✅ Day 5 — Weekly charts + macro breakdown (2026-09-27)

- [x] New protected `/charts` page (middleware matcher extended) with 7/14/30-day range selector (`?range=`, invalid values fall back to 7)
- [x] `getNutritionSeries(days)` server action — per-day calories + macro totals, full seeded series (zero-filled days, charts always render)
- [x] `lib/nutrition.ts` — `CHART_RANGES` allowlist + `DayStats` type in a plain module ("use server" files can't export non-functions)
- [x] Charts (`app/charts/Charts.tsx`, recharts client components): daily calorie bar chart w/ 2,000 kcal target reference line; macro donut (calorie-equivalent protein/carbs/fat split, 4-4-9); stacked macro-grams bars per day
- [x] Summary cards: total kcal, avg/day, avg protein, busiest day; friendly empty state when nothing logged
- [x] Nav "Charts" link; footer updated
- [x] SECURITY: range restricted to a fixed [7,14,30] allowlist (action throws otherwise); every aggregation scoped by session `userId`; middleware auth on `/charts`
- [x] Smoke-tested: anon `/charts` (and `?range=999`) → 307 to /login; `npm run build` green

## ✅ Day 6 — Goals: daily target, weight goal, streaks (2026-09-28)

- [x] Prisma: `User.dailyCalorieTarget` (default 2000), `currentWeight`, `targetWeight` (kg, nullable) + migration `goals`
- [x] `lib/goals.ts` — pure module: calorie/weight bounds, `computeStreaks(dayKeys, todayKey)` (current = run ending today or yesterday; best = longest run), `remainingCalories()`
- [x] New protected `/goals` page (middleware matcher extended): today-vs-target card with progress bar (over-budget warning), 🔥 current streak / 🏆 best streak / ⚖️ weight-goal cards, edit form (GoalsForm client component)
- [x] `updateGoals` action — zod-bounded (800–10,000 kcal; 20–600 kg), rate-limited 10/10min per user, updates ONLY the caller's own User row
- [x] `getGoalStats` action — user-scoped; streaks derived from the user's own entry history (zero entries → 0/0, charts-friendly)
- [x] Dashboard: streak + personal-target chip linking to /goals; calorie bar now uses the user's personal target (default 2,000); "set on Goals page" note
- [x] Nav "Goals" link; footer updated
- [x] SECURITY: `/goals` behind edge middleware auth; all stats/updates scoped by session userId; zod validation on every input; settings rate-limited
- [x] Smoke-tested: anon `/goals` → 307 to /login; signed-in `/goals` → 200 renders all cards; streak math unit-checked (alive-via-yesterday, gap-breaks, best-run)
- [x] `npm run build` green

## ✅ Day 7 — Desi food database: 209 dishes, search, one-tap logging (2026-09-29)

- [x] `prisma/dishes-data.ts` — 209 desi dishes across 12 categories (Breads 19, Rice & Biryani 19, Dals & Legumes 15, Chicken Curries 14, Meat Curries 21, Vegetables & Paneer 17, Kebabs & Grills 19, Breakfast 14, Snacks & Street Food 24, Desserts & Sweets 22, Drinks & Beverages 13, Dahi/Raita/Sides 12); every dish has an Urdu name, per-serving calories + macros, serving size. Data validated: no dupes, all categories in allowlist, no missing Urdu names
- [x] Prisma: `Dish.category` (String, indexed) + migration `dish_category`; seed upserts all 209 (idempotent)
- [x] `lib/dishes.ts` — `DISH_CATEGORIES` allowlist + `MAX_DISH_RESULTS` (60) in a plain module
- [x] New protected `/dishes` page (middleware matcher extended): server-rendered search (GET form, English + Urdu `?q=`), category filter (`?category=`), results grid; invalid input falls back to browse-all — never a broken page
- [x] `DishCard` client component: kcal, macro split, serving size, Urdu name, category badge, **+ Log** button → `logDish` server action (one-tap manual add, no photo needed)
- [x] `searchDishes` / `logDish` actions — zod-validated (q ≤100 chars, category must be in allowlist, dishId cuid); rate-limited (60 searches/min, 120 logs/hr per user); `logDish` looks the dish up server-side so nutrition values can't be tampered with; entries always written to the caller's own userId
- [x] Track page links to the database ("No photo? Pick from the 209-dish database →"); nav "Dishes" link; footer updated
- [x] SECURITY: `/dishes` behind edge middleware auth (anon → 307 to /login); Dish table is shared reference data (no userId scoping needed); all inputs zod-validated; per-user rate limits; no client-supplied nutrition values
- [x] Smoke-tested: anon `/dishes` (+ `?q=`) → 307; signed-in renders 200 with 60 cards; `?q=biryani` → 7 hits; Urdu `?q=کڑاہی` → 4 karahi hits; category filter → 22 desserts; invalid category → graceful browse-all fallback
- [x] `npm run build` green

## ✅ Day 8 — PWA: installable + mobile camera capture (2026-09-30)

- [x] `public/manifest.json` — full installable manifest (standalone display, orange theme color, `/dashboard` start_url, 192/512 + maskable icons, health/food categories)
- [x] `public/icons/` — hand-built PWA icons (icon-192/512, maskable-512, apple-touch-icon-180) via `scripts/make-icons.py` (PIL)
- [x] `public/sw.js` — hand-rolled service worker: cache-first for hashed static assets; network-first for navigations with 5s timeout + offline fallback; **never** caches POSTs (server actions/logins) or cross-origin — no user data served stale or leakable
- [x] `/offline` page (public, precached by SW) with friendly retry UI
- [x] `app/pwa-boot.tsx` — registers SW in production only (dev stays uncached), captures `beforeinstallprompt` → dismissible "Install Desi Cal AI" banner
- [x] Layout: `manifest` link, `themeColor` + `viewportFit=cover` viewport, apple-touch icon; mobile bottom tab bar (Today / Track / Dishes / Charts / Goals) with safe-area padding; top nav text links hidden on mobile to reduce crowding
- [x] Track page: **"Take a photo"** button with `capture="environment"` opens the rear camera directly on mobile; separate **"Gallery"** button for the file picker; bigger touch targets, `active:scale` feedback
- [x] SECURITY: offline page + manifest + SW assets all public and user-agnostic (nothing user-scoped in cache); auth-gated routes still 307 to /login; no secrets in client bundle; SW scope `self.location.origin` only
- [x] Smoke-tested: `/manifest.json` 200 JSON, `/sw.js` 200 JS, `/offline` 200 (no auth bounce), `/track` still 307 for anon; `npm run build` green

## ⏳ Day 9 — Marketing landing v2 + waitlist

## ⏳ Day 10 — Stripe subscriptions (Pro = unlimited scans)

## ⏳ Day 11 — Shareable daily-summary image

## ⏳ Day 12 — Admin panel

## ⏳ Day 13 — Performance / SEO / Sentry polish

## ⏳ Day 14 — Vercel deploy + Postgres (Neon)

## ⏳ Day 15 — Launch kit + final QA
