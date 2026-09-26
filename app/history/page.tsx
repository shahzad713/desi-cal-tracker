import Link from "next/link";
import { getEntriesForDate } from "@/lib/actions";
import { todayParam } from "@/lib/date";
import DateNav from "./DateNav";
import EntryCard from "./EntryCard";

// Always render fresh — entries are edited/deleted throughout the day.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "History — Desi Cal AI",
};

const TARGETS = { calories: 2000, protein: 120, carbs: 250, fat: 65 };

function Bar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-gray-500">
          {Math.round(value)}
          {unit} <span className="text-gray-400">/ {target}{unit}</span>
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function prettyDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const today = todayParam();
  // Invalid or future dates fall back to today (getEntriesForDate throws).
  let date = typeof searchParams.date === "string" ? searchParams.date : today;
  let entries;
  try {
    entries = await getEntriesForDate(date);
  } catch {
    date = today;
    entries = await getEntriesForDate(today);
  }

  const totals = entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const isToday = date === today;

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">📜 History</h1>
      <p className="mt-1 text-sm text-gray-600">{prettyDay(date)}</p>

      <DateNav date={date} today={today} />

      {/* Day totals */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            {isToday ? "Today's totals" : "Day totals"}
          </h2>
          <div className="text-3xl font-extrabold text-orange-600">
            {totals.calories}
            <span className="text-sm font-medium text-gray-400"> kcal</span>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Bar label="Protein" value={totals.protein} target={TARGETS.protein} unit="g" color="bg-emerald-500" />
          <Bar label="Carbs" value={totals.carbs} target={TARGETS.carbs} unit="g" color="bg-amber-500" />
          <Bar label="Fat" value={totals.fat} target={TARGETS.fat} unit="g" color="bg-rose-500" />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          {entries.length === 1 ? "1 meal" : `${entries.length} meals`} logged this
          day · bars scaled to default targets (2,000 kcal)
        </p>
      </div>

      {/* Entries */}
      <div className="mt-6 space-y-3">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 p-10 text-center">
            <div className="text-4xl">🍽️</div>
            <p className="mt-3 font-semibold text-gray-700">No meals this day</p>
            <p className="mt-1 text-sm text-gray-500">
              {isToday
                ? "Snap your first plate and it will show up here."
                : "Pick another day, or log a meal today."}
            </p>
            {isToday && (
              <Link
                href="/track"
                className="mt-4 inline-block rounded-full bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700"
              >
                Track a meal
              </Link>
            )}
          </div>
        )}
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
