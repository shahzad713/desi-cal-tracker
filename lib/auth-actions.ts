"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { auth } from "@/auth";

/** The authenticated user's id, or throws. Every private action starts here. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Please sign in to continue.");
  return id;
}

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  // Day 11: optional referral code (?ref= on the signup URL). Validated as a
  // strict 8-char code; unknown/invalid codes are silently ignored below —
  // signup never reveals whether a code exists.
  ref: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export interface RegisterState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Create an account with email + password. Rate-limited per IP. */
export async function register(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const ip = clientIp(headers());
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many signups from this network. Try again later." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    ref: formData.get("ref"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    // Deliberately vague — do not confirm which emails have accounts.
    return { error: "Could not create the account. Try signing in instead." };
  }

  // Day 11: attribute the referral when ?ref= names a real code. A miss is
  // silent — we never confirm or deny that a code exists.
  let referredById: string | undefined;
  if (parsed.data.ref) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: parsed.data.ref },
      select: { id: true },
    });
    if (referrer) referredById = referrer.id;
  }

  // Every new account gets its own unguessable referral code up front.
  // (A freak unique-collision is retried once in the P2002 catch below.)
  const referralCode = randomBytes(6).toString("base64url"); // 8 chars

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        referralCode,
        referredById,
      },
    });
  } catch (err) {
    // P2002 on referralCode = freak collision; retry once with a fresh code.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          referralCode: randomBytes(9).toString("base64url"), // 12 chars
          referredById,
        },
      });
    } else {
      throw err;
    }
  }

  redirect("/login?registered=1");
}
