// Day 12 — admin panel ("use server").
//
// SECURITY MODEL (roadmap requirement: role check on every admin route,
// every admin action audit-logged):
// - requireAdmin() is the gate for EVERY admin page and action. It verifies
//   the session, then checks the persisted `User.isAdmin` flag via a fresh
//   DB lookup (stale sessions never matter), with a bootstrap fallback:
//   ADMIN_EMAILS (server-only env, comma-separated) grants admin to listed
//   addresses — the only way to create the first admin before any exist.
// - Every mutating admin action writes an AuditLog row (actor id+email,
//   action from a fixed allowlist, target, JSON detail). Audit rows contain
//   no secrets or password material.
// - Reads always use explicit `select` — passwordHash is never selected and
//   can never leak into admin UI responses.
// - All inputs zod-validated; admin actions are additionally rate-limited
//   per admin user (abuse backstop).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "./db";
import { auth } from "@/auth";
import { checkRateLimit } from "./rateLimit";

const ADMIN_ACTIONS_PER_MIN = 60;
const MINUTE_MS = 60 * 1000;

// --- Schemas ---

const adminActionSchema = z.enum(["admin.grant", "admin.revoke"]);

const userIdSchema = z.string().cuid("Invalid user id");

const pageSchema = z.coerce.number().int().min(1).max(1000).default(1);

const userSearchSchema = z
  .object({
    q: z.string().trim().max(100).optional().default(""),
    page: pageSchema,
  })
  .strict();

const auditListSchema = z.object({ page: pageSchema }).strict();

// --- Bootstrap ---

/** Emails listed in ADMIN_EMAILS (server env only) are treated as admins. */
function bootstrapAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export interface AdminIdentity {
  id: string;
  email: string;
}

/**
 * Non-throwing check used by the nav bar to decide whether to show the
 * Admin link. Returns false for anonymous users and on any failure.
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

/**
 * The authoritative gate: every admin page and admin action must call this
 * first. Verifies the session, then the persisted isAdmin flag with a fresh
 * DB lookup (plus the ADMIN_EMAILS bootstrap). Throws when not authorized —
 * the /admin layout converts that into a redirect home.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not authorized.");
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isAdmin: true },
  });
  if (!user) throw new Error("Not authorized.");
  if (user.isAdmin) return { id: user.id, email: user.email };
  if (bootstrapAdminEmails().includes(user.email.toLowerCase())) {
    return { id: user.id, email: user.email };
  }
  throw new Error("Not authorized.");
}

function adminRateLimit(actorId: string, action: string): void {
  if (!checkRateLimit(`admin:${actorId}:${action}`, ADMIN_ACTIONS_PER_MIN, MINUTE_MS)) {
    throw new Error("Too many admin actions. Please wait a minute.");
  }
}

/** Write an audit row for a completed admin mutation. Never throws. */
async function logAudit(input: {
  actor: AdminIdentity;
  action: z.infer<typeof adminActionSchema>;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, string | number | boolean>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actor.id,
      actorEmail: input.actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      detail: input.detail ? JSON.stringify(input.detail) : null,
    },
  });
}

// --- Dashboard stats ---

export interface AdminStats {
  usersTotal: number;
  usersToday: number;
  usersLast7d: number;
  proUsers: number;
  adminUsers: number;
  entriesTotal: number;
  entriesToday: number;
  waitlistTotal: number;
  waitlistLast7d: number;
  shareLinksTotal: number;
  auditEvents24h: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    usersTotal,
    usersToday,
    usersLast7d,
    proUsers,
    adminUsers,
    entriesTotal,
    entriesToday,
    waitlistTotal,
    waitlistLast7d,
    shareLinksTotal,
    auditEvents24h,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: last7d } } }),
    prisma.user.count({ where: { isPro: true } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.foodEntry.count(),
    prisma.foodEntry.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.waitlistSignup.count(),
    prisma.waitlistSignup.count({ where: { createdAt: { gte: last7d } } }),
    prisma.shareLink.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
  ]);

  return {
    usersTotal,
    usersToday,
    usersLast7d,
    proUsers,
    adminUsers,
    entriesTotal,
    entriesToday,
    waitlistTotal,
    waitlistLast7d,
    shareLinksTotal,
    auditEvents24h,
  };
}

// --- User management ---

// (Kept module-private: "use server" files may only export async functions.)
const ADMIN_PAGE_SIZE = 20;

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isPro: boolean;
  isAdmin: boolean;
  entries: number;
  referrals: number;
}

export interface AdminUserList {
  users: AdminUserRow[];
  page: number;
  totalPages: number;
  total: number;
  q: string;
}

