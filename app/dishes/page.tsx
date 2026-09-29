import Link from "next/link";
import { searchDishes, type DishResult } from "@/lib/actions";
import { DISH_CATEGORIES } from "@/lib/dishes";
import DishCard from "./DishCard";

// Always render fresh — the search params change per request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dish database — Desi Cal AI",
};

function SearchForm({
  q,
  category,
}: {
  q: string;
  category: string;
}) {
  return (
    <form
      method="get"
      action="/dishes"
      className="mt-4 flex flex-col gap-2 sm:flex-row"
    >
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search 209 desi dishes… (e.g. biryani, کڑاہی)"
        maxLength={100}
        className="flex-1 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-orange-400"
      />
      <select
        name="category"
        defaultValue={category}
        className="rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400"
      >
        <option value="">All categories</option>
        {DISH_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
      >
        Search
      </button>
    </form>
  );
}

export default async function DishesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const category =
    typeof searchParams.category === "string" ? searchParams.category : "";

  // Invalid input (e.g. a hand-crafted category) falls back to browsing all —
  // the action throws, and we never show a broken page.
  let dishes: DishResult[];
  try {
    dishes = await searchDishes({ q, category });
  } catch {
    dishes = await searchDishes({});
  }

  const filtering = q.trim() !== "" || category !== "";

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        🍽️ Desi dish database
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        209 dishes with calories + macros and Urdu names. Tap{" "}
        <span className="font-semibold text-orange-700">+ Log</span> to add one
        to today&apos;s food log — no photo needed.
      </p>

      <SearchForm q={q} category={category} />

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        {dishes.length} {dishes.length === 1 ? "dish" : "dishes"}
        {filtering ? " found" : " — browse all"}
      </p>

      {dishes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-8 text-center">
          <p className="text-lg">😕 Nothing matched your search.</p>
          <p className="mt-1 text-sm text-gray-600">
            Try an English or Urdu name — or{" "}
            <Link href="/dishes" className="text-orange-600 underline">
              browse everything
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Nutrition values are realistic estimates for typical servings — the AI
        scan on the{" "}
        <Link href="/track" className="text-orange-600 underline">
          track page
        </Link>{" "}
        gives per-photo estimates.
      </p>
    </div>
  );
}
