// Edge gate: /track, /dashboard, /charts, /profile, /history, /goals,
// /dishes, /billing and /admin require a signed-in user. Everyone else is
// bounced to /login (Auth.js `pages.signIn`). /admin additionally enforces
// the admin ROLE at the page/action level (lib/admin.ts requireAdmin) —
// middleware only guarantees a session, not a role.
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/track/:path*",
    "/dashboard/:path*",
    "/charts/:path*",
    "/profile/:path*",
    "/history/:path*",
    "/goals/:path*",
    "/dishes/:path*",
    "/billing/:path*",
    "/admin/:path*",
  ],
};
