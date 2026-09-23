"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "./db";
import { analyzeFoodImage, type FoodAnalysis } from "./analyzeFood";

export interface AnalyzeResult {
  analysis: FoodAnalysis;
  imagePath: string;
}

/** Upload a photo, store it under public/uploads/, and run food analysis on it. */
export async function analyzePhoto(formData: FormData): Promise<AnalyzeResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a photo first.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Photo must be under 10 MB.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${randomUUID()}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const mime = file.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const analysis = await analyzeFoodImage(dataUrl);

  return { analysis, imagePath: `/uploads/${filename}` };
}

export interface SaveEntryInput {
  dishName: string;
  dishNameUrdu?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  imagePath?: string;
}

/** Save an analyzed meal to today's log. userId stays null until Day 2 auth. */
export async function saveEntry(input: SaveEntryInput): Promise<void> {
  await prisma.foodEntry.create({
    data: {
      dishName: input.dishName,
      dishNameUrdu: input.dishNameUrdu,
      calories: Math.round(input.calories),
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      portion: input.portion,
      imagePath: input.imagePath,
      userId: null,
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteEntry(id: string): Promise<void> {
  await prisma.foodEntry.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function getTodayEntries() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.foodEntry.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
  });
}
