import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import type { CardImage } from "@/types/property";
import { getSiteSettings } from "@/server/cms/settings";

/** Halaman detail terbuka untuk properti yang sudah tayang, termasuk yang sudah reserved/sold/rented (URL lama tetap hidup). */
export const getPublicProperty = cache(async (slug: string) =>
  prisma.property.findFirst({
    where: { slug, deletedAt: null, status: { in: ["PUBLISHED", "RESERVED", "SOLD", "RENTED"] } },
    include: {
      category: { select: { name: true, slug: true } },
      location: { select: { name: true, slug: true, city: true } },
      agent: { select: { isActive: true, slug: true, name: true, title: true, phone: true, email: true, photo: { select: { variants: true, alt: true } } } },
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], include: { media: { select: { variants: true, blurDataUrl: true, alt: true, name: true, width: true, height: true } } } },
      features: { orderBy: { sortOrder: "asc" }, select: { label: true } },
      models: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], include: { media: { select: { variants: true, sizeBytes: true } } } },
      floorPlans: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { media: { select: { variants: true, mimeType: true, alt: true } } } },
      seo: { include: { ogImage: { select: { variants: true } } } },
    },
  }),
);
export type PublicProperty = NonNullable<Awaited<ReturnType<typeof getPublicProperty>>>;

export function toImages(p: PublicProperty): CardImage[] {
  return p.images.map((i) => {
    const u = variantUrls(i.media.variants);
    return { src: u.large, srcSet: `${u.small} 640w, ${u.medium} 1280w, ${u.large} 2200w`, blur: i.media.blurDataUrl, alt: i.media.alt || `${p.title}, photo`, width: i.media.width, height: i.media.height };
  });
}

/** Nomor WhatsApp dikelola di Admin > Settings. Kosong atau tidak valid = tombol disembunyikan. */
export async function getWhatsAppNumber(): Promise<string | null> {
  return (await getSiteSettings()).whatsapp;
}

import type { PlanView } from "@/components/floor-plan-viewer";
export function toPlanViews(p: PublicProperty): PlanView[] {
  return p.floorPlans.map((f) => {
    const u = variantUrls(f.media.variants);
    const pdf = f.media.mimeType === "application/pdf";
    return { id: f.id, label: f.label, kind: pdf ? "pdf" : "image", src: u.large, srcSet: `${u.small} 640w, ${u.medium} 1280w, ${u.large} 3000w`, pdfUrl: u.file, alt: f.media.alt || `${p.title}, ${f.label} floor plan` };
  });
}

import type { CameraConfig, LightPreset, ModelView } from "@/components/model-viewer/types";
export function toModelViews(p: PublicProperty): ModelView[] {
  return p.models.map((m) => ({
    id: m.id, label: m.label, url: variantUrls(m.media.variants).file, sizeBytes: m.media.sizeBytes,
    lightPreset: (["studio", "daylight", "sunset"].includes(m.lightPreset) ? m.lightPreset : "studio") as LightPreset,
    camera: m.cameraConfig && typeof m.cameraConfig === "object" ? (m.cameraConfig as unknown as CameraConfig) : null,
  }));
}
