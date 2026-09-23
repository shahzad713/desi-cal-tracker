"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/lib/actions";

export default function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteEntry(id))}
      disabled={isPending}
      aria-label="Delete entry"
      className="rounded-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
    >
      {isPending ? "…" : "🗑️"}
    </button>
  );
}
