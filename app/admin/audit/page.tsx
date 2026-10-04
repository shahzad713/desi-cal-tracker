import Link from "next/link";
import { listAuditLog } from "@/lib/admin";

// Must match AUDIT_PAGE_SIZE in lib/admin.ts (same constraint as above).
const PAGE_SIZE = 30;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Audit log · Desi Cal AI",
};

export default async function AdminAudit({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const log = await listAuditLog({ page: searchParams.page });

  const pageHref = (p: number) => `/admin/audit?page=${p}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {log.total} audit event{log.total === 1 ? "" : "s"} · every admin
        mutation writes a row here (actor, action, target, timestamp).
      </p>

      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orange-100 bg-orange-50/60 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="hidden px-4 py-3 md:table-cell">Target</th>
            </tr>
          </thead>
          <tbody>
            {log.rows.map((a) => (
              <tr
                key={a.id}
                className="border-b border-orange-50 align-top last:border-0 hover:bg-orange-50/40"
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">{a.actorEmail}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      a.action === "admin.revoke"
                        ? "rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700"
                        : "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700"
                    }
                  >
                    {a.action}
                  </span>
                  {a.detail ? (
                    <div className="mt-1 font-mono text-[11px] text-gray-500">
                      {a.detail}
                    </div>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                  {a.targetType ?? "—"}
                  {a.targetId ? (
                    <div className="font-mono text-[11px]">{a.targetId}</div>
                  ) : null}
                </td>
              </tr>
            ))}
            {log.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No audit events yet. Grant or revoke an admin role to write
                  the first row.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {log.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          {log.page > 1 ? (
            <Link
              href={pageHref(log.page - 1)}
              className="rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-800 hover:bg-orange-200"
            >
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">
            {PAGE_SIZE} per page
          </span>
          {log.page < log.totalPages ? (
            <Link
              href={pageHref(log.page + 1)}
              className="rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-800 hover:bg-orange-200"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
