// Food analysis layer — Day 3: real Gemini vision with graceful demo fallback.
//
// HOW IT WORKS:
//   analyzeFoodImage(imageDataUrl) -> { analysis, mode }
//   - REAL MODE: when NEXT_PUBLIC_DEMO_MODE=false AND GEMINI_API_KEY is set on
//     the server, the photo goes to Gemini 2.0 Flash vision with a strict
//     JSON prompt. The model's answer is validated with zod before use —
//     model output is untrusted input like any other.
//   - DEMO MODE (fallback): realistic rotating desi-dish samples. Used when
//     the flag forces it, when no API key is configured, or when the Gemini
//     call fails (rate limit, outage, timeout). The app never breaks.
//
// SECURITY NOTES:
//   - GEMINI_API_KEY is read ONLY here, on the server. It never reaches the
//     client (NEXT_PUBLIC_ prefix is absent by design) and never lands in git.
//   - Rate limiting on the scan path lives in lib/actions.ts (per-user bucket).
//   - The image MIME is re-validated here against the same allowlist as the
//     upload path (defense in depth).

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export interface FoodAnalysis {
  dishName: string;
  dishNameUrdu?: string;
  calories: number; // kcal
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  portion: string;
  confidence: number; // 0–1
}

export type AnalysisMode = "demo" | "gemini";

export interface FoodAnalysisResult {
  analysis: FoodAnalysis;
  mode: AnalysisMode;
}

// ---------------------------------------------------------------------------
// Demo mode (also the graceful fallback)
// ---------------------------------------------------------------------------

const DEMO_MODE_FORCED = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

const DEMO_SAMPLES: FoodAnalysis[] = [
  { dishName: "Chicken Biryani", dishNameUrdu: "چکن بریانی", calories: 650, protein: 28, carbs: 75, fat: 22, portion: "1 plate", confidence: 0.92 },
  { dishName: "Daal + 2 Roti", dishNameUrdu: "دال روٹی", calories: 480, protein: 18, carbs: 70, fat: 12, portion: "1 bowl daal + 2 roti", confidence: 0.89 },
  { dishName: "Nihari + Naan", dishNameUrdu: "نہاری", calories: 720, protein: 32, carbs: 58, fat: 34, portion: "1 bowl + 1 naan", confidence: 0.9 },
  { dishName: "Chicken Karahi", dishNameUrdu: "چکن کڑاہی", calories: 550, protein: 38, carbs: 12, fat: 40, portion: "half karahi", confidence: 0.87 },
  { dishName: "Aloo Paratha", dishNameUrdu: "آلو پراٹھا", calories: 340, protein: 7, carbs: 45, fat: 15, portion: "1 paratha", confidence: 0.91 },
  { dishName: "Haleem", dishNameUrdu: "حلیم", calories: 420, protein: 25, carbs: 48, fat: 14, portion: "1 bowl", confidence: 0.85 },
  { dishName: "Chicken Tikka", dishNameUrdu: "چکن ٹکا", calories: 380, protein: 42, carbs: 6, fat: 18, portion: "2 pieces", confidence: 0.93 },
  { dishName: "Seekh Kebab", dishNameUrdu: "سیخ کباب", calories: 450, protein: 36, carbs: 8, fat: 28, portion: "4 pieces", confidence: 0.88 },
];

let demoIndex = 0;

function demoAnalyze(): FoodAnalysis {
  const sample = DEMO_SAMPLES[demoIndex % DEMO_SAMPLES.length];
  demoIndex += 1;
  return { ...sample };
}

// ---------------------------------------------------------------------------
// Gemini vision
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 45_000;

// The model's JSON is untrusted input: coerce + bound every field.
const geminiNutritionSchema = z.object({
  dishName: z.string().trim().min(1).max(200),
  dishNameUrdu: z.string().trim().max(200).optional(),
  calories: z.coerce.number().finite().min(0).max(20000),
  protein: z.coerce.number().finite().min(0).max(2000),
  carbs: z.coerce.number().finite().min(0).max(2000),
  fat: z.coerce.number().finite().min(0).max(2000),
  portion: z.string().trim().min(1).max(200),
  confidence: z.coerce.number().min(0).max(1),
});

