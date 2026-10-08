"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, requireUser } from "@/lib/auth/session";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";

export interface AccountState { message?: string; errors?: Record<string, string>; saved?: boolean }

const schema = z.object({ current: z.string().min(1, "Enter your current password").max(128), next: z.string().max(128), confirm: z.string().max(128) });

/** Mengganti password sendiri. Sesi di perangkat lain dicabut; sesi ini diperbarui. */
export async function changeOwnPassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const user = await requireUser();
  const limit = await hit(`pw:${user.id}`, 5, 15 * 60_000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).` };

  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const { current, next, confirm } = p.data;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, email: true, name: true } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    await audit({ userId: user.id, action: "auth.password_change_failed", entity: "User", entityId: user.id });
    return { message: "Your current password is incorrect.", errors: { current: "Incorrect password" } };
  }
  if (next.length < 10 || next === current || next.toLowerCase() === row.email || next.toLowerCase() === row.name.toLowerCase()) {
    return { message: "Choose a stronger password.", errors: { next: "At least 10 characters, different from your current password, name and email" } };
  }
  if (next !== confirm) return { message: "The passwords do not match.", errors: { confirm: "Does not match" } };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), sessionsValidAfter: new Date() } });
  await createSession(user.id, user.role);
  await audit({ userId: user.id, action: "auth.password_change", entity: "User", entityId: user.id });
  return { saved: true, message: "Password changed. You were signed out on all other devices." };
}
