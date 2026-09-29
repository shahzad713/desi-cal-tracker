import Link from "next/link";
import TrackForm from "./TrackForm";

export const metadata = {
  title: "Track a meal — Desi Cal AI",
};

export default function TrackPage() {
  return (
    <>
      <TrackForm />
      <p className="mt-6 text-center text-sm text-gray-600">
        No photo?{" "}
        <Link
          href="/dishes"
          className="font-semibold text-orange-600 underline"
        >
          Pick from the 209-dish database →
        </Link>
      </p>
    </>
  );
}
