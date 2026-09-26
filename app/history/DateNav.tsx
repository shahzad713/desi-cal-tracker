"use client";

import { useRouter } from "next/navigation";

function shiftDay(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

const btn =
  "rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-white";

/** Day-by-day navigation: prev / today / next / jump-to-date. */
export default function DateNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`/history?date=${d}`);
  const isToday = date === today;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => go(shiftDay(date, -1))} aria-label="Previous day">
        ← Prev
      </button>
      <button
        className={btn}
        onClick={() => go(today)}
        disabled={isToday}
        aria-label="Go to today"
      >
        Today
      </button>
      <button
        className={btn}
        onClick={() => go(shiftDay(date, 1))}
        disabled={isToday}
        aria-label="Next day"
      >
        Next →
      </button>
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => {
          if (e.target.value) go(e.target.value);
        }}
        aria-label="Pick a date"
        className="rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
      />
    </div>
  );
}
