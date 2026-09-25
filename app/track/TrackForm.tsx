"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  analyzePhoto,
  saveEntry,
  type AnalyzeResult,
} from "@/lib/actions";

export default function TrackForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setSaved(false);
    setError(null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  function onAnalyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await analyzePhoto(formData);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed. Try again.");
      }
    });
  }

  function onSave() {
    if (!result) return;
    const { analysis, imagePath } = result;
    startTransition(async () => {
      try {
        await saveEntry({
          dishName: analysis.dishName,
          dishNameUrdu: analysis.dishNameUrdu,
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fat: analysis.fat,
          portion: analysis.portion,
          imagePath,
        });
        setSaved(true);
        router.push("/dashboard");
      } catch {
        setError("Could not save the entry. Try again.");
      }
    });
  }

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">📸 Track a meal</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload a photo of your plate and let the AI do the math.
      </p>

      <form onSubmit={onAnalyze} className="mt-6">
        <label
          htmlFor="photo"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-white px-6 py-10 text-center hover:border-orange-500"
        >
          {preview ? (
            <Image
              src={preview}
              alt="Meal preview"
              width={400}
              height={300}
              className="max-h-64 w-auto rounded-xl object-cover"
            />
          ) : (
            <>
              <div className="text-5xl">🍽️</div>
              <div className="mt-3 font-semibold text-gray-700">
                Tap to choose a photo
              </div>
              <div className="mt-1 text-xs text-gray-400">
                JPG or PNG, up to 10 MB
              </div>
            </>
          )}
          <input
            id="photo"
            ref={fileRef}
            name="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </label>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!preview || isPending}
          className="mt-4 w-full rounded-full bg-orange-600 py-3 text-lg font-bold text-white shadow-lg shadow-orange-200 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-orange-700"
        >
          {isPending ? "Analyzing… 🤖" : "Analyze my plate ✨"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold">{result.analysis.dishName}</h2>
              {result.analysis.dishNameUrdu && (
                <p className="text-lg text-gray-500">{result.analysis.dishNameUrdu}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Portion: {result.analysis.portion} ·{" "}
                {Math.round(result.analysis.confidence * 100)}% confident
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-orange-600">
                {result.analysis.calories}
              </div>
              <div className="text-xs uppercase tracking-wide text-gray-400">kcal</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Protein", value: result.analysis.protein, unit: "g", color: "bg-emerald-100 text-emerald-800" },
              { label: "Carbs", value: result.analysis.carbs, unit: "g", color: "bg-amber-100 text-amber-800" },
              { label: "Fat", value: result.analysis.fat, unit: "g", color: "bg-rose-100 text-rose-800" },
            ].map((m) => (
              <div key={m.label} className={`rounded-xl px-3 py-3 ${m.color}`}>
                <div className="text-xl font-extrabold">
                  {m.value}
                  <span className="text-xs font-medium">{m.unit}</span>
                </div>
                <div className="text-xs font-medium">{m.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onSave}
            disabled={isPending || saved}
            className="mt-5 w-full rounded-full bg-gray-900 py-3 font-bold text-white disabled:opacity-40 hover:bg-gray-800"
          >
            {saved ? "Saved ✓" : isPending ? "Saving…" : "Save to today's log"}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">
            {result.mode === "gemini"
              ? "Analyzed by Gemini AI ✨"
              : "Demo mode: sample analysis, not real AI — add GEMINI_API_KEY (Day 3)."}
          </p>
        </div>
      )}
    </div>
  );
}
