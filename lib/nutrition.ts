// Plain module (NOT server actions) — constants shared by the charts UI
// and the server actions that serve it.

/** Range options for the charts page. Restricted to a fixed allowlist. */
export const CHART_RANGES = [7, 14, 30] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** Per-day totals used by the charts page. */
export interface DayStats {
  date: string; // YYYY-MM-DD (local)
  label: string; // short weekday label, e.g. "Mon"
  entries: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
