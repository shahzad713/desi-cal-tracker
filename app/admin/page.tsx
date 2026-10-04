import { getAdminStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Stats · Desi Cal AI",
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

export default async function AdminDashboard() {
  const s = await getAdminStats();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">
          Users
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total users" value={s.usersTotal} />
          <Stat label="New today" value={s.usersToday} />
          <Stat label="New last 7 days" value={s.usersLast7d} />
          <Stat
            label="Pro / admins"
            value={`${s.proUsers} / ${s.adminUsers}`}
            sub="Pro subscribers and admin-role users"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Food entries" value={s.entriesTotal} />
          <Stat label="Entries today" value={s.entriesToday} />
          <Stat label="Share links" value={s.shareLinksTotal} />
          <Stat
            label="Audit events (24h)"
            value={s.auditEvents24h}
            sub="Admin actions logged"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">
          Waitlist
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total signups" value={s.waitlistTotal} />
          <Stat label="Last 7 days" value={s.waitlistLast7d} />
        </div>
      </section>

      <p className="rounded-xl bg-orange-50 p-4 text-xs text-gray-600">
        Stats are computed live from the database on every visit. Admin
        role grants/revokes are written to the audit log with actor,
        target and timestamp — review them under{" "}
        <span className="font-semibold">Audit log</span>.
      </p>
    </div>
  );
}
