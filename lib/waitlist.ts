// Day 9 — waitlist signup (public marketing endpoint).
// SECURITY: the endpoint is intentionally public (anyone can join the
// waitlist), so abuse prevention happens here:
//  - zod validation: strict email format (lowercased, trimmed, ≤254 chars),
//    optional name (plain text ≤60 chars, control chars stripped),
//    honeypot field must be EMPTY (bots fill it; humans never see it).
//  - rate limits: 5 signups/hour per IP, 3/hour per email.
//  - email stored unique; duplicates return success ("already on the list")
//    so the endpoint can't be used to enumerate addresses.
//  - nothing secret is logged or returned to the client.
//
// The core logic lives in processWaitlistSignup (no framework imports) so
// both the server action (form) and the API route (/api/waitlist) share it.

"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const WaitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Please enter a valid email address"),
  // Optional first name — plain text, no markup; control characters stripped.
  name: z
    .string()
    .trim()
    .max(60)
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, ""))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Marketing source, allowlisted so callers can't inject arbitrary strings.
  source: z.enum(["landing-v2", "blog", "referral"]).default("landing-v2"),
  // Honeypot: rendered as a hidden field; must stay empty.
  company: z
    .string()
    .max(0, "Spam detected")
    .optional()
    .or(z.literal("")),
});

export type WaitlistOutcome =
  | { ok: true; already: boolean }
  | { ok: false; reason: "rate_limited" | "invalid" | "error" };

/** Shared signup logic. `ip` must be the real client IP (rate-limit key). */
export async function processWaitlistSignup(
  raw: Record<string, unknown>,
  ip: string
): Promise<WaitlistOutcome> {
  // Rate limits first — cheap, before any DB work.
  if (!checkRateLimit(`waitlist:ip:${ip}`, 5, 60 * 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const parsed = WaitlistSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }
  const { email, name, source } = parsed.data;

  if (!checkRateLimit(`waitlist:email:${email}`, 3, 60 * 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  try {
    await prisma.waitlistSignup.create({
      data: { email, name: name || null, source },
    });
    return { ok: true, already: false };
  } catch (err) {
    // P2002 = unique constraint on email → already signed up.
    // Return success either way (no address enumeration).
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { ok: true, already: true };
    }
    // Never leak DB internals to the caller.
    return { ok: false, reason: "error" };
  }
}

export type WaitlistResult =
  | { ok: true; already: boolean }
  | { ok: false; error: string };

const FRIENDLY_ERRORS: Record<"rate_limited" | "invalid" | "error", string> = {
  rate_limited: "Too many signups right now — please try again later.",
  invalid: "Please check your details and try again.",
  error: "Something went wrong — please try again.",
};

/** Server action used by the landing-page waitlist form. */
export async function joinWaitlist(
  raw: Record<string, unknown>
): Promise<WaitlistResult> {
  const ip = clientIp(headers());
  const outcome = await processWaitlistSignup(raw, ip);
  if (outcome.ok) return outcome;
  return { ok: false, error: FRIENDLY_ERRORS[outcome.reason] };
}
