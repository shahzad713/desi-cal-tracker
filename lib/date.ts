// Small date helpers for the history page (plain module — NOT server actions).

/** Today's date as YYYY-MM-DD in the server's local timezone. */
export function todayParam(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}
