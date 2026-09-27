"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { DayStats } from "@/lib/nutrition";

const ORANGE = "#ea580c";
const MACRO_COLORS = {
  protein: "#10b981", // emerald
  carbs: "#f59e0b", // amber
  fat: "#f43f5e", // rose
};

// 4-4-9 calorie equivalents — the donut shows where calories came from.
function macroCalories(s: DayStats) {
  return {
    Protein: Math.round(s.protein * 4),
    Carbs: Math.round(s.carbs * 4),
    Fat: Math.round(s.fat * 9),
  };
}

/** Daily calorie bars with a 2,000 kcal target line. */
export function CaloriesChart({ data }: { data: DayStats[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} />
          <Tooltip
            formatter={(value) => [`${value} kcal`, "Calories"]}
            labelFormatter={(label, payload) => {
              const d = payload?.[0]?.payload as DayStats | undefined;
              return d ? `${label} · ${d.date}` : String(label);
            }}
          />
          <ReferenceLine
            y={2000}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{ value: "2,000 target", fontSize: 11, fill: "#9ca3af" }}
          />
          <Bar dataKey="calories" fill={ORANGE} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Where the period's calories came from — protein / carbs / fat split. */
export function MacroDonut({ data }: { data: DayStats[] }) {
  const totals = data.reduce(
    (t, d) => {
      const m = macroCalories(d);
      return {
        protein: t.protein + m.Protein,
        carbs: t.carbs + m.Carbs,
        fat: t.fat + m.Fat,
      };
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
  const pieData = [
    { name: "Protein", value: totals.protein, color: MACRO_COLORS.protein },
    { name: "Carbs", value: totals.carbs, color: MACRO_COLORS.carbs },
    { name: "Fat", value: totals.fat, color: MACRO_COLORS.fat },
  ];
  const grand = totals.protein + totals.carbs + totals.fat;

  return (
    <div className="flex items-center gap-4">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={3}
              strokeWidth={0}
            >
              {pieData.map((p) => (
                <Cell key={p.name} fill={p.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} kcal`, ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {pieData.map((p) => {
          const pct = grand > 0 ? Math.round((p.value / grand) * 100) : 0;
          return (
            <div key={p.name} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">
                  <span
                    className="mr-2 inline-block h-3 w-3 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                </span>
                <span className="text-gray-500">
                  {p.value.toLocaleString()} kcal · {pct}%
                </span>
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-xs text-gray-400">
          Calories from macros (protein ×4, carbs ×4, fat ×9).
        </p>
      </div>
    </div>
  );
}

/** Stacked macro grams per day. */
export function MacroStackChart({ data }: { data: DayStats[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} />
          <Tooltip formatter={(value) => [`${value} g`, ""]} />
          <Bar
            dataKey="protein"
            stackId="m"
            fill={MACRO_COLORS.protein}
            name="Protein (g)"
          />
          <Bar dataKey="carbs" stackId="m" fill={MACRO_COLORS.carbs} name="Carbs (g)" />
          <Bar
            dataKey="fat"
            stackId="m"
            fill={MACRO_COLORS.fat}
            name="Fat (g)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
