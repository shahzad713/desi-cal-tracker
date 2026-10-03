"use client";

import { useState, useTransition } from "react";
import {
  createShareLink,
  deleteShareLink,
  getShareLinks,
} from "@/lib/share";

interface ShareLinkRow {
  id: string;
  token: string;
  date: string;
  viewCount: number;
  createdAt: string;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API unavailable (old browser / non-secure context):
          // select-and-copy fallback via a temporary textarea.
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 hover:bg-orange-200"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

export default function ShareClient({
  initialLinks,
  referralCode,
  referredCount,
  defaultDate,
}: {
  initialLinks: ShareLinkRow[];
  referralCode: string;
  referredCount: number;
  defaultDate: string;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [date, setDate] = useState(defaultDate);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const linkUrl = (token: string) => `${origin}/share/${token}`;
  const inviteUrl = `${origin}/signup?ref=${referralCode}`;

  const refresh = async () => {
    const rows = await getShareLinks();
    setLinks(
      rows.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))
    );
  };

  const onCreate = () =>
    startTransition(async () => {
      setError(null);
      setFreshToken(null);
      try {
        const { token } = await createShareLink(date);
        setFreshToken(token);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the link.");
      }
    });

  const onDelete = (id: string) =>
    startTransition(async () => {
      setError(null);
      try {
        await deleteShareLink(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete the link.");
      }
    });

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">🔗 Share your day</h1>
      <p className="mt-1 text-sm text-gray-600">
        Create a public link showing one day&apos;s meals — anyone with the
        link can see the summary, nothing else. Your name and email are never
        shared.
      </p>

      {/* Create a link */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">New share link</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            max={defaultDate}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={pending}
            className="rounded-full bg-orange-600 px-5 py-2.5 font-bold text-white hover:bg-orange-700 disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create link"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {freshToken && (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Your link is ready — share it anywhere:
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded-lg bg-white px-3 py-2 text-xs text-gray-700">
                {linkUrl(freshToken)}
              </code>
              <CopyButton text={linkUrl(freshToken)} />
            </div>
          </div>
        )}
      </div>

      {/* Existing links */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Your links</h2>
        {links.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No share links yet. Create one above — great for WhatsApp status,
            family groups, or your dietitian.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-orange-50/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-gray-800">
                    📅 {l.date}
                    <span className="ml-2 text-xs font-medium text-gray-500">
                      👁 {l.viewCount} {l.viewCount === 1 ? "view" : "views"}
                    </span>
                  </div>
                  <code className="mt-1 block truncate text-xs text-gray-500">
                    {linkUrl(l.token)}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={linkUrl(l.token)} />
                  <button
                    type="button"
                    onClick={() => onDelete(l.id)}
                    disabled={pending}
                    className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Referrals */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">🎁 Invite friends</h2>
        <p className="mt-1 text-sm text-gray-600">
          Every shared day carries your invite link — when friends sign up
          through it, they count here.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-orange-50/60 px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">
              Your invite link
            </div>
            <code className="break-all text-sm font-bold text-orange-700">
              {inviteUrl}
            </code>
          </div>
          <CopyButton text={inviteUrl} label="Copy invite link" />
        </div>
        <p className="mt-3 text-sm text-gray-600">
          👥 <span className="font-bold text-gray-800">{referredCount}</span>{" "}
          {referredCount === 1 ? "friend has" : "friends have"} joined through
          your invite.
        </p>
      </div>
    </div>
  );
}
