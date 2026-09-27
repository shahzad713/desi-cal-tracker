import Link from "next/link";
import { getNutritionSeries } from "@/lib/actions";
import { CHART_RANGES, type DayStats } from "@/lib/nutrition";
import { CaloriesChart, MacroDonut, MacroStackChart } from "./Charts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Charts — Desi Cal AI",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="text-2xl font-extrabold text-orange-600">
        {value}
        {unit && (
          <span className="text-sm font-medium text-gray-400"> {unit}</span>
        )}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  );
}

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = (
    CHART_RANGES as readonly number[]
  ).includes(Number(searchParams.range))
    ? (Number(searchParams.range) as 7 | 14 | 30)
    : 7;

  const series: DayStats[] = await getNutritionSeries(range);

  const logged = series.filter((d) => d.entries > 0);
  const totalCalories = series.reduce((t, d) => t + d.calories, 0);
  const avgPerDay = Math.round(totalCalories / range);
  const avgProtein =
    Math.round((series.reduce((t, d) => t + d.protein, 0) / range) * 10) / 10;
  const busiest =
    logged.length > 0
      ? logged.reduce((a, b) => (b.entries > a.entries ? b : a))
      : null;

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">📈 Trends</h1>
          <p className="mt-1 text-sm text-gray-600">
            Calories and macros over the last {range} days.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
          {CHART_RANGES.map((r) => (
            <Link
              key={r}
              href={`/charts?range=${r}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                r === range
                  ? "bg-orange-600 text-white"
                  : "text-gray-600 hover:bg-orange-50"
              }`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      {logged.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-white/60 p-10 text-center">
          <div className="text-4xl">📊</div>
          <p className="mt-3 font-semibold text-gray-700">
            Nothing logged in the last {range} days
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Track a few meals and your trends will appear here.
          </p>
          <Link
            href="/track"
            className="mt-4 inline-block rounded-full bg-orange-600 px-6 py-2 font-semibold text-white hover:bg-orange-700"
          >
            Track a meal
          </Link>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={totalCalories.toLocaleString()} unit="kcal" />
        <Stat label="Avg / day" value={avgPerDay.toLocaleString()} unit="kcal" />
        <Stat label="Avg protein" value={String(avgProtein)} unit="g/day" />
        <Stat
          label="Busiest day"
          value={busiest ? busiest.label : "—"}
          unit={busiest ? `${busiest.entries} meals` : undefined}
        />
      </div>

      {/* Daily calories */}
      <div className="mt-6">
        <Card title="Daily calories">
          <CaloriesChart data={series} />
        </Card>
      </div>

      {/* Macro split + stacked macros */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Where calories came from (${range} days)`}>
          <MacroDonut data={series} />
        </Card>
        <Card title="Macros per day (grams)">
          <MacroStackChart data={series} />
        </Card>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Charts are computed from your own logged entries only. Personal daily
        targets arrive on Day 6 — charts will overlay them then.
      </p>
    </div>
  );
}
