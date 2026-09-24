"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const registered = searchParams.get("registered") === "1";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        // Same message for wrong email or wrong password — no info leak.
        setError("Invalid email or password.");
      } else if (res?.ok) {
        window.location.href = "/dashboard";
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        <div className="text-center text-4xl">🍛</div>
        <h1 className="mt-3 text-center text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Sign in to your Desi Cal AI account
        </p>

        {registered && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Account created — sign in below. 🎉
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50"
        >
          <span className="text-lg">G</span> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-100" />
          or with email
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-orange-600 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-orange-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
