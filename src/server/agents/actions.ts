"use server";

import { revalidatePublic } from "@/server/revalidate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { slugify } from "@/lib/slug";
import { audit } from "@/server/audit";

export interface AgentFormState { message?: string; errors?: Record<string, string> }

const opt = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(90).optional().or(z.literal("")),
  title: opt(100), bio: opt(1500),
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(30).refine((v) => /^[+\d\s()-]+$/.test(v) && v.replace(/\D/g, "").length >= 8, "Enter a valid phone number").optional()),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email("Enter a valid email").max(254).optional()),
  photoId: opt(40), userId: opt(40),
  isFeatured: z.preprocess((v) => v === "on", z.boolean()),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "agent";
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await prisma.agent.findFirst({ where: { slug: s, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } }))) return s;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveAgent(id: string | null, _: AgentFormState, fd: FormData): Promise<AgentFormState> {
  const user = await requirePermission("agent:write");
  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const v = p.data;
  const existing = id ? await prisma.agent.findFirst({ where: { id, deletedAt: null } }) : null;
  if (id && !existing) return { message: "This agent no longer exists." };

  if (v.photoId && !(await prisma.media.findFirst({ where: { id: v.photoId, kind: "IMAGE", deletedAt: null }, select: { id: true } }))) {
    return { message: "The chosen photo is no longer in the library.", errors: { photoId: "Choose another photo" } };
  }
  // Menautkan akun login ke profil agen menentukan lead apa yang boleh dilihat, jadi hanya untuk yang berhak mengelola pengguna.
  let userId = existing?.userId ?? null;
  if (can(user.role, "user:manage")) {
    userId = v.userId ?? null;
    if (userId) {
      const u = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, role: { name: "AGENT" } }, select: { id: true } });
      if (!u) return { message: "Choose a valid login account.", errors: { userId: "Account not found" } };
      const taken = await prisma.agent.findFirst({ where: { userId, ...(id ? { id: { not: id } } : {}) }, select: { name: true } });
      if (taken) return { message: "That login is already linked.", errors: { userId: `Already linked to ${taken.name}` } };
    }
  }
  const data = {
    name: v.name, slug: await uniqueSlug(v.slug || v.name, id ?? undefined), title: v.title ?? null, bio: v.bio ?? null,
    phone: v.phone ?? null, email: v.email ?? null, photoId: v.photoId ?? null, userId, isFeatured: v.isFeatured, isActive: v.isActive,
  };
  const saved = id ? await prisma.agent.update({ where: { id }, data }) : await prisma.agent.create({ data });
  await audit({ userId: user.id, action: id ? "agent.update" : "agent.create", entity: "Agent", entityId: saved.id, diff: { name: v.name } });
  revalidatePath("/admin/agents"); revalidatePath("/"); revalidatePublic();
  redirect("/admin/agents");
}

export async function deleteAgent(id: string) {
  const user = await requirePermission("agent:write");
  const a = await prisma.agent.findFirst({ where: { id, deletedAt: null }, select: { name: true } });
  if (!a) return;
  // Soft delete. Properti dilepas dari agen ini; lead lama tetap mencatat siapa yang menanganinya.
  await prisma.$transaction([
    prisma.property.updateMany({ where: { agentId: id }, data: { agentId: null } }),
    prisma.agent.update({ where: { id }, data: { deletedAt: new Date(), isActive: false, isFeatured: false, userId: null } }),
  ]);
  await audit({ userId: user.id, action: "agent.delete", entity: "Agent", entityId: id, diff: { name: a.name } });
  revalidatePath("/admin/agents"); revalidatePath("/"); revalidatePublic();
}
