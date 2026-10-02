import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import PwaBoot from "./pwa-boot";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Desi Cal AI — AI calorie tracker for desi food",
  description:
    "Snap a photo of your plate and get instant calorie + macro estimates for Pakistani & Indian dishes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Desi Cal AI",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function Nav() {
  const session = await auth();

  return (
    <header className="border-b border-orange-100 bg-white/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          🍛 Desi<span className="text-orange-600">Cal</span> AI
        </Link>
        <div className="flex items-center gap-1 text-sm font-medium">
          {session?.user ? (
            <>
              {/* Day 8: text links hidden on mobile — the bottom tab bar covers
                  navigation there; keep profile + sign-out up top. */}
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/track"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  Track
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/history"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  History
                </Link>
                <Link
                  href="/charts"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  Charts
                </Link>
                <Link
                  href="/goals"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  Goals
                </Link>
                <Link
                  href="/dishes"
                  className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
                >
                  Dishes
                </Link>
                <Link
                  href="/billing"
                  className="rounded-full px-4 py-2 font-bold text-orange-700 hover:bg-orange-50"
                >
                  ⚡ Pro
                </Link>
              </div>
              <Link
                href="/profile"
                title={session.user.email ?? "Profile"}
                className="rounded-full bg-orange-100 px-4 py-2 text-orange-800 hover:bg-orange-200"
              >
                👤 {session.user.name?.split(" ")[0] ?? "Account"}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full px-3 py-2 text-gray-500 hover:bg-gray-100"
                  title="Sign out"
                >
                  ⎋
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// Day 8 — mobile bottom tab bar: thumb-reachable navigation on small screens.
function MobileTabs() {
  const tabs = [
    { href: "/dashboard", label: "Today", icon: "📊" },
    { href: "/track", label: "Track", icon: "📸" },
    { href: "/dishes", label: "Dishes", icon: "🍛" },
    { href: "/charts", label: "Charts", icon: "📈" },
    { href: "/goals", label: "Goals", icon: "🎯" },
  ];
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-orange-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-gray-600 active:text-orange-600"
          >
            <span className="text-xl leading-none">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-orange-50/50 text-gray-900`}
      >
        <Nav />
        <main className="mx-auto max-w-3xl px-4 pb-24 md:pb-16">{children}</main>
        <PwaBoot />
        <MobileTabs />
        <footer className="border-t border-orange-100 py-6 text-center text-xs text-gray-500">
          Desi Cal AI — Day 8 build · installable PWA
        </footer>
      </body>
    </html>
  );
}
