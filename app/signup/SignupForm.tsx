"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { register, type RegisterState } from "@/lib/auth-actions";

const initialState: RegisterState = {};

export default function SignupForm() {
  const [state, formAction, isPending] = useFormState(register, initialState);

  return (
    <div className="pt-10">
      <div className="mx-auto max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        <div className="text-center text-4xl">🍛</div>
        <h1 className="mt-3 text-center text-2xl font-extrabold">
          Create your account
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Free during beta — your meals stay private to you.
        </p>

        {state.error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-semibold text-gray-700">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              maxLength={100}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
              placeholder="Your name"
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
              placeholder="you@example.com"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
            )}
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
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
              placeholder="At least 8 characters"
            />
            {state.fieldErrors?.password && (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-orange-600 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-40"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-orange-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
