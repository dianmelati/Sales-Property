import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { abs } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [props, locs, agents, hiddenPages] = await Promise.all([
    prisma.property.findMany({ where: { status: "PUBLISHED", deletedAt: null, NOT: { seo: { is: { noIndex: true } } } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 40000 }),
    prisma.propertyLocation.findMany({ where: { properties: { some: { status: "PUBLISHED", deletedAt: null } }, NOT: { seo: { is: { noIndex: true } } } }, select: { slug: true, updatedAt: true } }),
    prisma.agent.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.seoMetadata.findMany({ where: { noIndex: true, pageId: { not: null } }, select: { page: { select: { key: true } } } }),
  ]);
  const hidden = new Set(hiddenPages.map((h) => h.page?.key));
  const pages: [string, string, number][] = [["home", "/", 1], ["properties", "/properties", 0.9], ["locations", "/locations", 0.7], ["agents", "/agents", 0.6], ["about", "/about", 0.5], ["contact", "/contact", 0.5]];
  return [
    ...pages.filter(([k]) => !hidden.has(k)).map(([, path, priority]) => ({ url: abs(path), changeFrequency: "daily" as const, priority })),
    ...props.map((p) => ({ url: abs(`/properties/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...locs.map((l) => ({ url: abs(`/locations/${l.slug}`), lastModified: l.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...agents.map((a) => ({ url: abs(`/agents/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
