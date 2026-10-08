"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/server/audit";

export interface UserFormState { message?: string; errors?: Record<string, string> }

const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "AGENT"] as const;
const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  role: z.enum(ROLES),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
  password: z.string().max(128, "At most 128 characters").optional(),
});

export async function saveUser(id: string | null, _: UserFormState, fd: FormData): Promise<UserFormState> {
  const me = await requirePermission("user:manage");
  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const v = p.data;
  const password = v.password?.trim() ? v.password : undefined;
  if (!id && !password) return { message: "Set a password for the new user.", errors: { password: "Required for a new user" } };
  if (password && (password.length < 10 || password.toLowerCase() === v.email || password.toLowerCase() === v.name.toLowerCase())) {
    return { message: "Choose a stronger password.", errors: { password: "Use at least 10 characters that are not the name or email" } };
  }

  const dup = await prisma.user.findFirst({ where: { email: v.email, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (dup) return { message: "That email is already used.", errors: { email: "Already used by another account" } };

  const existing = id ? await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: true } }) : null;
  if (id && !existing) return { message: "This user no longer exists." };

  if (existing) {
    // Mencegah terkunci dari sistem: tidak boleh menurunkan atau menonaktifkan diri sendiri, dan harus tersisa satu super admin aktif.
    if (existing.id === me.id && (v.role !== existing.role.name || !v.isActive)) {
      return { message: "You cannot change your own role or deactivate yourself.", errors: { role: "Ask another super admin to do this" } };
    }
    const losingSuper = existing.role.name === "SUPER_ADMIN" && existing.isActive && (v.role !== "SUPER_ADMIN" || !v.isActive);
    if (losingSuper && (await prisma.user.count({ where: { id: { not: existing.id }, isActive: true, deletedAt: null, role: { name: "SUPER_ADMIN" } } })) === 0) {
      return { message: "At least one active super admin must remain.", errors: { role: "This is the last active super admin" } };
    }
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { name: v.role } });
  const passwordHash = password ? await hashPassword(password) : undefined;
  const saved = id
    ? await prisma.user.update({ where: { id }, data: { name: v.name, email: v.email, roleId: role.id, isActive: v.isActive, ...(passwordHash && { passwordHash, sessionsValidAfter: new Date() }) } })
    : await prisma.user.create({ data: { name: v.name, email: v.email, roleId: role.id, isActive: v.isActive, passwordHash: passwordHash! } });

  await audit({
    userId: me.id, action: id ? "user.update" : "user.create", entity: "User", entityId: saved.id,
    diff: { email: v.email, role: v.role, isActive: v.isActive, passwordChanged: !!passwordHash, previousRole: existing?.role.name },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
