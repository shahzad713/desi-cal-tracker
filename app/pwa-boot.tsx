"use client";

import { useEffect, useState } from "react";

// Day 8 — PWA plumbing: registers the service worker (production only, so
// dev stays uncached and debuggable) and shows an "Install app" banner when
// the browser fires beforeinstallprompt.

// beforeinstallprompt is not in the standard DOM lib — declare the shape we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaBoot() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure is non-fatal; the app works fully online.
      });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-30 rounded-2xl border border-orange-200 bg-white p-4 shadow-xl shadow-orange-100 sm:bottom-6">
      <div className="flex items-center gap-3">
        <div className="text-3xl">📲</div>
        <div className="flex-1">
          <p className="text-sm font-extrabold">Install Desi Cal AI</p>
          <p className="text-xs text-gray-500">
            Add it to your home screen for one-tap tracking.
          </p>
        </div>
        <button
          onClick={install}
          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="rounded-full px-2 py-1 text-gray-400 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
