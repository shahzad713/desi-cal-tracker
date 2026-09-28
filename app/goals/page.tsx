import { getGoalStats } from "@/lib/actions";
import { remainingCalories } from "@/lib/goals";
import GoalsForm from "./GoalsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your goals — Desi Cal AI",
};

function StatCard({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 text-xs uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{sub}</div>
    </div>
  );
}

export default async function GoalsPage() {
  const stats = await getGoalStats();
  const progress = remainingCalories(
    stats.dailyCalorieTarget,
    stats.todayCalories
  );

  const weightSet =
    stats.currentWeight != null && stats.targetWeight != null;
  const weightDelta =
    weightSet ? stats.currentWeight! - stats.targetWeight! : null;
  const weightValue =
    weightSet && weightDelta! <= 0
      ? "Goal reached!"
      : weightSet
        ? `${weightDelta!.toFixed(1)} kg`
        : "Not set yet";
  const weightSub =
    weightSet && weightDelta! <= 0
      ? "🎉 You hit your target — set a new one below."
      : weightSet
        ? `to go (${stats.currentWeight!.toFixed(1)} → ${stats.targetWeight!.toFixed(1)} kg)`
        : "Set your current + target weight below.";

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">🎯 Your goals</h1>
      <p className="mt-1 text-sm text-gray-600">
        Targets that make the dashboard personal — streaks keep you honest.
      </p>

      {/* Today's progress vs target */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Today vs target</h2>
          <div className="text-2xl font-extrabold text-orange-600">
            {stats.todayCalories}
            <span className="text-sm font-medium text-gray-400">
              {" "}
              / {stats.dailyCalorieTarget} kcal
            </span>
          </div>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              progress.over ? "bg-rose-500" : "bg-orange-500"
            }`}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {progress.over
            ? `⚠️ ${Math.abs(progress.remaining)} kcal over target today.`
            : progress.remaining === stats.dailyCalorieTarget
              ? "Nothing logged yet — today's budget is untouched."
              : `✅ ${progress.remaining} kcal left in today's budget.`}
        </p>
      </div>

      {/* Streaks + weight */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          emoji="🔥"
          label="Current streak"
          value={`${stats.streaks.current} day${stats.streaks.current === 1 ? "" : "s"}`}
          sub={
            stats.streaks.current > 0
              ? "Log today to keep it alive."
              : "Log a meal today to start one."
          }
        />
        <StatCard
          emoji="🏆"
          label="Best streak"
          value={`${stats.streaks.best} day${stats.streaks.best === 1 ? "" : "s"}`}
          sub="Longest run since you joined."
        />
        <StatCard
          emoji="⚖️"
          label="Weight goal"
          value={weightValue}
          sub={weightSub}
        />
      </div>

      {/* Edit form */}
      <GoalsForm
        initial={{
          dailyCalorieTarget: stats.dailyCalorieTarget,
          currentWeight: stats.currentWeight,
          targetWeight: stats.targetWeight,
        }}
      />
    </div>
  );
}
