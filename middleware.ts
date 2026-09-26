// Edge gate: /track, /dashboard, /profile and /history require a signed-in user.
// Everyone else is bounced to /login (Auth.js `pages.signIn`).
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/track/:path*", "/dashboard/:path*", "/profile/:path*", "/history/:path*"],
};
