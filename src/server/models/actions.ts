"use server";

import { revalidatePublic } from "@/server/revalidate";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { allKeys } from "@/lib/media/urls";
import { getStorage } from "@/lib/media/storage";
import { LIGHT_PRESETS } from "@/components/model-viewer/types";
import { audit } from "@/server/audit";

const refresh = (propertyId: string) => { revalidatePath(`/admin/properties/${propertyId}/edit`); revalidatePath("/admin/models"); revalidatePath("/properties"); revalidatePublic(); };
const num = z.number().finite().min(-1e6).max(1e6);
const camera = z.object({ position: z.tuple([num, num, num]), target: z.tuple([num, num, num]), fov: z.number().min(10).max(100) });

export async function renameModel(propertyId: string, id: string, fd: FormData) {
  await requirePermission("property:write");
  const label = z.string().trim().min(1).max(60).safeParse(fd.get("label"));
  if (label.success) await prisma.threeDModel.updateMany({ where: { id, propertyId }, data: { label: label.data } });
  refresh(propertyId);
}

export async function setLightPreset(propertyId: string, id: string, preset: string) {
  await requirePermission("property:write");
  if (!(LIGHT_PRESETS as readonly string[]).includes(preset)) return;
  await prisma.threeDModel.updateMany({ where: { id, propertyId }, data: { lightPreset: preset } });
  refresh(propertyId);
}

export async function makeDefaultModel(propertyId: string, id: string) {
  await requirePermission("property:write");
  if (!(await prisma.threeDModel.findFirst({ where: { id, propertyId }, select: { id: true } }))) return;
  await prisma.$transaction([
    prisma.threeDModel.updateMany({ where: { propertyId }, data: { isDefault: false } }),
    prisma.threeDModel.update({ where: { id }, data: { isDefault: true } }),
  ]);
  refresh(propertyId);
}

/** `config = null` mengembalikan ke framing otomatis. */
export async function saveCamera(propertyId: string, id: string, config: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await requirePermission("property:write");
  const m = await prisma.threeDModel.findFirst({ where: { id, propertyId }, select: { id: true } });
  if (!m) return { ok: false, message: "This model no longer exists." };
  let data: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
  if (config !== null) {
    const p = camera.safeParse(config);
    if (!p.success) return { ok: false, message: "That camera position is not valid." };
    data = p.data as unknown as Prisma.InputJsonValue;
  }
  await prisma.threeDModel.update({ where: { id }, data: { cameraConfig: data } });
  await audit({ userId: user.id, action: config === null ? "model.camera_reset" : "model.camera_set", entity: "Property", entityId: propertyId });
  refresh(propertyId);
  return { ok: true, message: config === null ? "Camera reset to automatic framing." : "Camera saved. Visitors will start from this view." };
}

export async function removeModel(propertyId: string, id: string) {
  const user = await requirePermission("property:write");
  const m = await prisma.threeDModel.findFirst({ where: { id, propertyId }, include: { media: true } });
  if (!m) return;
  await prisma.threeDModel.delete({ where: { id } });
  const storage = getStorage();
  await Promise.allSettled(allKeys(m.media.variants).map((k) => storage.delete(k)));
  await prisma.media.delete({ where: { id: m.mediaId } }).catch(() => {});
  if (m.isDefault) {
    const next = await prisma.threeDModel.findFirst({ where: { propertyId }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (next) await prisma.threeDModel.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  await audit({ userId: user.id, action: "model.delete", entity: "Property", entityId: propertyId, diff: { label: m.label } });
  refresh(propertyId);
}
