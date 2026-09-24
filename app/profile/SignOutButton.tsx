"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        signOut({ callbackUrl: "/" });
      }}
      disabled={busy}
      className="rounded-full bg-gray-900 px-6 py-2.5 font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
