// Desi Cal AI — Auth.js (NextAuth v5) configuration.
//
// Strategy: JWT sessions (stateless, signed with AUTH_SECRET). JWT was chosen
// over database sessions deliberately: the edge middleware must verify the
// session without a database round-trip, and Prisma cannot run on the edge.
// Every private page/API route still gets a server-verified identity —
// session.user.id is the ONLY source of userId anywhere in the app.
//
// SECURITY notes (non-negotiable checklist):
// - Passwords: bcrypt, cost factor 12. Never stored or logged in plain text.
// - authorize() never reveals whether the email or the password was wrong.
// - Login attempts rate-limited per IP (10 / 10 min).
// - OAuth: Google provider only, server-side env vars, no secrets in client.

import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Rate-limit login attempts per IP before touching the DB.
        const ip = clientIp(headers());
        if (!checkRateLimit(`login:${ip}`, 10, 10 * 60 * 1000)) {
          // Same silent failure as a bad password — no info leak.
          return null;
        }

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        // passwordHash is NULL for Google-only accounts — they must use Google.
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // Enable by setting GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (see .env.example).
    Google({
      // Same email as an existing credentials account -> link it (safe: Google
      // verified the email address).
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Edge middleware gate: only signed-in users reach protected routes.
    authorized: async ({ auth }) => !!auth?.user,

    jwt: async ({ token, user }) => {
      if (user?.id) token.id = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
