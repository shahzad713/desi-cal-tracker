import Link from "next/link";
import { listAdminUsers } from "@/lib/admin";

// Must match ADMIN_PAGE_SIZE in lib/admin.ts ("use server" files may only
// export async functions, so the constant lives there privately).
const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Users · Desi Cal AI",
};

function Badge({ children, tone }: { children: React.ReactNode; tone: "pro" | "admin" | "plain" }) {
  const cls =
    tone === "pro"
      ? "bg-yellow-100 text-yellow-800"
      : tone === "admin"
        ? "bg-purple-100 text-purple-800"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {children}
    </span>
  );
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const list = await listAdminUsers({
    q: searchParams.q,
    page: searchParams.page,
  });

  const pageHref = (p: number) =>
    `/admin/users?q=${encodeURIComponent(list.q)}&page=${p}`;

  return (
    <div className="space-y-4">
      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={list.q}
          maxLength={100}
          placeholder="Search email or name…"
          className="w-full rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-700"
        >
          Search
        </button>
      </form>

      <p className="text-sm text-gray-500">
        {list.total} user{list.total === 1 ? "" : "s"}
        {list.q ? (
          <>
            {" "}matching “<span className="font-semibold">{list.q}</span>”
          </>
        ) : null}
        {" "}· page {list.page} of {list.totalPages}
      </p>

      <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orange-100 bg-orange-50/60 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">User</th>
              <th className="hidden px-4 py-3 md:table-cell">Joined</th>
              <th className="hidden px-4 py-3 sm:table-cell">Entries</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.users.map((u) => (
              <tr key={u.id} className="border-b border-orange-50 last:border-0 hover:bg-orange-50/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-semibold text-gray-900 hover:text-orange-700"
                  >
                    {u.name ?? "—"}
                  </Link>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">{u.entries}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.isPro ? <Badge tone="pro">PRO</Badge> : null}
                    {u.isAdmin ? <Badge tone="admin">ADMIN</Badge> : null}
                    {!u.isPro && !u.isAdmin ? (
                      <Badge tone="plain">FREE</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-200"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {list.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {list.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          {list.page > 1 ? (
            <Link href={pageHref(list.page - 1)} className="rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-800 hover:bg-orange-200">
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">
            {PAGE_SIZE} per page
          </span>
          {list.page < list.totalPages ? (
            <Link href={pageHref(list.page + 1)} className="rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-800 hover:bg-orange-200">
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
