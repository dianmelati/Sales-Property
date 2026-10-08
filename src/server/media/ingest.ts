import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { InvalidImageError, processImage, sniffMime, type ProcessedImage, type VariantName } from "@/lib/media/process-image";
import { getStorage } from "@/lib/media/storage";
import { assertSafeSvg } from "@/lib/media/svg";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic" } as const;
const baseName = (n: string) => slugify(n.replace(/\.[^.]+$/, "")) || "file";

/** Menyimpan semua varian WebP + metadata. Bila DB gagal, objek yang sudah diunggah dibersihkan. */
async function persist(processed: ProcessedImage, original: { buffer: Buffer; ext: string; mime: string } | null, name: string, userId: string, kind: MediaKind, mimeType: string, sizeBytes: number) {
  const storage = getStorage();
  const id = randomUUID();
  const base = baseName(name);
  const keys: Record<string, string> = {};
  try {
    for (const v of Object.keys(processed.variants) as VariantName[]) {
      const key = `media/${id}/${base}-${v}.webp`;
      await storage.put(key, processed.variants[v].buffer, "image/webp");
      keys[v] = key;
    }
    if (original && process.env.STORE_ORIGINALS === "true") {
      const key = `media/${id}/${base}-original.${original.ext}`;
      await storage.put(key, original.buffer, original.mime);
      keys.original = key;
    }
    return await prisma.media.create({
      data: { id, kind, name: name.slice(0, 200), mimeType, sizeBytes, width: processed.width, height: processed.height, blurDataUrl: processed.blurDataUrl, isWebp: true, variants: keys, uploadedById: userId },
    });
  } catch (e) {
    await Promise.allSettled(Object.values(keys).map((k) => storage.delete(k)));
    throw e;
  }
}

export async function ingestImage(buffer: Buffer, originalName: string, userId: string) {
  const processed = await processImage(buffer);
  return persist(processed, { buffer, ext: EXT[processed.sourceMime], mime: processed.sourceMime }, originalName, userId, "IMAGE", processed.sourceMime, buffer.length);
}

// ───────── Denah: PNG, JPG, SVG, PDF ─────────
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_SVG_BYTES = 5 * 1024 * 1024;

export type PlanKind = "image" | "pdf";

export async function ingestFloorPlan(buffer: Buffer, originalName: string, userId: string): Promise<{ media: Awaited<ReturnType<typeof persist>>; kind: PlanKind }> {
  const head = buffer.subarray(0, 2048).toString("latin1").replace(/^\uFEFF/, "").trimStart();

  if (head.startsWith("%PDF-")) {
    if (buffer.length > MAX_PDF_BYTES) throw new InvalidImageError("TOO_LARGE", "PDF exceeds 20 MB.");
    const storage = getStorage();
    const id = randomUUID();
    const key = `media/${id}/${baseName(originalName)}.pdf`;
    await storage.put(key, buffer, "application/pdf");
    try {
      const media = await prisma.media.create({
        data: { id, kind: "FLOOR_PLAN", name: originalName.slice(0, 200), mimeType: "application/pdf", sizeBytes: buffer.length, isWebp: false, variants: { file: key }, uploadedById: userId },
      });
      return { media, kind: "pdf" };
    } catch (e) { await storage.delete(key).catch(() => {}); throw e; }
  }

  if (/^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head) || (head.startsWith("<?xml") && buffer.toString("utf8", 0, 4096).includes("<svg"))) {
    if (buffer.length > MAX_SVG_BYTES) throw new InvalidImageError("TOO_LARGE", "SVG exceeds 5 MB.");
    const text = buffer.toString("utf8");
    assertSafeSvg(text);
    let png: Buffer;
    try {
      png = await sharp(Buffer.from(text), { density: 150, limitInputPixels: 100_000_000 }).resize({ width: 3000 }).png().toBuffer();
    } catch { throw new InvalidImageError("UNREADABLE", "This SVG could not be rendered."); }
    const processed = await processImage(png, { plan: true, minSide: 300 });
    return { media: await persist(processed, null, originalName, userId, "FLOOR_PLAN", "image/svg+xml", buffer.length), kind: "image" };
  }

  const mime = sniffMime(buffer);
  if (mime === "image/heic") throw new InvalidImageError("BAD_TYPE", "Floor plans can be PNG, JPG, SVG or PDF.");
  const processed = await processImage(buffer, { plan: true, minSide: 300 });
  return { media: await persist(processed, { buffer, ext: EXT[processed.sourceMime], mime: processed.sourceMime }, originalName, userId, "FLOOR_PLAN", processed.sourceMime, buffer.length), kind: "image" };
}

// ───────── Model 3D (GLB/GLTF) ─────────
import { inspectModel } from "./glb";

/**
 * Satu-satunya pintu masuk model 3D. Alur Blender -> GLB -> unggah berakhir di sini, sehingga jalur pembuatan model otomatis
 * (misalnya dari denah 2D) kelak cukup memanggil fungsi ini dengan hasilnya.
 */
export async function ingestModel(buffer: Buffer, originalName: string, userId: string) {
  const { ext, mime } = inspectModel(buffer);
  const storage = getStorage();
  const id = randomUUID();
  const key = `media/${id}/${baseName(originalName)}.${ext}`;
  await storage.put(key, buffer, mime);
  try {
    return await prisma.media.create({
      data: { id, kind: "MODEL", name: originalName.slice(0, 200), mimeType: mime, sizeBytes: buffer.length, isWebp: false, variants: { file: key }, uploadedById: userId },
    });
  } catch (e) { await storage.delete(key).catch(() => {}); throw e; }
}
