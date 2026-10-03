import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShareLinks, getReferralInfo } from "@/lib/share";
import { todayParam } from "@/lib/date";
import ShareClient from "./ShareClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Share your day — Desi Cal AI",
};

// NOTE: /share is NOT in the edge-middleware matcher on purpose — the public
// /share/[token] pages must stay reachable without sign-in. Auth is enforced
// here in the page instead (same pattern as /profile).
export default async function SharePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [links, referral] = await Promise.all([
    getShareLinks(),
    getReferralInfo(),
  ]);

  return (
    <ShareClient
      initialLinks={links.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
      referralCode={referral.code}
      referredCount={referral.referredCount}
      defaultDate={searchParams.date ?? todayParam()}
    />
  );
}
