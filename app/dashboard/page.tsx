import Link from "next/link";
import Image from "next/image";
import { getTodayEntries } from "@/lib/actions";
import DeleteButton from "./DeleteButton";

// Always render fresh — entries are added throughout the day.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today's log — Desi Cal AI",
};

// Soft daily targets used to scale the bars (personalised targets land Day 6).
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

export default async function DashboardPage() {
  const entries = await getTodayEntries();
  const totals = entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">📊 Today&apos;s log</h1>
      <p className="mt-1 text-sm text-gray-600">
        {new Date().toLocaleDateString("en-PK", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      {/* Totals card */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Totals</h2>
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
          Bars scaled to default targets (2,000 kcal) — personal targets arrive Day 6.
        </p>
      </div>

      {/* Entries list */}
      <div className="mt-6 space-y-3">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-orange-200 bg-white/60 p-10 text-center">
            <div className="text-4xl">🍽️</div>
            <p className="mt-3 font-semibold text-gray-700">No meals logged yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Snap your first plate and it will show up here.
            </p>
            <Link
              href="/track"
              className="mt-4 inline-block rounded-full bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700"
            >
              Track a meal
            </Link>
          </div>
        )}

        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
          >
            {e.imagePath ? (
              <Image
                src={e.imagePath}
                alt={e.dishName}
                width={72}
                height={72}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                🍛
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{e.dishName}</div>
              <div className="text-xs text-gray-500">
                {e.portion} ·{" "}
                {new Date(e.createdAt).toLocaleTimeString("en-PK", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                P {Math.round(e.protein)}g · C {Math.round(e.carbs)}g · F{" "}
                {Math.round(e.fat)}g
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-orange-600">{e.calories}</div>
              <div className="text-[10px] uppercase text-gray-400">kcal</div>
              <DeleteButton id={e.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
