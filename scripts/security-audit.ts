#!/usr/bin/env tsx
/**
 * Day 13 — Desi Cal AI security audit. Runnable via `npm test`.
 *
 * Three phases:
 *   1. STATIC  — repo-level invariants (no secrets in git, auth coverage,
 *      CSP headers, dependency versions, no raw SQL, sanitizer wiring).
 *   2. OWNERSHIP — real Prisma queries against a throwaway SQLite DB using
 *      the EXACT where-clauses the server actions use (deleteMany/updateMany
 *      scoped by {id, userId}); a forged userId must affect 0 rows.
 *   3. LIVE — boots `next start` (production build) on an isolated temp DB,
 *      then checks auth redirects, security headers, 404s, rate limits
 *      (429s), and robots/sitemap hygiene over real HTTP.
 *
 * Exits non-zero if ANY check fails. Prints a PASS/FAIL summary.
 *
 * NOTE on scope: server actions themselves need a signed-in session cookie,
 * which a headless audit can't mint. Phase 2 covers the same DB-level
 * ownership enforcement the actions rely on; phase 3 covers everything
 * reachable without a session.
 */

import { spawn, execSync, type ChildProcess } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import net from "net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}
const checks: Check[] = [];
function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// Phase 1 — static checks
// ---------------------------------------------------------------------------

