"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
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

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  redirect("/login?registered=1");
}