export async function listAdminUsers(
  input: unknown,
): Promise<AdminUserList> {
  await requireAdmin();
  const parsed = userSearchSchema.safeParse(input);
  const { q, page } = parsed.success ? parsed.data : { q: "", page: 1 };

  const where = q
    ? {
        OR: [
          { email: { contains: q } },
          { name: { contains: q } },
        ],
      }
    : undefined;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      // Explicit select: passwordHash and Stripe ids are NEVER returned.
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isPro: true,
        isAdmin: true,
        _count: { select: { entries: true, referrals: true } },
      },
    }),
  ]);

  return {
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      isPro: u.isPro,
      isAdmin: u.isAdmin,
      entries: u._count.entries,
      referrals: u._count.referrals,
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    total,
    q,
  };
}

export interface AdminUserDetail extends AdminUserRow {
  dailyCalorieTarget: number;
  currentWeight: number | null;
  targetWeight: number | null;
  referralCode: string | null;
  shareLinks: number;
  recentEntries: {
    id: string;
    dishName: string;
    calories: number;
    createdAt: string;
  }[];
  recentAudit: {
    id: string;
    actorEmail: string;
    action: string;
    detail: string | null;
    createdAt: string;
  }[];
}

export async function getAdminUserDetail(
  id: unknown,
): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const parsed = userIdSchema.safeParse(id);
  if (!parsed.success) return null;

  const u = await prisma.user.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      isPro: true,
      isAdmin: true,
      dailyCalorieTarget: true,
      currentWeight: true,
      targetWeight: true,
      referralCode: true,
      _count: {
        select: { entries: true, referrals: true, shareLinks: true },
      },
      entries: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, dishName: true, calories: true, createdAt: true },
      },
    },
  });
  if (!u) return null;

  const audit = await prisma.auditLog.findMany({
    where: { targetId: u.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      actorEmail: true,
      action: true,
      detail: true,
      createdAt: true,
    },
  });

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
    isPro: u.isPro,
    isAdmin: u.isAdmin,
    entries: u._count.entries,
    referrals: u._count.referrals,
    dailyCalorieTarget: u.dailyCalorieTarget,
    currentWeight: u.currentWeight,
    targetWeight: u.targetWeight,
    referralCode: u.referralCode,
    shareLinks: u._count.shareLinks,
    recentEntries: u.entries.map((e) => ({
      id: e.id,
      dishName: e.dishName,
      calories: e.calories,
      createdAt: e.createdAt.toISOString(),
    })),
    recentAudit: audit.map((a) => ({
      id: a.id,
      actorEmail: a.actorEmail,
      action: a.action,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export interface SetAdminState {
  error?: string;
  ok?: boolean;
}

/**
 * Grant or revoke the admin role for a target user. Every successful call
 * is audit-logged (actor, target, action). Admins cannot demote themselves
 * (prevents accidental lockout of the panel).
 */
export async function setAdmin(
  _prev: SetAdminState,
  formData: FormData,
): Promise<SetAdminState> {
  const actor = await requireAdmin();
  adminRateLimit(actor.id, "setAdmin");

  const parsed = z
    .object({
      userId: userIdSchema,
      grant: z.enum(["true", "false"]),
    })
    .safeParse({
      userId: formData.get("userId"),
      grant: formData.get("grant"),
    });
  if (!parsed.success) return { error: "Invalid request." };

  const grant = parsed.data.grant === "true";
  const targetId = parsed.data.userId;

  if (targetId === actor.id && !grant) {
    return { error: "You cannot revoke your own admin access." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, isAdmin: true },
  });
  if (!target) return { error: "User not found." };
  if (target.isAdmin === grant) {
    return { error: grant ? "Already an admin." : "Not an admin." };
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { isAdmin: grant },
  });

  const action = adminActionSchema.parse(grant ? "admin.grant" : "admin.revoke");
  await logAudit({
    actor,
    action,
    targetType: "user",
    targetId,
    detail: { targetEmail: target.email, granted: grant },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetId}`);
  return { ok: true };
}

// --- Audit log ---

export interface AuditRow {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AuditList {
  rows: AuditRow[];
  page: number;
  totalPages: number;
  total: number;
}

// (Kept module-private: "use server" files may only export async functions.)
const AUDIT_PAGE_SIZE = 30;

export async function listAuditLog(input: unknown): Promise<AuditList> {
  await requireAdmin();
  const parsed = auditListSchema.safeParse(input);
  const page = parsed.success ? parsed.data.page : 1;

  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
  ]);

  return {
    rows: rows.map((a) => ({
      id: a.id,
      actorEmail: a.actorEmail,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    total,
  };
}
