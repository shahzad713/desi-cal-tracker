# 🍛 Desi Cal AI

An AI calorie tracker built for **desi food** — snap a photo of your plate and
get instant calorie + macro estimates for Pakistani & Indian dishes.

Generic calorie apps don't understand biryani, nihari, or haleem. Desi Cal AI does.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Prisma** — SQLite for local dev, Postgres-ready (see below)
- **Server Actions** for uploads, analysis, and the food log
- ESLint

## Setup

```bash
npm install

# 1. Database (SQLite, local dev)
npx prisma migrate dev --name init

# 2. Seed 10 common desi dishes
npx prisma db seed

# 3. Run it
npm run dev
```

Then open:

- `/` — landing page (hero, how-it-works, CTA)
- `/track` — upload a plate photo → analyze → save entry
- `/dashboard` — today's log, total calories, macro bars, delete entries

## Demo mode

`NEXT_PUBLIC_DEMO_MODE=true` (default) makes `lib/analyzeFood.ts` return
**realistic rotating sample analyses** (biryani, nihari, karahi, daal-roti…)
instead of calling a real vision API. No API key needed.

To go live with real AI (Day 3): set `NEXT_PUBLIC_DEMO_MODE=false`, add
`GEMINI_API_KEY`, and implement `analyzeWithGemini()` in `lib/analyzeFood.ts`
— it's a one-function swap, documented at the top of that file.

## Database

Dev uses SQLite (`DATABASE_URL="file:./dev.db"` in `.env`). The Prisma schema
uses only cross-compatible features, so on **Day 14** the Postgres move is:

1. Change `provider` in `prisma/schema.prisma` to `"postgresql"`
2. Point `DATABASE_URL` at the Neon connection string
3. `npx prisma migrate dev`

## Uploads

Photos are stored under `public/uploads/` (gitignored) and the path is saved
on each `FoodEntry`. Served statically by Next.js.

## Roadmap

See [PROGRESS.md](./PROGRESS.md) — 15-day build plan, Day 1 ✅ done.

## ⚠️ Build-environment notes (this server)

Two quirks were hit on Day 1 — future day-agents, read this before fighting them:

1. **Prisma engine downloads fail** through the egress proxy (`ECONNRESET` in
   both the `@prisma/engines` postinstall and the CLI's own downloader), while
   `curl` works fine. Workaround that was used:
   ```bash
   npm install --ignore-scripts --save-dev prisma@^6 @prisma/client@^6 --legacy-peer-deps
   # get the engines-version SHA:
   node -e "console.log(require('./node_modules/@prisma/engines-version').enginesVersion)"
   # download manually (correct URL pattern — no platform suffix in filename):
   SHA=<sha>; DEST=~/.cache/prisma/6.19.3/$SHA/debian-openssl-3.0.x; mkdir -p $DEST
   for bin in libquery_engine.so.node schema-engine; do
     curl -sSL --retry 5 --retry-all-errors \
       "https://binaries.prisma.sh/all_commits/$SHA/debian-openssl-3.0.x/$bin.gz" \
       -o $DEST/$bin.gz && gunzip -f $DEST/$bin.gz
   done
   # then copy into BOTH locations with platform-suffixed names:
   cp $DEST/libquery_engine.so.node node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node
   cp $DEST/schema-engine node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x
   cp $DEST/libquery_engine.so.node node_modules/prisma/libquery_engine-debian-openssl-3.0.x.so.node
   cp $DEST/schema-engine node_modules/prisma/schema-engine-debian-openssl-3.0.x
   ```
   Then `npx prisma generate` / `npx prisma migrate dev` work offline.
2. **`npm install` needs `--legacy-peer-deps`** here — stock npm 10.9.4 crashes
   with `Cannot read properties of null (reading 'edgesOut')` otherwise.
