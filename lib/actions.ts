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

export interface AnalyzeResult {
  analysis: FoodAnalysis;
  imagePath: string;
  mode: AnalysisMode; // "gemini" when real AI answered, "demo" on fallback
}

// Scan budget: 20 scans/hour per user, 60/hour per IP. Keeps Gemini costs and
// abuse under control. Buckets are in-memory (per-instance); Day 14 moves to
// Redis/Upstash.
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

  // SECURITY: rate-limit the AI scan path per user and per IP.
  if (!checkRateLimit(`scan:${userId}`, SCANS_PER_HOUR_PER_USER, HOUR_MS)) {
    throw new Error("Too many scans — please wait a bit and try again.");
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

  await prisma.foodEntry.create({
    data: {
      dishName: parsed.data.dishName,
      dishNameUrdu: parsed.data.dishNameUrdu,
      calories: Math.round(parsed.data.calories),
      protein: parsed.data.protein,
      carbs: parsed.data.carbs,
      fat: parsed.data.fat,
      portion: parsed.data.portion,
      imagePath: parsed.data.imagePath,
      userId,
    },
  });
  revalidatePath("/dashboard");
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
