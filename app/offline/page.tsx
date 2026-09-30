import Link from "next/link";
import RetryButton from "./RetryButton";

// Day 8 — offline fallback page served by the service worker when the
// network is unreachable. Public on purpose (no auth needed to read it).
export const metadata = {
  title: "You're offline — Desi Cal AI",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 pt-16 text-center">
      <div className="text-6xl">📴</div>
      <h1 className="mt-4 text-2xl font-extrabold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-600">
        Desi Cal AI needs a connection to analyze photos and sync your log.
        Your logged entries are safe on our servers — reconnect and pick up
        right where you left off.
      </p>
      <RetryButton />
      <Link
        href="/"
        className="mt-3 text-sm font-semibold text-orange-600 underline"
      >
        Back to home
      </Link>
    </div>
  );
}
