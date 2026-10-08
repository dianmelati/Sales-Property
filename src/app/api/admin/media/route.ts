import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiAuth, fail, ok } from "@/lib/api";
import { variantUrls } from "@/lib/media/urls";
import { InvalidImageError, MAX_UPLOAD_BYTES } from "@/lib/media/process-image";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/server/audit";
import { ingestImage } from "@/server/media/ingest";

export const runtime = "nodejs";
const PAGE = 48;

export function serializeMedia(m: { id: string; name: string; alt: string | null; mimeType: string; sizeBytes: number; width: number | null; height: number | null; isWebp: boolean; createdAt: Date; variants: unknown }) {
  return {
    id: m.id, name: m.name, alt: m.alt, mimeType: m.mimeType, sizeBytes: m.sizeBytes, width: m.width, height: m.height,
    isWebp: m.isWebp, createdAt: m.createdAt.toISOString(), urls: variantUrls(m.variants),
  };
}

export async function GET(req: Request) {
  const auth = await apiAuth(req, "media:read");
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const usage = sp.get("usage");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const where: Prisma.MediaWhereInput = { deletedAt: null, kind: "IMAGE" };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (usage === "used") where.propertyImages = { some: {} };
  if (usage === "unused") where.propertyImages = { none: {} };

  const [rows, total] = await Promise.all([
    prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.media.count({ where }),
  ]);
  return ok({ items: rows.map(serializeMedia), total, page, pages: Math.max(1, Math.ceil(total / PAGE)) });
}

export async function POST(req: Request) {
  const auth = await apiAuth(req, "media:write", true);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const limit = (await hit(`upload:${user.id}`, 60, 10 * 60_000));
  if (!limit.ok) return fail("RATE_LIMITED", `Too many uploads. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`, 429);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 1024 * 1024) return fail("TOO_LARGE", "File exceeds 25 MB.", 413);

  let file: File | null = null;
  try {
    const f = (await req.formData()).get("file");
    file = f instanceof File ? f : null;
  } catch {
    return fail("BAD_REQUEST", "The upload could not be read.");
  }
  if (!file || file.size === 0) return fail("NO_FILE", "Choose an image to upload.");

  try {
    const media = await ingestImage(Buffer.from(await file.arrayBuffer()), file.name, user.id);
    await audit({ userId: user.id, action: "media.upload", entity: "Media", entityId: media.id, diff: { name: media.name, bytes: media.sizeBytes } });
    return ok(serializeMedia(media), 201);
  } catch (e) {
    if (e instanceof InvalidImageError) return fail(e.code, e.message, e.code === "TOO_LARGE" ? 413 : 422);
    console.error("media upload failed", e);
    return fail("UPLOAD_FAILED", "The upload failed. Please try again.", 500);
  }
}
