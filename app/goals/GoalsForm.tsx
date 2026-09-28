"use client";

import { useState, useTransition } from "react";
import { updateGoals } from "@/lib/actions";
import {
  CALORIE_TARGET_MIN,
  CALORIE_TARGET_MAX,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
} from "@/lib/goals";

interface Initial {
  dailyCalorieTarget: number;
  currentWeight: number | null;
  targetWeight: number | null;
}

export default function GoalsForm({ initial }: { initial: Initial }) {
  const [target, setTarget] = useState(String(initial.dailyCalorieTarget));
  const [currentWeight, setCurrentWeight] = useState(
    initial.currentWeight != null ? String(initial.currentWeight) : ""
  );
  const [targetWeight, setTargetWeight] = useState(
    initial.targetWeight != null ? String(initial.targetWeight) : ""
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      try {
        const calorieTarget = Math.round(Number(target));
        const parseWeight = (s: string): number | null => {
          const t = s.trim();
          if (!t) return null;
          const v = Number(t);
          return Number.isFinite(v) ? v : null;
        };
        await updateGoals({
          dailyCalorieTarget: calorieTarget,
          currentWeight: parseWeight(currentWeight),
          targetWeight: parseWeight(targetWeight),
        });
        setMsg({ ok: true, text: "Goals saved ✅" });
      } catch (err) {
        setMsg({
          ok: false,
          text: err instanceof Error ? err.message : "Could not save.",
        });
      }
    });
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-bold">✏️ Edit your goals</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Daily calorie target
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={CALORIE_TARGET_MIN}
            max={CALORIE_TARGET_MAX}
            step={50}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={inputCls}
            required
          />
          <span className="mt-1 block text-xs text-gray-400">
            {CALORIE_TARGET_MIN}–{CALORIE_TARGET_MAX} kcal
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Current weight (kg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={WEIGHT_MIN_KG}
            max={WEIGHT_MAX_KG}
            step={0.1}
            value={currentWeight}
            onChange={(e) => setCurrentWeight(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Target weight (kg)
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={WEIGHT_MIN_KG}
            max={WEIGHT_MAX_KG}
            step={0.1}
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </label>
      </div>

      {msg && (
        <p
          className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold ${
            msg.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-orange-600 px-6 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save goals"}
      </button>
    </form>
  );
}
