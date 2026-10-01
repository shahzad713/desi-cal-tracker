// Day 9 — product tour: crafted UI previews of the live beta, built with the
// same components and real demo data. These are illustrations of the actual
// product screens, not pixel screenshots.

const DEMO_ENTRIES = [
  { name: "Chicken Biryani", urdu: "چکن بریانی", kcal: 650 },
  { name: "Chicken Karahi", urdu: "چکن کڑاہی", kcal: 520 },
  { name: "Daal + 2 Roti", urdu: "دال روٹی", kcal: 420 },
  { name: "Gulab Jamun", urdu: "گلاب جامن", kcal: 300 },
];

const DEMO_DISHES = [
  { name: "Chicken Biryani", urdu: "چکن بریانی", kcal: 650, cat: "Rice & Biryani" },
  { name: "Beef Biryani", urdu: "بیف بریانی", kcal: 720, cat: "Rice & Biryani" },
  { name: "Sindhi Biryani", urdu: "سندھی بریانی", kcal: 690, cat: "Rice & Biryani" },
];

function ScanPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 text-7xl">
        🍛
      </div>
      <div className="flex-1 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-green-600">
          ✨ Analyzed by AI
        </p>
        <h3 className="mt-1 text-lg font-extrabold">Chicken Biryani</h3>
        <p className="text-sm text-gray-500">چکن بریانی · 1 plate</p>
        <p className="mt-2 text-3xl font-extrabold text-orange-600">
          650 <span className="text-base font-semibold text-gray-500">kcal</span>
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          {[
            ["Protein", "32g", "w-2/5", "bg-blue-500"],
            ["Carbs", "58g", "w-3/5", "bg-amber-500"],
            ["Fat", "28g", "w-1/4", "bg-rose-500"],
          ].map(([label, val, w, color]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-12 text-gray-500">{label}</span>
              <div className="h-2 flex-1 rounded-full bg-gray-100">
                <div className={`h-2 rounded-full ${color} ${w}`} />
              </div>
              <span className="w-8 text-right font-semibold">{val}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-full bg-orange-600 py-2.5 text-center text-sm font-bold text-white">
          + Log this meal
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="flex h-full flex-col p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        Today
      </p>
      <p className="mt-1 text-3xl font-extrabold">
        1,890{" "}
        <span className="text-base font-semibold text-gray-400">/ 2,200 kcal</span>
      </p>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="h-3 w-[86%] rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />
      </div>
      <p className="mt-1 text-xs text-gray-500">310 kcal left · 🔥 6-day streak</p>
      <div className="mt-4 flex-1 space-y-2">
        {DEMO_ENTRIES.map((e) => (
          <div
            key={e.name}
            className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-bold">{e.name}</p>
              <p className="text-xs text-gray-500">{e.urdu}</p>
            </div>
            <p className="text-sm font-extrabold text-orange-600">{e.kcal}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DishesPreview() {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
        🔍 biryani
      </div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
          Rice & Biryani
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
          Kebabs
        </span>
      </div>
      <div className="mt-3 flex-1 space-y-2">
        {DEMO_DISHES.map((d) => (
          <div
            key={d.name}
            className="flex items-center justify-between rounded-xl border border-orange-100 bg-white px-3 py-2 shadow-sm"
          >
            <div>
              <p className="text-sm font-bold">{d.name}</p>
              <p className="text-xs text-gray-500">
                {d.urdu} · {d.kcal} kcal/serving
              </p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              + Log
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        209 dishes · English + اردو search
      </p>
    </div>
  );
}

const CARDS = [
  {
    title: "📸 Snap your plate",
    text: "Point your camera at biryani, karahi, daal-roti — anything. AI identifies the dish and estimates calories + macros in seconds.",
    body: <ScanPreview />,
  },
  {
    title: "📊 Watch your day",
    text: "Every meal lands on your dashboard with running totals, macro bars, and your personal calorie target.",
    body: <DashboardPreview />,
  },
  {
    title: "🍛 209-dish database",
    text: "No photo? Search 209 desi dishes in English or اردو across 12 categories and log with one tap.",
    body: <DishesPreview />,
  },
];

export default function ProductTour() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      {CARDS.map((c) => (
        <figure
          key={c.title}
          className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-md"
        >
          <div className="border-b border-orange-100 bg-gray-50 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
            </div>
          </div>
          <div className="h-96">{c.body}</div>
          <figcaption className="border-t border-orange-100 p-5">
            <h3 className="font-bold">{c.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{c.text}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
