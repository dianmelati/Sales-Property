"use server";

import { revalidatePublic } from "@/server/revalidate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { slugify } from "@/lib/slug";
import { audit } from "@/server/audit";

export interface LocationState { message?: string; errors?: Record<string, string> }

const opt = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const coord = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());
const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(90).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(100),
  province: opt(100), description: opt(2000), coverId: opt(40), latitude: coord(-90, 90), longitude: coord(-180, 180),
}).refine((v) => (v.latitude == null) === (v.longitude == null), { message: "Enter both latitude and longitude, or leave both empty", path: ["latitude"] });

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "location";
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await prisma.propertyLocation.findFirst({ where: { slug: s, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } }))) return s;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveLocation(id: string | null, _: LocationState, fd: FormData): Promise<LocationState> {
  const user = await requirePermission("property:write");
  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const v = p.data;
  if (id && !(await prisma.propertyLocation.findUnique({ where: { id }, select: { id: true } }))) return { message: "This location no longer exists." };
  if (v.coverId && !(await prisma.media.findFirst({ where: { id: v.coverId, kind: "IMAGE", deletedAt: null }, select: { id: true } }))) return { message: "The chosen image is no longer in the library.", errors: { coverId: "Choose another image" } };
  const data = {
    name: v.name, slug: await uniqueSlug(v.slug || v.name, id ?? undefined), city: v.city, province: v.province ?? null,
    description: v.description ?? null, coverId: v.coverId ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null,
  };
  const saved = id ? await prisma.propertyLocation.update({ where: { id }, data }) : await prisma.propertyLocation.create({ data });
  await audit({ userId: user.id, action: id ? "location.update" : "location.create", entity: "PropertyLocation", entityId: saved.id, diff: { name: v.name } });
  revalidatePath("/admin/locations"); revalidatePath("/locations"); revalidatePublic(); revalidatePath("/");
  redirect("/admin/locations");
}

export async function deleteLocation(id: string) {
  const user = await requirePermission("property:delete");
  const l = await prisma.propertyLocation.findUnique({ where: { id }, include: { _count: { select: { properties: { where: { deletedAt: null } } } } } });
  if (!l || l._count.properties > 0) return; // tombol hanya muncul bila kosong; ini pengaman di server
  await prisma.propertyLocation.delete({ where: { id } }).catch(() => {});
  await audit({ userId: user.id, action: "location.delete", entity: "PropertyLocation", entityId: id, diff: { name: l.name } });
  revalidatePath("/admin/locations"); revalidatePath("/locations"); revalidatePublic();
}
