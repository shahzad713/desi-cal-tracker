import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getShareSnapshot } from "@/lib/share";

export const dynamic = "force-dynamic";

// PUBLIC page (no auth — the token in the URL is the credential). Renders
// ONLY the frozen snapshot; the owner's identity is never included.
export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  // getShareSnapshot increments the view counter, so metadata must use the
  // non-counting lookup instead (the page body counts the real view).
  const { getShareData } = await import("@/lib/share");
  const data = await getShareData(params.token);
  if (!data) return { title: "Shared day — Desi Cal AI" };
  const { payload } = data;
  const niceDate = new Date(payload.date + "T12:00:00").toLocaleDateString(
    "en-PK",
    { weekday: "long", day: "numeric", month: "long" }
  );
  const title = `🍛 ${payload.totals.calories.toLocaleString()} kcal day — Desi Cal AI`;
  const description = `${niceDate}: ${payload.totals.entries} meals logged — ${Math.round(payload.totals.protein)}g protein, ${Math.round(payload.totals.carbs)}g carbs, ${Math.round(payload.totals.fat)}g fat. Track your own desi food with AI.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [`/api/share/${params.token}/og`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/share/${params.token}/og`],
    },
  };
}

function MacroBar({
  label,
  grams,
  color,
  max,
}: {
  label: string;
  grams: number;
  color: string;
  max: number;
}) {
  const pct = Math.min(100, Math.round((grams / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-gray-500">{Math.round(grams)}g</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function PublicSharePage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getShareSnapshot(params.token);
  if (!data) notFound();
  const { payload, referralCode } = data;
  const niceDate = new Date(payload.date + "T12:00:00").toLocaleDateString(
    "en-PK",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );
  const maxMacro = Math.max(
    payload.totals.protein,
    payload.totals.carbs,
    payload.totals.fat,
    1
  );

  return (
    <div className="pt-8">
      {/* Summary card */}
      <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-5 text-white">
          <div className="text-xs font-bold uppercase tracking-widest opacity-80">
            🍛 Desi Cal AI · daily summary
          </div>
          <div className="mt-1 text-xl font-extrabold">{niceDate}</div>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-baseline justify-between">
            <h1 className="text-lg font-bold">Totals</h1>
            <div className="text-4xl font-extrabold text-orange-600">
              {payload.totals.calories.toLocaleString()}
              <span className="text-sm font-medium text-gray-400"> kcal</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <MacroBar label="Protein" grams={payload.totals.protein} color="bg-red-400" max={maxMacro} />
            <MacroBar label="Carbs" grams={payload.totals.carbs} color="bg-amber-400" max={maxMacro} />
            <MacroBar label="Fat" grams={payload.totals.fat} color="bg-emerald-400" max={maxMacro} />
          </div>

          <h2 className="mt-6 text-lg font-bold">
            Meals{" "}
            <span className="text-sm font-medium text-gray-400">
              ({payload.totals.entries})
            </span>
          </h2>
          <ul className="mt-3 divide-y divide-orange-50">
            {payload.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-gray-800">
                    {item.dish}
                    {item.dishUrdu && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        {item.dishUrdu}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.time} · {item.portion}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold text-orange-700">
                  {item.calories} kcal
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA — carries the owner's referral code so signups are attributed */}
      <div className="mt-6 rounded-3xl bg-gray-900 px-6 py-6 text-center text-white">
        <div className="text-2xl">🍛</div>
        <h2 className="mt-2 text-xl font-extrabold">
          Track your own desi food with AI
        </h2>
        <p className="mt-1 text-sm text-gray-300">
          Snap a photo of your plate → instant calories + macros. Free during
          beta.
        </p>
        <Link
          href={referralCode ? `/signup?ref=${referralCode}` : "/signup"}
          className="mt-4 inline-block rounded-full bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-500"
        >
          Get started free
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Shared from Desi Cal AI · the link owner&apos;s identity is private
      </p>
    </div>
  );
}
