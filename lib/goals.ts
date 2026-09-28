// Day 6: goal constants + pure streak math (plain module — NOT server actions).
// Kept pure + dependency-free so the logic is trivially testable.

/** Bounds for the user's own daily calorie budget. */
export const CALORIE_TARGET_MIN = 800;
export const CALORIE_TARGET_MAX = 10000;

/** Bounds for body weight in kilograms (sanity limits, not medical advice). */
export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 600;

/** Display fallback when a user never set a weight goal. */
export const NO_WEIGHT_SET = "Not set yet";

export interface Streaks {
  /** Consecutive logged days ending today (or yesterday if nothing logged today). */
  current: number;
  /** Longest logged-day run in the account's history. */
  best: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toMidnight(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Compute current + best streaks from a list of YYYY-MM-DD day keys that had
 * at least one food entry. Duplicates are fine (deduped internally).
 *
 * A "streak" counts consecutive calendar days; a gap of one day breaks it.
 * If nothing is logged today, the streak may still be alive via yesterday.
 */
export function computeStreaks(dayKeys: string[], todayKey: string): Streaks {
  const unique = Array.from(new Set(dayKeys)).filter(
    (k) => /^\d{4}-\d{2}-\d{2}$/.test(k)
  );
  if (unique.length === 0) return { current: 0, best: 0 };

  const logged = new Set(unique.map(toMidnight));
  const today = toMidnight(todayKey);

  // Current streak: start from today if logged, else from yesterday.
  let cursor = today;
  if (!logged.has(cursor)) cursor = today - ONE_DAY_MS;
  let current = 0;
  while (logged.has(cursor)) {
    current += 1;
    cursor -= ONE_DAY_MS;
  }

  // Best streak: longest run of consecutive midnights.
  const sorted = unique.map(toMidnight).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -1;
  for (const t of sorted) {
    run = t === prev + ONE_DAY_MS ? run + 1 : 1;
    if (run > best) best = run;
    prev = t;
  }

  return { current, best };
}

/**
 * Remaining kcal against a calorie target. Positive = under budget,
 * negative = over. `null` when nothing was logged yet today.
 */
export function remainingCalories(
  target: number,
  logged: number
): { remaining: number; pct: number; over: boolean } {
  const remaining = target - logged;
  const pct = Math.min(100, Math.max(0, Math.round((logged / target) * 100)));
  return { remaining, pct, over: remaining < 0 };
}
