import { z } from "zod";
import { revalidatePublic } from "@/server/revalidate";
import { prisma } from "@/lib/prisma";
import { apiAuth, fail, ok } from "@/lib/api";
import { allKeys } from "@/lib/media/urls";
import { getStorage } from "@/lib/media/storage";
import { InvalidImageError, MAX_UPLOAD_BYTES } from "@/lib/media/process-image";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";
import { ingestFloorPlan } from "@/server/media/ingest";

export const runtime = "nodejs";
const field = z.object({ propertyId: z.string().min(1).max(40), label: z.string().trim().min(1, "Enter a label").max(60), floorPlanId: z.string().max(40).optional() });

/** Unggah denah baru, atau ganti file denah yang ada (kirim floorPlanId). */
export async function POST(req: Request) {
  const auth = await apiAuth(req, "property:write", true);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const limit = (await hit(`upload:${user.id}`, 60, 10 * 60_000));
  if (!limit.ok) return fail("RATE_LIMITED", `Too many uploads. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`, 429);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 1024 * 1024) return fail("TOO_LARGE", "File exceeds 25 MB.", 413);

  let fd: FormData;
  try { fd = await req.formData(); } catch { return fail("BAD_REQUEST", "The upload could not be read."); }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("NO_FILE", "Choose a file to upload.");
  const f = field.safeParse({ propertyId: fd.get("propertyId"), label: fd.get("label"), floorPlanId: fd.get("floorPlanId") || undefined });
  if (!f.success) return fail("INVALID", f.error.issues[0]?.message ?? "Invalid input.", 422);

  const property = await prisma.property.findFirst({ where: { id: f.data.propertyId, deletedAt: null }, select: { id: true } });
  if (!property) return fail("NOT_FOUND", "This property no longer exists.", 404);
  const existing = f.data.floorPlanId ? await prisma.floorPlan.findFirst({ where: { id: f.data.floorPlanId, propertyId: property.id }, include: { media: true } }) : null;
  if (f.data.floorPlanId && !existing) return fail("NOT_FOUND", "This floor plan no longer exists.", 404);

  try {
    const { media, kind } = await ingestFloorPlan(Buffer.from(await file.arrayBuffer()), file.name, user.id);
    let planId: string;
    if (existing) {
      await prisma.floorPlan.update({ where: { id: existing.id }, data: { mediaId: media.id, label: f.data.label } });
      planId = existing.id;
      // File lama hanya dipakai denah ini, jadi dihapus bersama objek di storage.
      const storage = getStorage();
      await Promise.allSettled(allKeys(existing.media.variants).map((k) => storage.delete(k)));
      await prisma.media.delete({ where: { id: existing.mediaId } }).catch(() => {});
    } else {
      const last = await prisma.floorPlan.findFirst({ where: { propertyId: property.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      planId = (await prisma.floorPlan.create({ data: { propertyId: property.id, mediaId: media.id, label: f.data.label, sortOrder: (last?.sortOrder ?? -1) + 1 } })).id;
    }
    await audit({ userId: user.id, action: existing ? "floorplan.replace" : "floorplan.add", entity: "Property", entityId: property.id, diff: { label: f.data.label, kind } });
    revalidatePublic();
    return ok({ id: planId, kind }, existing ? 200 : 201);
  } catch (e) {
    if (e instanceof InvalidImageError) return fail(e.code, e.message, e.code === "TOO_LARGE" ? 413 : 422);
    console.error("floor plan upload failed", e);
    return fail("UPLOAD_FAILED", "The upload failed. Please try again.", 500);
  }
}
