import type { Metadata } from "next";
import Link from "next/link";
import WaitlistForm from "./waitlist-form";
import ProductTour from "./product-tour";

// Day 9 — marketing landing v2: product tour, feature grid, FAQ, launch waitlist.

// Day 13: the landing is the ONE public indexable page — explicitly opt back
// into indexing (the root layout noindexes everything else by default).
export const metadata: Metadata = {
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

const STATS = [
  { value: "209", label: "desi dishes in the database" },
  { value: "4", label: "macros tracked per meal: kcal, protein, carbs, fat" },
  { value: "15s", label: "from photo to nutrition estimate" },
  { value: "100%", label: "your meals stay private to your account" },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "AI photo analysis",
    text: "Gemini vision reads your plate — dish name, portion, calories, protein, carbs, fat. Built for desi food, not salads.",
  },
  {
    icon: "📚",
    title: "209-dish desi database",
    text: "Biryani to nihari to jalebi — searchable in English and اردو, with per-serving nutrition for every dish.",
  },
  {
    icon: "📈",
    title: "Charts that motivate",
    text: "Weekly calorie bars, macro donut, per-day breakdowns. See patterns, not just numbers.",
  },
  {
    icon: "🔥",
    title: "Goals & streaks",
    text: "Set your daily calorie target and weight goal. Keep the streak alive — one logged day at a time.",
  },
  {
    icon: "📱",
    title: "Installs like an app",
    text: "PWA with offline support and one-tap rear-camera capture. Add it to your home screen, no app store needed.",
  },
  {
    icon: "🔒",
    title: "Private by design",
    text: "Your meals are yours alone — every entry is scoped to your account, uploads are validated, and nothing leaks.",
  },
];

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

const FAQS = [
  {
    q: "How accurate are the calorie estimates?",
    a: "They're smart estimates, not lab measurements — AI reads the dish and portion from your photo, backed by our 209-dish nutrition database. Great for daily tracking and trends; not medical advice. If you have a health condition, check with a professional.",
  },
  {
    q: "Which cuisines does it understand?",
    a: "Pakistani and Indian food first — biryani, nihari, haleem, karahi, daal, kebabs, mithai and 200+ more. The database grows every week.",
  },
  {
    q: "Is it free?",
    a: "Yes — the beta is completely free while we build toward launch. Join the waitlist below for launch updates and early access to Desi Cal Pro (unlimited AI scans).",
  },
  {
    q: "Is my food data private?",
    a: "Completely. Every entry is tied to your account and only you can see it. We never sell data, and uploads are validated and stored securely.",
  },
];

export default function Home() {
  // Day 13 — structured data for search engines (SoftwareApplication).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Desi Cal AI",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "AI calorie tracker for desi food: snap a photo of your plate and get instant calorie + macro estimates for Pakistani & Indian dishes.",
  };
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="pt-12 text-center sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          Free during beta · Built in public
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Your <span className="text-orange-600">desi food</span>,
          <br />
          decoded by AI 🍛
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
          Generic calorie apps don&apos;t understand biryani, nihari or
          haleem. Desi Cal AI does — snap your plate and get instant
          calorie &amp; macro estimates for Pakistani &amp; Indian dishes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-full bg-orange-600 px-8 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 sm:w-auto"
          >
            Start tracking free →
          </Link>
          <a
            href="#tour"
            className="w-full rounded-full border border-orange-200 bg-white px-8 py-3.5 text-lg font-semibold text-orange-700 transition hover:bg-orange-50 sm:w-auto"
          >
            See it in action
          </a>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          No credit card · Your meals stay private to your account
        </p>

        {/* Stats */}
        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-orange-100 bg-white px-4 py-5 shadow-sm"
            >
              <dt className="order-2 mt-1 text-xs text-gray-500">{s.label}</dt>
              <dd className="text-2xl font-extrabold text-orange-600">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Product tour */}
      <section id="tour" className="mt-20 scroll-mt-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Take the tour
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
          A look inside the live beta — scan, dashboard, and the dish
          database.
        </p>
        <ProductTour />
      </section>

      {/* Features */}
      <section className="mt-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Everything you need to eat smarter
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="text-4xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
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

      {/* Waitlist */}
      <section
        id="waitlist"
        className="mt-20 scroll-mt-20 rounded-3xl bg-gradient-to-br from-orange-600 to-amber-500 p-8 text-center text-white shadow-xl sm:p-12"
      >
        <h2 className="text-3xl font-extrabold">Be first at launch 🚀</h2>
        <p className="mx-auto mt-3 max-w-md text-orange-50">
          The beta is open right now — but join the waitlist for launch
          updates and <strong>early access to Desi Cal Pro</strong> with
          unlimited AI scans.
        </p>
        <div className="mt-6 rounded-2xl bg-white/95 p-6 text-gray-900 shadow-inner">
          <WaitlistForm source="landing-v2" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-2xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Questions, answered
        </h2>
        <div className="mt-8 space-y-4">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
            >
              <summary className="cursor-pointer font-bold text-gray-900 marker:text-orange-500">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Day 10 — simple pricing: Free vs Pro */}
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">
          Free to start. Pro when you&apos;re hungry for more.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Free
            </div>
            <div className="mt-1 text-3xl font-extrabold">Rs 0</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>📸 20 AI photo scans / hour</li>
              <li>🍛 209-dish desi database</li>
              <li>📊 Dashboard, history &amp; charts</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-orange-500 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold uppercase tracking-wide text-orange-600">
              ⚡ Pro
            </div>
            <div className="mt-1 text-3xl font-extrabold">Coming soon</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>♾️ Unlimited AI photo scans</li>
              <li>🚀 Priority analysis queue</li>
              <li>💛 Support the beta</li>
            </ul>
            <Link
              href="/billing"
              className="mt-5 inline-block rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
            >
              See plans →
            </Link>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          Pro launches in test mode during the beta — no real charges until
          launch day.
        </p>
      </section>

      {/* Final CTA */}
      <section className="mt-20 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Tonight&apos;s dinner, decoded 🍽️
        </h2>
        <p className="mx-auto mt-3 max-w-md text-gray-600">
          Create your free account and scan your first plate in under a
          minute.
        </p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-full bg-orange-600 px-10 py-3.5 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700"
        >
          Get started free →
        </Link>
      </section>
    </div>
  );
}
