import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { auth, signOut } from "@/auth";
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
          Desi Cal AI — Day 4 build · full entry history
        </footer>
      </body>
    </html>
  );
}