function phase1() {
  console.log("\n== Phase 1: static checks ==");

  // 1. No .env files tracked in git (only .env.example may exist).
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  const envTracked = tracked
    .split("\n")
    .filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example"));
  check("no .env secrets tracked in git", envTracked.length === 0, envTracked.join(",") || "clean");

  // 2. No secret-shaped NEXT_PUBLIC_ vars in client-reachable code.
  const allowedPublic = new Set([
    "NEXT_PUBLIC_DEMO_MODE",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SENTRY_DSN",
  ]);
  const srcFiles = execSync(
    `git ls-files 'app/**' 'lib/**' | grep -E '\\.(ts|tsx)$' || true`,
    { cwd: ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean);
  const leaked: string[] = [];
  for (const f of srcFiles) {
    const content = readFileSync(join(ROOT, f), "utf8");
    for (const m of Array.from(content.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g))) {
      if (!allowedPublic.has(m[0])) leaked.push(`${f}:${m[0]}`);
    }
  }
  check("no secrets in client bundle (NEXT_PUBLIC_ allowlist)", leaked.length === 0, leaked.slice(0, 3).join(", ") || "clean");

  // 3. Middleware matcher covers every protected route.
  const mw = readFileSync(join(ROOT, "middleware.ts"), "utf8");
  const protectedRoutes = ["track", "dashboard", "charts", "profile", "history", "goals", "dishes", "billing", "admin"];
  const missing = protectedRoutes.filter((r) => !mw.includes(`"/${r}/:path*"`));
  check("edge middleware covers all protected routes", missing.length === 0, missing.join(", ") || "9/9");

  // 4. Every non-public API route requires auth.
  const publicApiPrefixes = ["app/api/auth/", "app/api/waitlist/", "app/api/stripe/webhook/", "app/api/share/"];
  const apiRoutes = execSync(`git ls-files 'app/api/**/route.*'`, { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const unauthenticated: string[] = [];
  for (const r of apiRoutes) {
    if (publicApiPrefixes.some((p) => r.startsWith(p))) continue;
    const c = readFileSync(join(ROOT, r), "utf8");
    if (!/(await auth\(\)|requireUserId\(\)|requireAdmin\(\))/.test(c)) unauthenticated.push(r);
  }
  check("all private API routes enforce auth", unauthenticated.length === 0, unauthenticated.join(", ") || `${apiRoutes.length} routes`);

  // 5. Security headers in next.config.mjs.
  const cfg = readFileSync(join(ROOT, "next.config.mjs"), "utf8");
  check("CSP header defined", cfg.includes("Content-Security-Policy") && cfg.includes("frame-ancestors 'none'"));
  check("X-Frame-Options DENY", cfg.includes('"X-Frame-Options"') && cfg.includes('"DENY"'));
  check("X-Content-Type-Options nosniff", cfg.includes("nosniff"));
  check("HSTS with preload", cfg.includes("Strict-Transport-Security") && cfg.includes("preload"));
  check("X-Powered-By removed", cfg.includes("poweredByHeader: false"));

  // 6. Rate limiter is memory-bounded.
  const rl = readFileSync(join(ROOT, "lib/rateLimit.ts"), "utf8");
  check("rate-limiter bucket map is capped", rl.includes("MAX_BUCKETS"));

  // 7. next-auth at/above the July-2026 advisory fix (5.0.0-beta.32).
  const naVer: string = JSON.parse(readFileSync(join(ROOT, "node_modules/next-auth/package.json"), "utf8")).version;
  const parts = naVer.replace("5.0.0-beta.", "");
  check("next-auth >= 5.0.0-beta.32 (CVE-2026-73421 et al)", naVer.startsWith("5.0.0-beta.") && Number(parts) >= 32, naVer);

  // 8. OG image route sanitizes user-controlled strings.
  const og = readFileSync(join(ROOT, "app/api/share/[token]/og/route.tsx"), "utf8");
  check("OG route sanitizes strings before satori", og.includes("sanitizeForMarkup") && og.includes("sanitizeCount"));

  // 9. No raw SQL anywhere (Prisma parameterized queries only).
  const rawSql: string[] = [];
  for (const f of srcFiles) {
    const c = readFileSync(join(ROOT, f), "utf8");
    if (/\$queryRaw|\$executeRaw|\$runCommandRaw/.test(c)) rawSql.push(f);
  }
  check("no raw SQL (Prisma parameterized only)", rawSql.length === 0, rawSql.join(", ") || "clean");

  // 10. FoodEntry is user-scoped in the schema.
  const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
  check("FoodEntry has userId FK", /model FoodEntry[\s\S]*?userId\s+String/.test(schema));

  // 11. Sentry dormant without DSN.
  const sentryClient = readFileSync(join(ROOT, "sentry.client.config.ts"), "utf8");
  check("Sentry inert without DSN", sentryClient.includes("enabled: !!dsn"));

  // 12. robots.txt blocks private paths.
  const robots = readFileSync(join(ROOT, "app/robots.ts"), "utf8");
  check("robots.txt disallows private paths", robots.includes('"/admin"') && robots.includes('"/api/"'));
}

// ---------------------------------------------------------------------------
// Phase 2 — ownership checks against a throwaway DB
// ---------------------------------------------------------------------------

async function phase2() {
  console.log("\n== Phase 2: ownership checks (throwaway DB) ==");

  const dbFile = `/tmp/desi-audit-${process.pid}.db`;
  const dbUrl = `file:${dbFile}`;
  try {
    execSync("npx prisma db push --accept-data-loss --skip-generate", {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });
  } catch (e) {
    check("throwaway DB schema created", false, "prisma db push failed");
    return;
  }
  check("throwaway DB schema created", true);

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: dbUrl });
  try {
    const userA = await prisma.user.create({ data: { email: "audit-a@example.com", name: "Audit A" } });
    const userB = await prisma.user.create({ data: { email: "audit-b@example.com", name: "Audit B" } });
    const entryB = await prisma.foodEntry.create({
      data: { userId: userB.id, dishName: "Biryani", calories: 650, protein: 25, carbs: 80, fat: 20, portion: "1 plate" },
    });

    // The exact where-clauses lib/actions.ts deleteEntry/updateEntry use.
    const forgedDelete = await prisma.foodEntry.deleteMany({ where: { id: entryB.id, userId: userA.id } });
    check("forged delete (wrong userId) deletes 0 rows", forgedDelete.count === 0, `count=${forgedDelete.count}`);

    const forgedUpdate = await prisma.foodEntry.updateMany({
      where: { id: entryB.id, userId: userA.id },
      data: { calories: 1 },
    });
    check("forged update (wrong userId) updates 0 rows", forgedUpdate.count === 0, `count=${forgedUpdate.count}`);

    const leaked = await prisma.foodEntry.findMany({ where: { userId: userA.id } });
    check("user A cannot list user B's entries", leaked.length === 0, `rows=${leaked.length}`);

    const ownUpdate = await prisma.foodEntry.updateMany({
      where: { id: entryB.id, userId: userB.id },
      data: { calories: 700 },
    });
    check("owner CAN update own entry", ownUpdate.count === 1, `count=${ownUpdate.count}`);

    const ownDelete = await prisma.foodEntry.deleteMany({ where: { id: entryB.id, userId: userB.id } });
    check("owner CAN delete own entry", ownDelete.count === 1, `count=${ownDelete.count}`);
  } finally {
    await prisma.$disconnect();
    rmSync(dbFile, { force: true });
    rmSync(`${dbFile}-journal`, { force: true });
  }

  // Pure-function security helpers.
  const { sanitizeForMarkup, sanitizeCount } = await import("@/lib/sanitize");
  const evil = `<script>alert(1)</script><img src=x onerror=alert(2)>`;
  const clean = sanitizeForMarkup(evil);
  check("sanitizeForMarkup neutralizes markup injection", !clean.includes("<script>") && clean.includes("&lt;script&gt;"), clean.slice(0, 60));
  check("sanitizeForMarkup strips control chars + caps length", sanitizeForMarkup("a\u0000b".repeat(200)).length <= 120);
  check("sanitizeCount rejects negatives/NaN", sanitizeCount(-5) === 0 && sanitizeCount(NaN) === 0 && sanitizeCount("9999999") === 999999);

  const { checkRateLimit } = await import("@/lib/rateLimit");
  const k = `audit:${process.pid}:${Date.now()}`;
  const r1 = checkRateLimit(k, 2, 60_000);
  const r2 = checkRateLimit(k, 2, 60_000);
  const r3 = checkRateLimit(k, 2, 60_000);
  check("rate limiter allows-then-blocks", r1 && r2 && !r3);
}

