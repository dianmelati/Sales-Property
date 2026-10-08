import "server-only";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import type { SectionType } from "@/lib/cms/types";
import type { CardImage } from "@/types/property";

export interface HomeSection { id: string; type: SectionType; content: Record<string, unknown>; image: CardImage | null }

/** Seksi beranda yang terlihat, berurutan. Bila Page "home" belum punya seksi sama sekali, pakai tata letak bawaan. */
export async function getHomeSections(): Promise<HomeSection[]> {
  const page = await prisma.page.findUnique({
    where: { key: "home" },
    include: { sections: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { image: { select: { variants: true, blurDataUrl: true, alt: true, name: true, width: true, height: true } } } } },
  });
  if (!page || page.sections.length === 0) {
    return DEFAULT_HOME.map((d, i) => ({ id: `default-${i}`, type: d.type, content: d.content, image: null }));
  }
  return page.sections.filter((s) => s.isVisible).map((s) => {
    const m = s.image;
    const u = m ? variantUrls(m.variants) : null;
    return {
      id: s.id, type: s.type as SectionType, content: (s.content ?? {}) as Record<string, unknown>,
      image: m && u ? { src: u.large, srcSet: `${u.small} 640w, ${u.medium} 1280w, ${u.large} 2200w`, blur: m.blurDataUrl, alt: m.alt || "", width: m.width, height: m.height } : null,
    };
  });
}

export async function getTestimonials() {
  return prisma.testimonial.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, author: true, role: true, quote: true } });
}
export async function getFaqs() {
  return prisma.fAQ.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, question: true, answer: true } });
}

export async function getFeaturedAgents(take: number) {
  const rows = await prisma.agent.findMany({
    where: { isActive: true, isFeatured: true, deletedAt: null }, orderBy: { name: "asc" }, take,
    select: { id: true, slug: true, name: true, title: true, photo: { select: { variants: true, alt: true } } },
  });
  return rows.map((a) => ({ id: a.id, slug: a.slug, name: a.name, title: a.title, photo: a.photo ? { src: variantUrls(a.photo.variants).small, alt: a.photo.alt || a.name } : null }));
}
