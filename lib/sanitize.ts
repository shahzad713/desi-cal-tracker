// Day 13 — text sanitization for contexts where a string becomes markup.
//
// Used by the /api/share/[token]/og route (next/og → satori → SVG). Values
// rendered there are user-controlled (dish names typed by the user or
// produced by the Gemini vision model). Satori serializes JSX to SVG, and
// upstream Satori versions have had markup-injection flaws
// (GHSA-wx4j-mvgx-mqwp / CVE-2026-94545 — the RCE itself only affects
// Next.js 16.x, but the injection primitive is worth closing everywhere).
// This helper makes every dynamic string inert BEFORE it reaches the
// renderer: entities escaped, control characters stripped, length capped.

const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const MAX_SANITIZED_LENGTH = 120;

/**
 * Make an arbitrary string safe to embed in generated markup (SVG/HTML).
 * - strips C0/C1 control characters (except tab/newline, which satori
 *   tolerates and which users legitimately have in dish names — no)
 * - escapes the five XML-significant characters
 * - truncates to MAX_SANITIZED_LENGTH with an ellipsis
 */
export function sanitizeForMarkup(input: unknown): string {
  if (typeof input !== "string") return "";
  // Strip control chars (keep printable text + spaces only).
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  const escaped = cleaned.replace(
    /[&<>"']/g,
    (ch) => XML_ENTITIES[ch] ?? ch
  );
  const trimmed = escaped.trim();
  if (trimmed.length <= MAX_SANITIZED_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_SANITIZED_LENGTH - 1) + "…";
}

/**
 * Coerce an unknown numeric value to a safe non-negative integer for
 * display. Rejects NaN/Infinity/negatives — snapshot payloads are
 * re-validated on read, but the OG renderer should never trust a number
 * blindly either.
 */
export function sanitizeCount(input: unknown): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(Math.min(n, 999_999));
}
