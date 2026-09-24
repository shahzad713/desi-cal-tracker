import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import SignOutButton from "./SignOutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your profile — Desi Cal AI",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, entryCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, createdAt: true, image: true },
    }),
    prisma.foodEntry.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-extrabold">👤 Your profile</h1>

      <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? "Profile"}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              "🍛"
            )}
          </div>
          <div>
            <div className="text-xl font-extrabold">{user.name ?? "Food lover"}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-xl bg-orange-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Meals logged
            </dt>
            <dd className="mt-1 text-2xl font-extrabold text-orange-600">
              {entryCount}
            </dd>
          </div>
          <div className="rounded-xl bg-orange-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-gray-400">
              Member since
            </dt>
            <dd className="mt-1 text-lg font-extrabold text-gray-800">
              {user.createdAt.toLocaleDateString("en-PK", {
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
