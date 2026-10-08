import { Prisma } from "@prisma/client";
import { revalidatePublic } from "@/server/revalidate";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiAuth, fail, ok } from "@/lib/api";
import { allKeys } from "@/lib/media/urls";
import { getStorage } from "@/lib/media/storage";
import { InvalidImageError } from "@/lib/media/process-image";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";
import { MAX_MODEL_BYTES } from "@/server/media/glb";
import { ingestModel } from "@/server/media/ingest";

export const runtime = "nodejs";
const field = z.object({ propertyId: z.string().min(1).max(40), label: z.string().trim().min(1, "Enter a label").max(60), modelId: z.string().max(40).optional() });

/** Unggah model baru, atau ganti file model yang ada (kirim modelId). */
export async function POST(req: Request) {
  const auth = await apiAuth(req, "property:write", true);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const limit = (await hit(`upload:${user.id}`, 60, 10 * 60_000));
  if (!limit.ok) return fail("RATE_LIMITED", `Too many uploads. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`, 429);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_MODEL_BYTES + 1024 * 1024) return fail("TOO_LARGE", "The model exceeds 50 MB. Compress it or reduce texture sizes.", 413);

  let fd: FormData;
  try { fd = await req.formData(); } catch { return fail("BAD_REQUEST", "The upload could not be read."); }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("NO_FILE", "Choose a .glb file to upload.");
  if (file.size > MAX_MODEL_BYTES) return fail("TOO_LARGE", "The model exceeds 50 MB. Compress it or reduce texture sizes.", 413);
  const f = field.safeParse({ propertyId: fd.get("propertyId"), label: fd.get("label"), modelId: fd.get("modelId") || undefined });
  if (!f.success) return fail("INVALID", f.error.issues[0]?.message ?? "Invalid input.", 422);

  const property = await prisma.property.findFirst({ where: { id: f.data.propertyId, deletedAt: null }, select: { id: true } });
  if (!property) return fail("NOT_FOUND", "This property no longer exists.", 404);
  const existing = f.data.modelId ? await prisma.threeDModel.findFirst({ where: { id: f.data.modelId, propertyId: property.id }, include: { media: true } }) : null;
  if (f.data.modelId && !existing) return fail("NOT_FOUND", "This model no longer exists.", 404);

  try {
    const media = await ingestModel(Buffer.from(await file.arrayBuffer()), file.name, user.id);
    let id: string;
    if (existing) {
      // Geometri berubah, jadi kamera tersimpan tidak lagi berlaku.
      await prisma.threeDModel.update({ where: { id: existing.id }, data: { mediaId: media.id, label: f.data.label, cameraConfig: Prisma.DbNull } });
      id = existing.id;
      const storage = getStorage();
      await Promise.allSettled(allKeys(existing.media.variants).map((k) => storage.delete(k)));
      await prisma.media.delete({ where: { id: existing.mediaId } }).catch(() => {});
    } else {
      const count = await prisma.threeDModel.count({ where: { propertyId: property.id } });
      id = (await prisma.threeDModel.create({ data: { propertyId: property.id, mediaId: media.id, label: f.data.label, isDefault: count === 0 } })).id;
    }
    await audit({ userId: user.id, action: existing ? "model.replace" : "model.add", entity: "Property", entityId: property.id, diff: { label: f.data.label, bytes: media.sizeBytes } });
    revalidatePublic();
    return ok({ id }, existing ? 200 : 201);
  } catch (e) {
    if (e instanceof InvalidImageError) return fail(e.code, e.message, e.code === "TOO_LARGE" ? 413 : 422);
    console.error("model upload failed", e);
    return fail("UPLOAD_FAILED", "The upload failed. Please try again.", 500);
  }
}
