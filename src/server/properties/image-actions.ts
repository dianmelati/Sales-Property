"use server";

import { revalidatePublic } from "@/server/revalidate";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const refresh = (propertyId: string) => { revalidatePath(`/admin/properties/${propertyId}/edit`); revalidatePath("/properties"); revalidatePublic(); };

async function ensureProperty(id: string) {
  const p = await prisma.property.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!p) throw new Error("Property not found");
}

export async function attachImages(propertyId: string, mediaIds: string[]) {
  const user = await requirePermission("property:write");
  await ensureProperty(propertyId);
  const ids = [...new Set(mediaIds)].slice(0, 50);
  const valid = await prisma.media.findMany({ where: { id: { in: ids }, kind: "IMAGE", deletedAt: null }, select: { id: true } });
  if (!valid.length) return;

  const existing = await prisma.propertyImage.findMany({ where: { propertyId }, select: { sortOrder: true, isCover: true } });
  let order = existing.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
  const hasCover = existing.some((i) => i.isCover);
  await prisma.propertyImage.createMany({
    data: valid.map((m, i) => ({ propertyId, mediaId: m.id, sortOrder: order++, isCover: !hasCover && i === 0 })),
    skipDuplicates: true,
  });
  await audit({ userId: user.id, action: "property.images_add", entity: "Property", entityId: propertyId, diff: { count: valid.length } });
  refresh(propertyId);
}

export async function removeImage(propertyId: string, propertyImageId: string) {
  const user = await requirePermission("property:write");
  const img = await prisma.propertyImage.findFirst({ where: { id: propertyImageId, propertyId } });
  if (!img) return;
  await prisma.propertyImage.delete({ where: { id: img.id } });
  if (img.isCover) {
    const first = await prisma.propertyImage.findFirst({ where: { propertyId }, orderBy: { sortOrder: "asc" } });
    if (first) await prisma.propertyImage.update({ where: { id: first.id }, data: { isCover: true } });
  }
  await audit({ userId: user.id, action: "property.images_remove", entity: "Property", entityId: propertyId });
  refresh(propertyId);
}

export async function setCover(propertyId: string, propertyImageId: string) {
  await requirePermission("property:write");
  const img = await prisma.propertyImage.findFirst({ where: { id: propertyImageId, propertyId }, select: { id: true } });
  if (!img) return;
  await prisma.$transaction([
    prisma.propertyImage.updateMany({ where: { propertyId }, data: { isCover: false } }),
    prisma.propertyImage.update({ where: { id: img.id }, data: { isCover: true } }),
  ]);
  refresh(propertyId);
}

export async function moveImage(propertyId: string, propertyImageId: string, direction: "up" | "down") {
  await requirePermission("property:write");
  const list = await prisma.propertyImage.findMany({ where: { propertyId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((x) => x.id === propertyImageId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  // Renormalisasi urutan 0..n agar tidak ada nilai kembar.
  await prisma.$transaction(list.map((x, idx) => prisma.propertyImage.update({ where: { id: x.id }, data: { sortOrder: idx } })));
  refresh(propertyId);
}
