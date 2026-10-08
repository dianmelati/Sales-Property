import { audit } from "@/server/audit";
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./token";
import { can, type PermissionKey } from "./permissions";

export async function createSession(userId: string, role: Parameters<typeof signSession>[0]["role"]) {
  const token = await signSession({ sub: userId, role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Memvalidasi token DAN memastikan akun masih aktif di database (role bisa berubah/dinonaktifkan). */
export async function getCurrentUser() {
  const payload = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true, sessionsValidAfter: true, role: { select: { name: true } } },
  });
  // Reset password mencabut semua sesi yang terbit sebelumnya.
  if (user?.sessionsValidAfter && (payload.iat ?? 0) < Math.floor(user.sessionsValidAfter.getTime() / 1000)) return null;
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role.name } : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Pakai di setiap server action dan route handler admin. Middleware saja tidak cukup. */
export async function requirePermission(permission: PermissionKey) {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    await audit({ userId: user.id, action: "auth.forbidden", entity: "Permission", diff: { permission } });
    redirect("/admin/forbidden");
  }
  return user;
}
