import Link from "next/link";

const STEPS = [
  {
    icon: "📸",
    title: "Snap your plate",
    text: "Take a photo of your biryani, karahi, daal-roti — whatever is in front of you.",
  },
  {
    icon: "🤖",
    title: "AI reads the dish",
    text: "Our food model recognises desi dishes and estimates calories, protein, carbs and fat.",
  },
  {
    icon: "📊",
    title: "Track your day",
    text: "Every meal lands on your dashboard with running totals and macro breakdowns.",
  },
];

export default function Home() {
  return (
    <div className="pt-10">
      {/* Hero */}
      <section className="text-center">
        <div className="text-6xl">🍛</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Know your <span className="text-orange-600">desi food</span>,
          <br />
          one photo at a time
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Generic calorie apps don&apos;t understand biryani, nihari or
          haleem. Desi Cal AI does — snap your plate and get instant
          calorie &amp; macro estimates for Pakistani &amp; Indian dishes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/track"
            className="rounded-full bg-orange-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700"
          >
            Start tracking →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-orange-200 bg-white px-8 py-3 text-lg font-semibold text-orange-700 hover:bg-orange-50"
          >
            Dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Free during beta · No signup needed yet
        </p>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm"
            >
              <div className="text-4xl">{s.icon}</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-wide text-orange-500">
                Step {i + 1}
              </div>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-3xl bg-gradient-to-br from-orange-600 to-amber-500 p-8 text-center text-white shadow-xl">
        <h2 className="text-2xl font-extrabold">
          Tonight&apos;s dinner, decoded 🍽️
        </h2>
        <p className="mx-auto mt-2 max-w-md text-orange-50">
          Upload your first plate photo and see your calories in seconds.
        </p>
        <Link
          href="/track"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-bold text-orange-700 hover:bg-orange-50"
        >
          Scan my first meal
        </Link>
      </section>
    </div>
  );
}
