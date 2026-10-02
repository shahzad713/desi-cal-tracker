"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "./db";
import { requireUserId } from "./auth-actions";
import { analyzeFoodImage, type FoodAnalysis, type AnalysisMode } from "./analyzeFood";
import { checkRateLimit, clientIp } from "./rateLimit";
import { getBillingStatus } from "./billing";

export interface AnalyzeResult {
  analysis: FoodAnalysis;
  imagePath: string;
  mode: AnalysisMode; // "gemini" when real AI answered, "demo" on fallback
}

// Scan budget: 20 scans/hour per user on the Free plan, 60/hour per IP for
// everyone (infra abuse backstop). PRO USERS skip the per-user bucket —
// unlimited scans is the whole point of Pro. Buckets are in-memory
// (per-instance); Day 14 moves to Redis/Upstash.
const SCANS_PER_HOUR_PER_USER = 20;
const SCANS_PER_HOUR_PER_IP = 60;
const HOUR_MS = 60 * 60 * 1000;

// --- Upload validation (security standard) ---
// Allowlist: MIME type + magic bytes. The extension is DERIVED from the
// validated MIME — the client-supplied filename is never trusted.

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_UPLOADS: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": {
    ext: "jpg",
    magic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    magic: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  "image/webp": {
    ext: "webp",
    magic: (b) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
};

function validateUpload(file: File, buffer: Buffer): string {
  const spec = ALLOWED_UPLOADS[file.type];
  if (!spec) {
    throw new Error("Only JPG, PNG or WebP photos are accepted.");
  }
  if (!spec.magic(buffer)) {
    throw new Error("That file is not a real image. Please try another photo.");
  }
  return spec.ext;
}

