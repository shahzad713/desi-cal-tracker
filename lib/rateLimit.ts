// Minimal in-memory token-bucket rate limiter for auth / sensitive endpoints.
// SECURITY: prevents credential-stuffing and signup-spam abuse. Resets on
// process restart — acceptable for now; Day 14 moves this to Redis/Upstash.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Day 13: hard cap on tracked keys. An unbounded Map is a memory-exhaustion
// vector (an attacker cycling IPs/X-Forwarded-For could grow it forever).
// When the cap is hit, the OLDEST key is evicted (Map preserves insertion
// order) — worst case, an evicted legitimate key gets a fresh bucket, which
// fails OPEN only for that key's counter, never for auth itself.
const MAX_BUCKETS = 10_000;

function evictIfNeeded() {
  if (buckets.size < MAX_BUCKETS) return;
  const oldest = buckets.keys().next();
  if (!oldest.done) buckets.delete(oldest.value);
}

/**
 * Returns true if the call is allowed, false if the key is over its limit.
 * @param key e.g. `login:1.2.3.4`
 * @param maxAttempts max calls per window
 * @param windowMs sliding window in ms
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    evictIfNeeded();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxAttempts) return false;

  bucket.count += 1;
  return true;
}

/** Extract the real client IP behind proxies (best-effort, for keying only). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