const GEMINI_PROMPT = `You are a desi-food nutrition expert. Look at this photo of a meal and identify it.

Respond with ONLY a JSON object (no markdown, no commentary) with these fields:
- "dishName": English name of the dish, e.g. "Chicken Biryani". If multiple dishes are visible, name the main one.
- "dishNameUrdu": the dish name in Urdu script, e.g. "چکن بریانی". Omit if unknown.
- "calories": estimated total kilocalories for the portion shown (number).
- "protein", "carbs", "fat": estimated grams (numbers).
- "portion": short description of the portion, e.g. "1 plate", "2 roti + 1 bowl daal".
- "confidence": your confidence in the identification, 0 to 1.

Base estimates on typical South Asian / Pakistani home cooking. If the photo is not food or you cannot identify the dish, set dishName to "Unknown dish", confidence below 0.4, and give your best conservative estimates.`;

function parseDataUrl(imageDataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    imageDataUrl
  );
  if (!match) throw new Error("Invalid image data URL.");
  return { mimeType: match[1], base64: match[3] };
}

function isRetriable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|quota|5\d\d|timeout|fetch failed|ECONN/i.test(msg);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Gemini request timed out.")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function callGemini(
  genAI: GoogleGenerativeAI,
  mimeType: string,
  base64: string
): Promise<FoodAnalysis> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const parts = [
    { text: GEMINI_PROMPT },
    { inlineData: { mimeType, data: base64 } },
  ];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await withTimeout(
        model.generateContent(parts),
        GEMINI_TIMEOUT_MS
      );
      const text = result.response.text();
      const parsed = JSON.parse(text);
      const v = geminiNutritionSchema.safeParse(parsed);
      if (!v.success) throw new Error("Gemini returned invalid nutrition data.");
      const d = v.data;
      return {
        dishName: d.dishName,
        dishNameUrdu: d.dishNameUrdu,
        calories: Math.round(d.calories),
        protein: Math.round(d.protein * 10) / 10,
        carbs: Math.round(d.carbs * 10) / 10,
        fat: Math.round(d.fat * 10) / 10,
        portion: d.portion,
        confidence: Math.round(d.confidence * 100) / 100,
      };
    } catch (err) {
      lastError = err;
      if (!isRetriable(err)) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini call failed.");
}

async function analyzeWithGemini(imageDataUrl: string): Promise<FoodAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const { mimeType, base64 } = parseDataUrl(imageDataUrl);
  const genAI = new GoogleGenerativeAI(apiKey);
  const analysis = await callGemini(genAI, mimeType, base64);
  return { analysis, mode: "gemini" };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function analyzeFoodImage(
  imageDataUrl: string
): Promise<FoodAnalysisResult> {
  if (DEMO_MODE_FORCED) {
    // Simulate a short "thinking" delay so the demo feels like real AI.
    await new Promise((r) => setTimeout(r, 1200));
    return { analysis: demoAnalyze(), mode: "demo" };
  }

  try {
    return await analyzeWithGemini(imageDataUrl);
  } catch (err) {
    // Graceful fallback: any Gemini failure (no key, rate limit, outage,
    // timeout, bad response) degrades to demo instead of breaking the app.
    // Never log the key or the image.
    console.warn(
      "[analyzeFood] Gemini failed, falling back to demo mode:",
      err instanceof Error ? err.message : "unknown error"
    );
    return { analysis: demoAnalyze(), mode: "demo" };
  }
}

/** True when real Gemini mode is active (key present + demo flag off). */
export function isDemoMode(): boolean {
  return DEMO_MODE_FORCED || !process.env.GEMINI_API_KEY;
}
