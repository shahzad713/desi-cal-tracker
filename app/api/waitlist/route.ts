// Day 9 — POST /api/waitlist: public waitlist signup endpoint.
// Same validation + rate limiting as the form's server action
// (shared logic in lib/waitlist.ts). Returns JSON; never leaks internals.
import { NextRequest, NextResponse } from "next/server";
import { processWaitlistSignup } from "@/lib/waitlist";
import { clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const outcome = await processWaitlistSignup(body, clientIp(req.headers));

  if (outcome.ok) {
    return NextResponse.json({ ok: true, already: outcome.already });
  }
  if (outcome.reason === "rate_limited") {
    return NextResponse.json(
      { ok: false, error: "Too many signups right now — please try again later." },
      { status: 429 }
    );
  }
  return NextResponse.json(
    { ok: false, error: "Please check your details and try again." },
    { status: 400 }
  );
}
