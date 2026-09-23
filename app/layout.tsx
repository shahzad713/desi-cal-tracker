import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
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
};

function Nav() {
  return (
    <header className="border-b border-orange-100 bg-white/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          🍛 Desi<span className="text-orange-600">Cal</span> AI
        </Link>
        <div className="flex gap-1 text-sm font-medium">
          <Link
            href="/track"
            className="rounded-full px-4 py-2 text-gray-700 hover:bg-orange-50"
          >
            Track
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
          >
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
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
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
        <footer className="border-t border-orange-100 py-6 text-center text-xs text-gray-500">
          Desi Cal AI — Day 1 build · demo mode
        </footer>
      </body>
    </html>
  );
}
