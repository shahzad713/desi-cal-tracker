// Food analysis layer — Day 1.
//
// HOW IT WORKS:
//   analyzeFoodImage(imageDataUrl) -> FoodAnalysis
//   - DEMO MODE (default ON, via NEXT_PUBLIC_DEMO_MODE=true): returns realistic
//     rotating sample analyses for common desi dishes. No API key needed.
//   - REAL MODE (Day 3): routes to analyzeWithGemini(), which will send the
//     image to Gemini 1.5 Flash vision and parse the nutrition JSON.
//
// DAY-3 SWAP INSTRUCTIONS (one-function change):
//   1. Set NEXT_PUBLIC_DEMO_MODE=false and add GEMINI_API_KEY to .env
//      (see .env.example).
//   2. Implement analyzeWithGemini() below using the @google/generative-ai SDK:
//      send the image + a prompt asking for JSON {dishName, dishNameUrdu,
//      calories, protein, carbs, fat, portion, confidence}, then parse it.
//   3. Nothing else changes — callers only use analyzeFoodImage().

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

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

// Realistic demo samples for common desi dishes. Each call rotates to the next
// sample so the demo feels alive across multiple scans.
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

// Day 3: implement with Gemini vision. Signature stays the same.
async function analyzeWithGemini(imageDataUrl: string): Promise<FoodAnalysis> {
  void imageDataUrl; // replaced by the real Gemini call on Day 3
  throw new Error(
    "Gemini vision integration lands on Day 3. " +
      "Set NEXT_PUBLIC_DEMO_MODE=true in .env to use demo samples for now."
  );
}

export async function analyzeFoodImage(imageDataUrl: string): Promise<FoodAnalysis> {
  if (DEMO_MODE) {
    // Simulate a short "thinking" delay so the demo feels like real AI.
    await new Promise((r) => setTimeout(r, 1200));
    return demoAnalyze();
  }
  return analyzeWithGemini(imageDataUrl);
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}