/** Upload a photo, store it under public/uploads/, and run food analysis on it. */
export async function analyzePhoto(formData: FormData): Promise<AnalyzeResult> {
  // Identity check first: no anonymous uploads, ever.
  const userId = await requireUserId();

  // SECURITY: rate-limit the AI scan path per user and per IP. Pro users get
  // unlimited scans (the per-user bucket is skipped for them); the per-IP
  // bucket still applies to everyone as an infrastructure abuse backstop.
  const { isPro } = await getBillingStatus(userId);
  if (
    !isPro &&
    !checkRateLimit(`scan:${userId}`, SCANS_PER_HOUR_PER_USER, HOUR_MS)
  ) {
    throw new Error(
      "You've hit the Free plan's 20 scans/hour — upgrade to Pro on the Billing page for unlimited scans."
    );
  }
  const ip = clientIp(headers());
  if (!checkRateLimit(`scan:ip:${ip}`, SCANS_PER_HOUR_PER_IP, HOUR_MS)) {
    throw new Error("Too many scans — please wait a bit and try again.");
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a photo first.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Photo must be under 10 MB.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = validateUpload(file, buffer);
  const filename = `${randomUUID()}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const mime = file.type;
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const { analysis, mode } = await analyzeFoodImage(dataUrl);

  return { analysis, imagePath: `/uploads/${filename}`, mode };
}

const saveEntrySchema = z.object({
  dishName: z.string().trim().min(1).max(200),
  dishNameUrdu: z.string().trim().max(200).optional(),
  calories: z.number().finite().min(0).max(20000),
  protein: z.number().finite().min(0).max(2000),
  carbs: z.number().finite().min(0).max(2000),
  fat: z.number().finite().min(0).max(2000),
  portion: z.string().trim().min(1).max(200),
  // Only paths this server generated (/uploads/<uuid>.<ext>) are accepted —
  // never a client-invented path.
  imagePath: z
    .string()
    .regex(/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/)
    .optional(),
});

export type SaveEntryInput = z.infer<typeof saveEntrySchema>;

/** Save an analyzed meal to the signed-in user's log. */
export async function saveEntry(input: SaveEntryInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = saveEntrySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid meal data.");

  const base = {
    baseCalories: Math.round(parsed.data.calories),
    baseProtein: parsed.data.protein,
    baseCarbs: parsed.data.carbs,
    baseFat: parsed.data.fat,
  };

  await prisma.foodEntry.create({
    data: {
      dishName: parsed.data.dishName,
      dishNameUrdu: parsed.data.dishNameUrdu,
      calories: base.baseCalories,
      protein: base.baseProtein,
      carbs: base.baseCarbs,
      fat: base.baseFat,
      portion: parsed.data.portion,
      imagePath: parsed.data.imagePath,
      userId,
      portionScale: 1,
      ...base,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

/**
 * Delete one entry — ONLY if it belongs to the signed-in user.
 * deleteMany returns the count so a forged id silently deletes nothing.
 */
export async function deleteEntry(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!z.string().cuid().safeParse(id).success) throw new Error("Invalid entry.");

  await prisma.foodEntry.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// --- Day 4: history, edit, portion adjust ---

/** Strict YYYY-MM-DD validation: real calendar date, not in the future. */
const dateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return (
      dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    );
  }, "Not a real date")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).getTime() <= new Date().setHours(0, 0, 0, 0);
  }, "Future dates are not allowed");

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  return { start, end };
}

/**
 * All entries for one calendar day (local time), signed-in user only.
 * Invalid or future dates throw — the history page falls back to today.
 */
export async function getEntriesForDate(dateStr: string) {
  const userId = await requireUserId();
  const parsed = dateParamSchema.safeParse(dateStr);
  if (!parsed.success) throw new Error("Invalid date.");
  const { start, end } = dayBounds(parsed.data);
  return prisma.foodEntry.findMany({
    where: { userId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
  });
}

const editEntrySchema = z.object({
  dishName: z.string().trim().min(1).max(200),
  dishNameUrdu: z.string().trim().max(200).optional(),
  calories: z.number().finite().min(0).max(20000),
  protein: z.number().finite().min(0).max(2000),
  carbs: z.number().finite().min(0).max(2000),
  fat: z.number().finite().min(0).max(2000),
  portion: z.string().trim().min(1).max(200),
});

export type EditEntryInput = z.infer<typeof editEntrySchema>;

/**
 * Edit one entry — ONLY if it belongs to the signed-in user.
 * Ownership is enforced in the WHERE clause; a forged id updates nothing.
 * The edited values become the new portion base (scale resets to 1×).
 */
export async function updateEntry(id: string, input: EditEntryInput): Promise<void> {
  const userId = await requireUserId();
  if (!z.string().cuid().safeParse(id).success) throw new Error("Invalid entry.");
  const parsed = editEntrySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid meal data.");

  const base = {
    baseCalories: Math.round(parsed.data.calories),
    baseProtein: Math.round(parsed.data.protein * 10) / 10,
    baseCarbs: Math.round(parsed.data.carbs * 10) / 10,
    baseFat: Math.round(parsed.data.fat * 10) / 10,
  };

  await prisma.foodEntry.updateMany({
    where: { id, userId },
    data: {
      dishName: parsed.data.dishName,
      dishNameUrdu: parsed.data.dishNameUrdu,
      calories: base.baseCalories,
      protein: base.baseProtein,
      carbs: base.baseCarbs,
      fat: base.baseFat,
      portion: parsed.data.portion,
      portionScale: 1,
      ...base,
    },
  });
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

// Fixed scale steps — nutrition is ALWAYS computed as round(base * scale),
// so adjusting portions back and forth never drifts.
const PORTION_SCALES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const portionScaleSchema = z
  .number()
  .refine((v): v is (typeof PORTION_SCALES)[number] =>
    (PORTION_SCALES as readonly number[]).includes(v)
  );

/**
 * Set an entry's portion scale — ONLY if it belongs to the signed-in user.
 * Values are recomputed from the base (drift-free); the base columns are
 * included in the WHERE clause as an optimistic lock so a concurrent edit
 * can't silently mix stale bases with new values.
 */
export async function setPortionScale(id: string, scale: number): Promise<void> {
  const userId = await requireUserId();
  if (!z.string().cuid().safeParse(id).success) throw new Error("Invalid entry.");
  if (!portionScaleSchema.safeParse(scale).success) {
    throw new Error("Invalid portion size.");
  }

  const entry = await prisma.foodEntry.findFirst({
    where: { id, userId },
    select: {
      baseCalories: true,
      baseProtein: true,
      baseCarbs: true,
      baseFat: true,
    },
  });
  if (!entry) throw new Error("Entry not found.");

  const { count } = await prisma.foodEntry.updateMany({
    where: {
      id,
      userId,
      baseCalories: entry.baseCalories,
      baseProtein: entry.baseProtein,
      baseCarbs: entry.baseCarbs,
      baseFat: entry.baseFat,
    },
    data: {
      portionScale: scale,
      calories: Math.round(entry.baseCalories * scale),
      protein: Math.round(entry.baseProtein * scale * 10) / 10,
      carbs: Math.round(entry.baseCarbs * scale * 10) / 10,
      fat: Math.round(entry.baseFat * scale * 10) / 10,
    },
  });
  if (count === 0) throw new Error("Entry changed while saving — please try again.");

  revalidatePath("/history");
  revalidatePath("/dashboard");
}

/** Today's entries for the signed-in user only — never anyone else's. */
export async function getTodayEntries() {
  const userId = await requireUserId();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.foodEntry.findMany({
    where: { userId, createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
  });
}

// --- Day 7: desi dish database — search + one-tap manual logging ---

import { DISH_CATEGORIES, MAX_DISH_RESULTS } from "./dishes";

const dishSearchSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(60).optional(),
});

export interface DishResult {
  id: string;
  name: string;
  nameUrdu: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  category: string;
}

// Search is cheap, but still bounded per user so the DB can't be hammered.
const DISH_SEARCHES_PER_MINUTE = 60;

/**
 * Search the shared 200+ dish reference database by name (English or Urdu)
 * and/or category. The Dish table is reference data — it belongs to nobody,
 * so no userId scoping is needed here; only signed-in users can search.
 */
export async function searchDishes(input?: {
  q?: string;
  category?: string;
}): Promise<DishResult[]> {
  const userId = await requireUserId();
  if (
    !checkRateLimit(`dishes:${userId}`, DISH_SEARCHES_PER_MINUTE, 60 * 1000)
  ) {
    throw new Error("Too many searches — slow down a little.");
  }
  const parsed = dishSearchSchema.safeParse(input ?? {});
  if (!parsed.success) throw new Error("Invalid search.");

  const q = parsed.data.q;
  const category = parsed.data.category || undefined;
  if (category && !(DISH_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Invalid category.");
  }

  return prisma.dish.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { nameUrdu: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: MAX_DISH_RESULTS,
    select: {
      id: true,
      name: true,
      nameUrdu: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      servingSize: true,
      category: true,
    },
  });
}

// Manual logging is cheap, but still bounded per user.
const DISH_LOGS_PER_HOUR = 120;

/**
 * One-tap manual add: log a dish from the reference database straight into
 * the signed-in user's food log — no photo needed. The dish id is validated
 * (cuid) and looked up server-side; the client never supplies nutrition
 * values, so they can't be tampered with. The entry always lands on the
 * caller's own userId.
 */
export async function logDish(dishId: string): Promise<void> {
  const userId = await requireUserId();
  if (
    !checkRateLimit(`logdish:${userId}`, DISH_LOGS_PER_HOUR, 60 * 60 * 1000)
  ) {
    throw new Error("Too many logs — please wait a bit and try again.");
  }
  if (!z.string().cuid().safeParse(dishId).success) {
    throw new Error("Invalid dish.");
  }

  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish) throw new Error("Dish not found.");

  await prisma.foodEntry.create({
    data: {
      dishName: dish.name,
      dishNameUrdu: dish.nameUrdu,
      calories: dish.calories,
      protein: dish.protein,
      carbs: dish.carbs,
      fat: dish.fat,
      portion: dish.servingSize,
      userId,
      portionScale: 1,
      baseCalories: dish.calories,
      baseProtein: dish.protein,
      baseCarbs: dish.carbs,
      baseFat: dish.fat,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// --- Day 5: charts / weekly stats ---

import { CHART_RANGES, type DayStats } from "./nutrition";

// --- Day 6: goals — daily target, weight goal, streaks ---

import {
  CALORIE_TARGET_MIN,
  CALORIE_TARGET_MAX,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  computeStreaks,
  type Streaks,
} from "./goals";
import { todayParam } from "./date";

const weightSchema = z
  .number()
  .finite()
  .min(WEIGHT_MIN_KG)
  .max(WEIGHT_MAX_KG)
  .nullable()
  .optional();

const updateGoalsSchema = z.object({
  dailyCalorieTarget: z
    .number()
    .int()
    .min(CALORIE_TARGET_MIN)
    .max(CALORIE_TARGET_MAX),
  currentWeight: weightSchema,
  targetWeight: weightSchema,
});

export type UpdateGoalsInput = z.infer<typeof updateGoalsSchema>;

export interface GoalStats {
  dailyCalorieTarget: number;
  currentWeight: number | null;
  targetWeight: number | null;
  todayCalories: number;
  streaks: Streaks;
}

// Settings updates are cheap but personal — a small per-user rate limit stops
// automated hammering of the row.
const GOALS_UPDATES_PER_10MIN = 10;

/**
 * Update the signed-in user's goals (daily calorie target + weight goal).
 * All values are zod-bounded server-side; the update touches ONLY the
 * caller's own User row (updateMany would be wrong here — we assert the id).
 */
export async function updateGoals(input: UpdateGoalsInput): Promise<void> {
  const userId = await requireUserId();
  if (
    !checkRateLimit(
      `goals:${userId}`,
      GOALS_UPDATES_PER_10MIN,
      10 * 60 * 1000
    )
  ) {
    throw new Error("Too many updates — please wait a bit and try again.");
  }
  const parsed = updateGoalsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid goal values.");

  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyCalorieTarget: parsed.data.dailyCalorieTarget,
      currentWeight: parsed.data.currentWeight ?? null,
      targetWeight: parsed.data.targetWeight ?? null,
    },
  });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

const streakDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Goal stats for the signed-in user only: targets, today's logged calories,
 * and streaks derived from their own entry history.
 */
export async function getGoalStats(): Promise<GoalStats> {
  const userId = await requireUserId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [user, todayTotals, entryDays] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyCalorieTarget: true,
        currentWeight: true,
        targetWeight: true,
      },
    }),
    prisma.foodEntry.aggregate({
      where: { userId, createdAt: { gte: today } },
      _sum: { calories: true },
    }),
    // All logged days ever, oldest-first — entry counts are small, so a full
    // user-scoped scan is fine. (Day 14+: keyset/paginate if needed.)
    prisma.foodEntry.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!user) throw new Error("Account not found.");

  const dayKeys = entryDays.map((e) => streakDayKey(new Date(e.createdAt)));
  return {
    dailyCalorieTarget: user.dailyCalorieTarget,
    currentWeight: user.currentWeight,
    targetWeight: user.targetWeight,
    todayCalories: todayTotals._sum.calories ?? 0,
    streaks: computeStreaks(dayKeys, todayParam()),
  };
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Per-day totals for the last N days (N = 7, 14 or 30), signed-in user only.
 * Returns a full series — days with no entries are zeros — so charts always render.
 * All input is a fixed allowlist; all queries are scoped by userId.
 */
export async function getNutritionSeries(days: number): Promise<DayStats[]> {
  const userId = await requireUserId();
  if (!(CHART_RANGES as readonly number[]).includes(days)) {
    throw new Error("Invalid range.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const entries = await prisma.foodEntry.findMany({
    where: { userId, createdAt: { gte: start } },
    select: {
      createdAt: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    },
  });

  // Seed every day in the window, then accumulate.
  const series = new Map<string, DayStats>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d);
    series.set(key, {
      date: key,
      label: days > 14 ? String(d.getDate()) : WEEKDAYS[d.getDay()],
      entries: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  }
  for (const e of entries) {
    const key = dayKey(new Date(e.createdAt));
    const day = series.get(key);
    if (!day) continue; // outside window (shouldn't happen)
    day.entries += 1;
    day.calories += e.calories;
    day.protein += e.protein;
    day.carbs += e.carbs;
    day.fat += e.fat;
  }
  return Array.from(series.values()).map((d) => ({
    ...d,
    calories: Math.round(d.calories),
    protein: Math.round(d.protein * 10) / 10,
    carbs: Math.round(d.carbs * 10) / 10,
    fat: Math.round(d.fat * 10) / 10,
  }));
}
