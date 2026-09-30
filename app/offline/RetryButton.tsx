"use client";

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="mt-6 rounded-full bg-orange-600 px-6 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
    >
      Try again
    </button>
  );
}
