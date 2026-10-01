// Day 9 — waitlist signup form (client component).
// Public marketing form: name + email, honeypot "company" field hidden from
// humans, server-validated + rate-limited in lib/waitlist.ts.
"use client";

import { useState } from "react";
import { joinWaitlist } from "@/lib/waitlist";

export default function WaitlistForm({ source = "landing-v2" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = e.target as HTMLFormElement;
    const company = (form.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    const res = await joinWaitlist({ email, name, source, company });
    if (res.ok) {
      setStatus("done");
      setMessage(
        res.already
          ? "You're already on the list — we'll be in touch! 🎉"
          : "You're on the list! We'll email you at launch. 🎉"
      );
    } else {
      setStatus("error");
      setMessage(res.error);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-5 text-center">
        <p className="font-bold text-green-800">{message}</p>
        <p className="mt-1 text-sm text-green-700">
          Meanwhile, the beta is open — <a href="/signup" className="underline font-semibold">create a free account</a> and scan your first plate today.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md" aria-label="Join the waitlist">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name (optional)"
          maxLength={60}
          autoComplete="given-name"
          className="rounded-full border border-orange-200 bg-white px-5 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          maxLength={254}
          autoComplete="email"
          className="flex-1 rounded-full border border-orange-200 bg-white px-5 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>
      {/* Honeypot — invisible to humans, bots fill it and get rejected server-side. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-4 w-full rounded-full bg-orange-600 px-8 py-3 font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 disabled:opacity-60"
      >
        {status === "loading" ? "Joining…" : "Notify me at launch →"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {message}
        </p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        One email at launch, nothing else. No spam, ever. Unsubscribe anytime.
      </p>
    </form>
  );
}