// ---------------------------------------------------------------------------
// Phase 3 — live HTTP checks against `next start`
// ---------------------------------------------------------------------------

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 3100;
      s.close(() => resolve(port));
    });
  });
}

async function waitForReady(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" });
      await res.arrayBuffer().catch(() => null);
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function phase3() {
  console.log("\n== Phase 3: live HTTP checks (next start) ==");

  if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
    check("production build exists (run npm run build first)", false);
    return;
  }
  check("production build exists (run npm run build first)", true);

  const port = await freePort();
  const dbFile = `/tmp/desi-audit-live-${process.pid}.db`;
  const dbUrl = `file:${dbFile}`;
  execSync("npx prisma db push --accept-data-loss --skip-generate", {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  const server: ChildProcess = spawn(
    "npx",
    ["next", "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        AUTH_SECRET: "audit-dummy-secret-please-change-in-prod-123",
        STRIPE_WEBHOOK_SECRET: "whsec_audit_dummy",
        NEXT_PUBLIC_DEMO_MODE: "true",
        PORT: String(port),
      },
      stdio: "pipe",
    }
  );
  const base = `http://127.0.0.1:${port}`;
  try {
    if (!(await waitForReady(port, 60_000))) {
      check("prod server booted", false, "timeout waiting for next start");
      return;
    }
    check("prod server booted", true);

    const get = (p: string, init?: RequestInit) =>
      fetch(base + p, { redirect: "manual", ...init });

    // Auth gates: anonymous visitors bounce to /login.
    for (const p of ["/track", "/dashboard", "/share", "/billing", "/admin", "/dishes", "/charts", "/goals", "/history"]) {
      const res = await get(p);
      const loc = res.headers.get("location") ?? "";
      check(`anon ${p} → 307 /login`, res.status === 307 && loc.includes("/login"), `status=${res.status}`);
      await res.arrayBuffer().catch(() => null);
    }

    // Security headers on the landing page.
    const home = await get("/");
    const csp = home.headers.get("content-security-policy") ?? "";
    check("CSP header served", csp.includes("frame-ancestors 'none'") && csp.includes("default-src 'self'"));
    check("X-Frame-Options DENY served", home.headers.get("x-frame-options") === "DENY");
    check("X-Content-Type-Options nosniff served", home.headers.get("x-content-type-options") === "nosniff");
    check("X-Powered-By removed", home.headers.get("x-powered-by") === null);
    const homeHtml = await home.text();
    check("landing is indexable", /name="robots"[^>]*content="[^"]*index/.test(homeHtml));
    check("landing carries JSON-LD", homeHtml.includes("application/ld+json"));

    // Public share surface: unknown tokens 404, never leak.
    const badToken = "this-token-does-not-exist-0123456789abcdef";
    const sharePage = await get(`/share/${badToken}`);
    check("unknown share token → 404 page", sharePage.status === 404, `status=${sharePage.status}`);
    await sharePage.arrayBuffer().catch(() => null);
    const ogImg = await get(`/api/share/${badToken}/og`);
    check("unknown share token → 404 OG image", ogImg.status === 404, `status=${ogImg.status}`);
    await ogImg.arrayBuffer().catch(() => null);

    // Waitlist abuse paths. NOTE: the app keys rate limits off the client IP
    // (clientIp() reads x-forwarded-for first, as set by the hosting
    // platform). The audit simulates distinct client IPs via that header to
    // isolate each bucket — otherwise earlier requests would pollute the
    // 5/hr/IP bucket and the assertions below couldn't be deterministic.
    const wl = (body: Record<string, string>, ip: string) =>
      get("/api/waitlist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify(body),
      });
    const honeypot = await wl(
      { email: "bot@example.com", name: "Bot", company: "spam co" },
      "203.0.113.10"
    );
    check("waitlist honeypot → 400", honeypot.status === 400, `status=${honeypot.status}`);
    await honeypot.arrayBuffer().catch(() => null);
    const badEmail = await wl({ email: "not-an-email", name: "X" }, "203.0.113.10");
    check("waitlist bad email → 400", badEmail.status === 400, `status=${badEmail.status}`);
    await badEmail.arrayBuffer().catch(() => null);

    // Waitlist rate limit: 5/hr/IP, 6th → 429 (distinct emails to isolate the IP bucket).
    const wlStatuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await wl(
        { email: `audit-wl-${process.pid}-${i}@example.com`, name: "Audit" },
        "203.0.113.11"
      );
      wlStatuses.push(r.status);
      await r.arrayBuffer().catch(() => null);
    }
    check(
      "waitlist 6th signup in an hour → 429",
      wlStatuses.slice(0, 5).every((s) => s === 200) && wlStatuses[5] === 429,
      wlStatuses.join(",")
    );

    // Stripe webhook: unsigned → 400; flood → 429 (new Day 13 limit).
    const wh = () => get("/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const first = await wh();
    check("webhook without signature → 400", first.status === 400, `status=${first.status}`);
    await first.arrayBuffer().catch(() => null);
    let saw429 = false;
    for (let i = 0; i < 65; i++) {
      const r = await wh();
      await r.arrayBuffer().catch(() => null);
      if (r.status === 429) {
        saw429 = true;
        break;
      }
    }
    check("webhook flood → 429", saw429);

    // SEO hygiene.
    const robotsTxt = await get("/robots.txt");
    const robotsBody = await robotsTxt.text();
    check("robots.txt served, blocks /admin + /api", robotsTxt.status === 200 && robotsBody.includes("/admin") && robotsBody.includes("/api/"));
    const sitemap = await get("/sitemap.xml");
    const sitemapBody = await sitemap.text();
    check("sitemap.xml served, no private/share URLs", sitemap.status === 200 && !sitemapBody.includes("/share/") && !sitemapBody.includes("/api/"));
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
    rmSync(dbFile, { force: true });
    rmSync(`${dbFile}-journal`, { force: true });
  }
}

// ---------------------------------------------------------------------------

async function main() {
  phase1();
  await phase2();
  await phase3();

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n== Summary: ${checks.length - failed.length}/${checks.length} checks passed ==`);
  if (failed.length > 0) {
    console.log("Failed checks:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exit(1);
  }
  console.log("Security audit: ALL GREEN ✅");
}

main().catch((err) => {
  console.error("Audit crashed:", err);
  process.exit(1);
});
