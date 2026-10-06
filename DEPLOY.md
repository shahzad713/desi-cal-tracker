# Desi Cal AI — Production Deploy Runbook (Day 14)

One-time setup: **Neon Postgres** (database) + **Vercel** (hosting). ~15–20 minutes.
The code is fully deploy-ready; only the accounts + env vars below need you.

## 1. Neon — create the database (free tier is enough)

1. Go to https://neon.tech → sign up (GitHub login is fastest).
2. **Create project**: name `desi-cal-ai`, region **`ap-southeast-1 (Singapore)`**
   (closest to Pakistan → lowest latency).
3. Open the project → **Connection Details**. Copy two strings:
   - ✅ **Pooled** connection string → this is `DATABASE_URL`
   - ✅ **Direct** connection string → this is `DIRECT_URL`
   (Toggle the "Pooled connection" switch to see both. Keep `?sslmode=require`.)

## 2. Sync the schema + seed the 209 dishes (one time, from your laptop OR this server)

```bash
cd ~/workspace/desi-cal-tracker   # wherever the repo is
# put the two Neon strings into .env (copy .env.example first)
npx prisma db push                # creates all tables on Neon (source of truth)
npx prisma db seed                # seeds the 209-dish database
```

`prisma db push` is the deploy strategy — the old SQLite migration history is
archived at `prisma/migrations.sqlite-archive/` and is NOT used in production.

## 3. Vercel — connect + deploy

1. Go to https://vercel.com → sign up (Continue with GitHub).
2. **Add New → Project → Import** `shahzad713/desi-cal-tracker`.
3. Framework preset: **Next.js** (auto-detected). Leave build settings default —
   `postinstall: prisma generate` in package.json handles the Prisma client.
4. **Environment Variables** — add these (Production + Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** string (from step 1) |
| `DIRECT_URL` | Neon **direct** string (from step 1) |
| `AUTH_SECRET` | fresh secret: run `openssl rand -base64 32` locally, paste output |
| `AUTH_URL` | `https://<your-app>.vercel.app` (no trailing slash) |
| `GEMINI_API_KEY` | your Gemini key (or leave unset → app runs in demo mode) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` if `GEMINI_API_KEY` is set, else `true` |
| `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` |
| `ADMIN_EMAILS` | your email (makes you admin; comma-separated if more) |
| Stripe trio (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`) | **skip for now** — deploys fine without; `/billing` shows "not configured", checkout/webhook fail closed |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional — app runs dormant without them |

5. **Deploy.** First build takes ~2–3 min.

## 4. Smoke test (2 min, in the browser)

- [ ] `https://<your-app>.vercel.app` → landing renders (200)
- [ ] `/track` while logged out → bounces to `/login`
- [ ] Sign up → log in → `/track` → upload a food photo → analysis result renders
- [ ] `/billing` → shows plan card (graceful "not configured" if Stripe skipped)
- [ ] `/admin` → visible only for `ADMIN_EMAILS` (others redirect home)

## 5. Two follow-ups (can wait until Day 15 / when keys arrive)

- **Google login**: Google Cloud Console → APIs & Services → Credentials → your
  OAuth client → add Authorized redirect URI:
  `https://<your-app>.vercel.app/api/auth/callback/google`
  (Email/password login works without this.)
- **Stripe** (when test keys arrive): Stripe dashboard (test mode) →
  Developers → Webhooks → Add endpoint:
  `https://<your-app>.vercel.app/api/stripe/webhook`, listen to
  `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted` →
  paste the signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel → redeploy.

## Notes

- Rate limits are in-memory per server instance (documented residual risk,
  Day 13): on Vercel's multi-instance production each instance keeps its own
  bucket. Fine for launch; Redis comes later if abuse appears.
- Uploads live under `public/uploads/` — on Vercel this is **ephemeral**
  (wiped on redeploy). Acceptable for launch; Day-15+ moves uploads to
  Vercel Blob / S3 if needed.
- Never commit `.env`. All secrets live in the Vercel dashboard only.
