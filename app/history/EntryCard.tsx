"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { FoodEntry } from "@prisma/client";
import { deleteEntry, setPortionScale, updateEntry } from "@/lib/actions";

const PORTION_OPTIONS: { value: number; label: string }[] = [
  { value: 0.25, label: "¼ portion" },
  { value: 0.5, label: "½ portion" },
  { value: 0.75, label: "¾ portion" },
  { value: 1, label: "1× (as logged)" },
  { value: 1.25, label: "1¼ portion" },
  { value: 1.5, label: "1½ portion" },
  { value: 2, label: "2× (double)" },
];

const inputCls =
  "w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none";

/** One history entry: thumbnail, nutrition, portion adjust, edit dialog, delete. */
export default function EntryCard({ entry }: { entry: FoodEntry }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit-form state (seeded from the entry when the dialog opens).
  const [dishName, setDishName] = useState(entry.dishName);
  const [dishNameUrdu, setDishNameUrdu] = useState(entry.dishNameUrdu ?? "");
  const [portion, setPortion] = useState(entry.portion);
  const [calories, setCalories] = useState(String(entry.calories));
  const [protein, setProtein] = useState(String(entry.protein));
  const [carbs, setCarbs] = useState(String(entry.carbs));
  const [fat, setFat] = useState(String(entry.fat));

  function openEdit() {
    setDishName(entry.dishName);
    setDishNameUrdu(entry.dishNameUrdu ?? "");
    setPortion(entry.portion);
    setCalories(String(entry.calories));
    setProtein(String(entry.protein));
    setCarbs(String(entry.carbs));
    setFat(String(entry.fat));
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateEntry(entry.id, {
          dishName: dishName.trim(),
          dishNameUrdu: dishNameUrdu.trim() || undefined,
          portion: portion.trim(),
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
        });
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save changes.");
      }
    });
  }

  function adjust(scale: number) {
    setError(null);
    startTransition(async () => {
      try {
        await setPortionScale(entry.id, scale);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not adjust portion.");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Delete "${entry.dishName}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteEntry(entry.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {entry.imagePath ? (
          <Image
            src={entry.imagePath}
            alt={entry.dishName}
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
          <div className="truncate font-bold">
            {entry.dishName}
            {entry.dishNameUrdu && (
              <span className="ml-2 font-normal text-gray-400" dir="rtl">
                {entry.dishNameUrdu}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {entry.portion}
            {entry.portionScale !== 1 && (
              <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-700">
                ×{entry.portionScale}
              </span>
            )}{" "}
            ·{" "}
            {new Date(entry.createdAt).toLocaleTimeString("en-PK", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F{" "}
            {Math.round(entry.fat)}g
          </div>
        </div>
        <div className="text-right">
          <div className="font-extrabold text-orange-600">{entry.calories}</div>
          <div className="text-[10px] uppercase text-gray-400">kcal</div>
        </div>
      </div>

      {/* Actions row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-orange-50 pt-3">
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Portion
          <select
            value={entry.portionScale}
            disabled={isPending}
            onChange={(e) => adjust(Number(e.target.value))}
            aria-label="Adjust portion size"
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
          >
            {PORTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={openEdit}
          disabled={isPending}
          className="rounded-full px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-40"
        >
          ✏️ Edit
        </button>
        <button
          onClick={remove}
          disabled={isPending}
          aria-label="Delete entry"
          className="rounded-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          {isPending ? "…" : "🗑️ Delete"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {/* Edit dialog */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isPending && setEditing(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit meal"
          >
            <h3 className="text-lg font-bold">✏️ Edit meal</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Dish name</label>
                <input
                  className={inputCls}
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">
                  Urdu name (optional)
                </label>
                <input
                  className={inputCls}
                  value={dishNameUrdu}
                  onChange={(e) => setDishNameUrdu(e.target.value)}
                  maxLength={200}
                  dir="rtl"
                  placeholder="اردو نام"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Portion</label>
                <input
                  className={inputCls}
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. 1 plate"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Calories (kcal)
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={20000}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Protein (g)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={2000}
                    step="any"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Carbs (g)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={2000}
                    step="any"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Fat (g)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={2000}
                    step="any"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Editing sets a new baseline — any portion scale resets to 1×.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={isPending}
                className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
