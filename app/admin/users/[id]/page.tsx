import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin";
import AdminToggle from "../../AdminToggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — User detail · Desi Cal AI",
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-orange-50 py-2 text-sm last:border-0">
      <span className="text-gray-500">{k}</span>
      <span className="font-semibold text-gray-900">{v}</span>
    </div>
  );
}

export default async function AdminUserDetail({
  params,
}: {
  params: { id: string };
}) {
  const u = await getAdminUserDetail(params.id);
  if (!u) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm font-semibold text-orange-700 hover:underline"
      >
        ← Back to users
      </Link>

      <div className="rounded-2xl border border-orange-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{u.name ?? "Unnamed user"}</h2>
            <p className="text-sm text-gray-500">{u.email}</p>
          </div>
          <AdminToggle userId={u.id} email={u.email} isAdmin={u.isAdmin} />
        </div>
        <Row k="User id" v={<span className="font-mono text-xs">{u.id}</span>} />
        <Row
          k="Joined"
          v={new Date(u.createdAt).toLocaleString()}
        />
        <Row k="Plan" v={u.isPro ? "⚡ Pro" : "Free"} />
        <Row k="Admin" v={u.isAdmin ? "Yes" : "No"} />
        <Row k="Daily calorie target" v={`${u.dailyCalorieTarget} kcal`} />
        <Row
          k="Weight"
          v={
            u.currentWeight != null
              ? `${u.currentWeight} kg → ${u.targetWeight ?? "—"} kg`
              : "Not set"
          }
        />
        <Row k="Referral code" v={u.referralCode ?? "—"} />
        <Row k="Food entries" v={u.entries} />
        <Row k="Share links" v={u.shareLinks} />
        <Row k="Referrals" v={u.referrals} />
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white p-5">
        <h3 className="mb-3 font-bold">Recent entries</h3>
        {u.recentEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No food entries yet.</p>
        ) : (
          <ul className="divide-y divide-orange-50 text-sm">
            {u.recentEntries.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 py-2">
                <span className="font-medium">{e.dishName}</span>
                <span className="text-gray-500">
                  {e.calories} kcal ·{" "}
                  {new Date(e.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white p-5">
        <h3 className="mb-3 font-bold">Admin actions on this user</h3>
        {u.recentAudit.length === 0 ? (
          <p className="text-sm text-gray-500">
            No admin actions recorded for this user.
          </p>
        ) : (
          <ul className="divide-y divide-orange-50 text-sm">
            {u.recentAudit.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{a.action}</span>{" "}
                  <span className="text-gray-500">by {a.actorEmail}</span>
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
