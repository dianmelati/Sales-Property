"use server";

import { revalidatePublic } from "@/server/revalidate";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { allKeys } from "@/lib/media/urls";
import { getStorage } from "@/lib/media/storage";
import { audit } from "@/server/audit";

const refresh = (propertyId: string) => { revalidatePath(`/admin/properties/${propertyId}/edit`); revalidatePath("/admin/floor-plans"); revalidatePath("/properties"); revalidatePublic(); };

export async function renameFloorPlan(propertyId: string, id: string, fd: FormData) {
  await requirePermission("property:write");
  const label = z.string().trim().min(1).max(60).safeParse(fd.get("label"));
  if (!label.success) return;
  await prisma.floorPlan.updateMany({ where: { id, propertyId }, data: { label: label.data } });
  refresh(propertyId);
}

export async function moveFloorPlan(propertyId: string, id: string, dir: "up" | "down") {
  await requirePermission("property:write");
  const list = await prisma.floorPlan.findMany({ where: { propertyId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((x) => x.id === id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((x, k) => prisma.floorPlan.update({ where: { id: x.id }, data: { sortOrder: k } })));
  refresh(propertyId);
}

export async function removeFloorPlan(propertyId: string, id: string) {
  const user = await requirePermission("property:write");
  const plan = await prisma.floorPlan.findFirst({ where: { id, propertyId }, include: { media: true } });
  if (!plan) return;
  await prisma.floorPlan.delete({ where: { id } });
  const storage = getStorage();
  await Promise.allSettled(allKeys(plan.media.variants).map((k) => storage.delete(k)));
  await prisma.media.delete({ where: { id: plan.mediaId } }).catch(() => {});
  await audit({ userId: user.id, action: "floorplan.delete", entity: "Property", entityId: propertyId, diff: { label: plan.label } });
  refresh(propertyId);
}
