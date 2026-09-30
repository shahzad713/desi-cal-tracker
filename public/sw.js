// Day 8 — PWA service worker.
// Strategy:
// - Precached app shell (offline page + icons + manifest) — cache-first.
// - Same-origin static assets (_next/static, /icons, /fonts) — cache-first,
//   versioned by CACHE_NAME.
// - Navigations (HTML) — network-first with 5s timeout, offline fallback to
//   /offline so the app never shows a browser error page.
// - API / server-action POSTs and everything else — network-only, never
//   cached (user data must never be served stale, and must never be readable
//   from the cache by another session on a shared device).

const CACHE_NAME = "desi-cal-ai-shell-v1";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("desi-cal-ai-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache POSTs (server actions, logins)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for hashed static assets.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // Network-first for navigations with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await Promise.race([
            fetch(request),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("nav-timeout")), 5000)
            ),
          ]);
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? Response.error();
        }
      })()
    );
    return;
  }
});
