import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

// The /admin route group gate: every admin page runs through requireAdmin()
// (session + fresh DB role lookup, with ADMIN_EMAILS bootstrap). Anything
// that fails is not an admin — send them home, no information leaked.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin: { email: string } | null = null;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            🛡️ Admin panel
          </h1>
          <p className="text-sm text-gray-500">
            Signed in as <span className="font-semibold">{admin?.email}</span> ·
            all actions are audit-logged
          </p>
        </div>
        <nav className="flex gap-2 text-sm font-semibold">
          <Link
            href="/admin"
            className="rounded-full bg-orange-100 px-4 py-2 text-orange-800 hover:bg-orange-200"
          >
            Stats
          </Link>
          <Link
            href="/admin/users"
            className="rounded-full bg-orange-100 px-4 py-2 text-orange-800 hover:bg-orange-200"
          >
            Users
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-full bg-orange-100 px-4 py-2 text-orange-800 hover:bg-orange-200"
          >
            Audit log
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
