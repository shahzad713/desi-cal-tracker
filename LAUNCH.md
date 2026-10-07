# Desi Cal AI — Launch Kit (Day 15)

**Status:** Code is launch-ready — `npm run build` green, 53/53 security checks green.
Go-live is blocked on the owner taps in `DEPLOY.md` (Vercel account connect +
Neon project, ~15–20 min). The moment steps 1–3 of DEPLOY.md are done, run the
smoke-test checklist and flip the launch announcement.

## What shipped in 15 days

1. **Next.js 14 + TypeScript + Tailwind + Prisma** app, Postgres-ready (Neon)
2. **AI photo scans** — Gemini vision photo → dish name (English + Urdu) + calories + macros, demo-mode fallback
3. **Auth** — Auth.js (email/password + Google OAuth), every private page + API route protected
4. **History** — edit entries, drift-free portion adjust (¼×–2×)
5. **Charts** — weekly calories + macro breakdown (recharts)
6. **Goals** — daily calorie target, weight goal, 🔥 streaks
7. **209-dish desi food database** — English + Urdu search, one-tap manual logging
8. **PWA** — installable, offline page, mobile camera capture, bottom tab bar
9. **Marketing landing v2** — hero, product tour, FAQ, waitlist signup
10. **Stripe subscriptions** — Pro = unlimited AI scans (test mode; wire real keys pre-launch)
11. **Sharing** — shareable daily-summary image links + referrals
12. **Admin panel** — users, entries, stats, audit-logged role management
13. **Security audit** — 53 automated checks green, CSP/HSTS, rate limits, `SECURITY.md`
14. **Deploy prep** — Neon Postgres switch, Vercel build config, `DEPLOY.md` runbook

## Launch checklist (post-DEPLOY steps 1–3)

- [ ] Smoke-test checklist in DEPLOY.md all green on the production URL
- [ ] Google OAuth production callback URL registered
- [ ] Stripe real keys wired + `/api/stripe/webhook` registered (payments currently test-mode, fail closed)
- [ ] Sentry DSNs added (error tracking dormant until then)
- [ ] Waitlist email blast: "we're live" to every signup in `WaitlistSignup`
- [ ] Post launch copy below to Product Hunt / X / LinkedIn (texts in copy-paste blocks)
- [ ] Pin the launch post on X; add launch link to link-in-bio

---

## Product Hunt copy

**Tagline (≤60 chars):** Snap your desi food, get calories + macros instantly

**Description:**
Every calorie tracker knows pizza and salads. None of them know what's on a
Pakistani or Indian plate.

Desi Cal AI fixes that. Snap a photo of biryani, nihari, daal, parathas —
AI identifies the dish (English + Urdu) and estimates calories + macros in
seconds. Or pick from a database of 209 desi dishes, log portions in one tap,
and track your daily target, streaks, and weekly charts.

Built in public over 15 days: Next.js 14, TypeScript, Prisma, Gemini vision,
Stripe. Free beta — Pro unlocks unlimited AI scans.

**Topics:** Health & Fitness, Artificial Intelligence, Food & Drink
**First comment (maker):** Hey Product Hunt! I'm Shahzad, a frontend dev from
Pakistan. For years I watched every calorie app fail at one thing: desi food.
So I built Desi Cal AI — photo → dish → calories + macros — in 15 days, live
on this thread. Try it, break it, tell me what dish it gets wrong. 🍛

## X launch copy

**Main launch post:**
🚀 LAUNCH DAY. 15 days ago Desi Cal AI was zero lines of code.

Today: snap your biryani, get calories + macros in seconds. 209 desi dishes.
Photo AI + streaks + charts + Urdu dish names.

Free beta is live 🍛

**Follow-up thread:**
2/ Why? Every calorie tracker knows pizza. None of them know nihari. So I
taught an AI to read desi plates instead. 📸

3/ How it works: photo → Gemini vision → dish + calories + macros → your daily
dashboard. No photo? Pick from the 209-dish database, one tap.

4/ Built in public for 15 days — Next.js 14, TypeScript, Prisma, Stripe,
security-first (53 automated security checks, every single day). Full build
log on GitHub.

5/ It's live and FREE in beta. Try it with tonight's dinner and tell me what
it gets wrong — desi food is hard, and I want every correction. 🍛

**Reply-to-launch pin:** Desi Cal AI is LIVE 🍛 — snap your food, get calories
+ macros. Free beta. Try it tonight 👇

## LinkedIn launch copy

**Post:**
After 15 days of building in public, Desi Cal AI is live. 🚀

The problem: every calorie tracker understands pizza and salads. None of them
understand a Pakistani or Indian plate. So I built one that does.

📸 Snap a photo of your food → AI identifies the dish (English + Urdu) and
estimates calories + macros in seconds
🍛 209-dish desi nutrition database with one-tap manual logging
📊 Daily targets, streaks, weekly charts, shareable summaries
🔒 Security-first build: Auth.js, ownership-scoped queries, rate limits, CSP,
53 automated security checks — every single day

Built with Next.js 14, TypeScript, Prisma, Gemini vision, and Stripe. Free
beta, Pro unlocks unlimited AI scans.

This started as a portfolio project and turned into something I genuinely
want to keep shipping. Try it with tonight's dinner — and tell me which dish
it gets wrong. Desi food is hard for AI, and every correction makes it better.

#BuildInPublic #AI #HealthTech #Startup #Nextjs #FoodTech
