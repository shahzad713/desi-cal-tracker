// Edge gate: /track, /dashboard, /charts, /profile, /history, /goals and
// /dishes require a signed-in user. Everyone else is bounced to /login
// (Auth.js `pages.signIn`).
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
  ],
};
