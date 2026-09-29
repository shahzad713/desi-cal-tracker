"use client";

import { useState, useTransition } from "react";
import { logDish, type DishResult } from "@/lib/actions";

/**
 * One dish card in the database grid. The "+ Log" button calls the server
 * action, which looks the dish up by id — nutrition values always come from
 * the server, never from the client.
 */
export default function DishCard({ dish }: { dish: DishResult }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onLog() {
    setMsg(null);
    startTransition(async () => {
      try {
        await logDish(dish.id);
        setMsg({ ok: true, text: "Logged to today's food log ✅" });
      } catch (err) {
        setMsg({
          ok: false,
          text: err instanceof Error ? err.message : "Could not log.",
        });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900">{dish.name}</p>
          {dish.nameUrdu && (
            <p className="text-sm text-gray-500" dir="auto">
              {dish.nameUrdu}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
          {dish.category}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xl font-extrabold text-orange-600">
            {dish.calories}{" "}
            <span className="text-xs font-medium text-gray-500">kcal</span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            P {Math.round(dish.protein)}g · C {Math.round(dish.carbs)}g · F{" "}
            {Math.round(dish.fat)}g
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{dish.servingSize}</p>
        </div>
        <button
          onClick={onLog}
          disabled={pending}
          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "…" : "+ Log"}
        </button>
      </div>

      {msg && (
        <p
          className={`mt-2 text-xs font-medium ${
            msg.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
