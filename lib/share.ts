// Day 11 — shareable daily-summary links + referral basics ("use server").
//
// SECURITY MODEL (roadmap requirement: unguessable tokens, no data leak):
// - Share tokens are 256-bit crypto-random base64url (43 chars) and are the
//   ONLY credential for the public /share/[token] page. The token is format-
//   validated before any DB lookup; unknown tokens 404 with zero information.
// - A ShareLink stores a FROZEN JSON snapshot of one day's totals + entries.
//   The public page renders ONLY this snapshot — the owner's name, email and
//   userId are never included and never exposed through a shared link.
// - Snapshots are built server-side from the caller's own user-scoped
//   entries, so clients can never inject nutrition values or other users'
//   data. Shared links can be deleted (revoked) by the owner at any time.
// - Referral codes are unguessable 8-char base64url; an unknown ?ref= code
//   on signup is silently ignored (no code enumeration).

"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { requireUserId } from "./auth-actions";
import { checkRateLimit } from "./rateLimit";

const SHARE_LINKS_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

// --- Schemas ---

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

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid token");
const idSchema = z.string().cuid("Invalid link");

const shareItemSchema = z.object({
  dish: z.string(),
  dishUrdu: z.string().nullable(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  portion: z.string(),
  time: z.string(),
});

const sharePayloadSchema = z.object({
  date: z.string(),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    entries: z.number(),
  }),
  items: z.array(shareItemSchema).max(50),
});

export type SharePayload = z.infer<typeof sharePayloadSchema>;

// --- Helpers ---

function dayBounds(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1) };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Ensure the user has a unique referral code (lazy backfill for accounts
 * created before Day 11). Retries on the (astronomically unlikely) unique
 * collision; the unique index is the real guarantee.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomBytes(6).toString("base64url"); // 8 chars
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch (err) {
      // P2002 = unique collision (another user grabbed the same code).
      // Anything else is a real failure — surface it.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code !== "P2002"
      ) {
        throw err;
      }
    }
  }
  throw new Error("Could not generate a referral code. Please try again.");
}

/** The signed-in user's referral stats for /profile and /share. */
export async function getReferralInfo(): Promise<{
  code: string;
  referredCount: number;
}> {
  const userId = await requireUserId();
  const code = await ensureReferralCode(userId);
  const referredCount = await prisma.user.count({ where: { referredById: userId } });
  return { code, referredCount };
}

/** All share links owned by the signed-in user, newest first. */
export async function getShareLinks(): Promise<
  Array<{ id: string; token: string; date: string; viewCount: number; createdAt: Date }>
> {
  const userId = await requireUserId();
  return prisma.shareLink.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, date: true, viewCount: true, createdAt: true },
  });
}

/**
 * Create a shareable snapshot link for one day. Returns the raw token; the
 * client builds the absolute URL from window.location.origin.
 */
export async function createShareLink(dateStr: string): Promise<{ token: string }> {
  const userId = await requireUserId();
  if (!checkRateLimit(`share:${userId}`, SHARE_LINKS_PER_HOUR, HOUR_MS)) {
    throw new Error("Too many share links created. Try again in an hour.");
  }
  const parsed = dateParamSchema.safeParse(dateStr);
  if (!parsed.success) throw new Error("Invalid date.");
  const date = parsed.data;
  const { start, end } = dayBounds(date);

  const entries = await prisma.foodEntry.findMany({
    where: { userId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
  });
  if (entries.length === 0) {
    throw new Error("Nothing logged on that day yet — log a meal first.");
  }

  const totals = entries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: round1(t.protein + e.protein),
      carbs: round1(t.carbs + e.carbs),
      fat: round1(t.fat + e.fat),
      entries: t.entries + 1,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 }
  );

  const payload: SharePayload = {
    date,
    totals,
    items: entries.slice(0, 50).map((e) => ({
      dish: e.dishName,
      dishUrdu: e.dishNameUrdu,
      calories: e.calories,
      protein: round1(e.protein),
      carbs: round1(e.carbs),
      fat: round1(e.fat),
      portion: e.portion,
      time: e.createdAt.toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  };

  // One referral code per user, shared across all their links (it feeds the
  // "Track your own food" CTA on the public page) — make sure it exists.
  await ensureReferralCode(userId);

  const token = randomBytes(32).toString("base64url"); // 43 chars, 256-bit
  await prisma.shareLink.create({
    data: { token, userId, date, payload: JSON.stringify(payload) },
  });
  revalidatePath("/share");
  return { token };
}

/** Revoke a share link — ONLY if it belongs to the signed-in user. */
export async function deleteShareLink(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!idSchema.safeParse(id).success) throw new Error("Invalid link.");
  await prisma.shareLink.deleteMany({ where: { id, userId } });
  revalidatePath("/share");
}

export interface PublicShare {
  payload: SharePayload;
  referralCode: string;
  viewCount: number;
}

/**
 * PUBLIC (no auth): resolve a share token to its snapshot WITHOUT counting
 * a view. Used by generateMetadata and the OG image route. Returns null for
 * unknown/invalid tokens. The returned object contains ONLY the frozen
 * snapshot + the owner's public referral code — no name, email or userId.
 */
export async function getShareData(token: string): Promise<PublicShare | null> {
  if (!tokenSchema.safeParse(token).success) return null;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      payload: true,
      viewCount: true,
      user: { select: { referralCode: true } },
    },
  });
  if (!link) return null;
  let json: unknown;
  try {
    json = JSON.parse(link.payload);
  } catch {
    return null;
  }
  const parsed = sharePayloadSchema.safeParse(json);
  if (!parsed.success) return null; // corrupted snapshot — never half-render
  return {
    payload: parsed.data,
    referralCode: link.user.referralCode ?? "",
    viewCount: link.viewCount,
  };
}

/**
 * PUBLIC (no auth): resolve a share token to its snapshot AND count the
 * view. Used by the /share/[token] page itself.
 */
export async function getShareSnapshot(token: string): Promise<PublicShare | null> {
  const data = await getShareData(token);
  if (!data) return null;

  // Best-effort view counter; a failed increment must not break the page.
  prisma.shareLink
    .update({ where: { token }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return data;
}
