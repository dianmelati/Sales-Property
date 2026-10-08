import "server-only";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { abs, SITE_NAME } from "@/lib/site";
import { getSiteSettings } from "@/server/cms/settings";

export const PAGE_KEYS = { home: "Homepage", properties: "Property listing", locations: "Locations", agents: "Agents", about: "About", contact: "Contact" } as const;
export type PageKey = keyof typeof PAGE_KEYS;

export interface SeoRow { title: string | null; description: string | null; keywords: string | null; canonical: string | null; noIndex: boolean; ogImage?: { variants: unknown } | null }

export async function getPageSeo(key: PageKey): Promise<SeoRow | null> {
  return prisma.seoMetadata.findFirst({ where: { page: { key } }, include: { ogImage: { select: { variants: true } } } });
}

/** Judul dan deskripsi dari kolom SEO bila diisi, selain itu dari cadangan. Situs tidak pernah dibiarkan tanpa metadata. */
export function buildMetadata(o: { seo?: SeoRow | null; title: string; description: string; path: string; image?: string | null; absoluteTitle?: boolean; noIndex?: boolean }): Metadata {
  const title = o.seo?.title || o.title;
  const description = o.seo?.description || o.description;
  const og = o.seo?.ogImage ? variantUrls(o.seo.ogImage.variants).large : o.image ?? undefined;
  const noindex = o.noIndex || o.seo?.noIndex;
  return {
    title: o.absoluteTitle ? { absolute: title } : title,
    description,
    keywords: o.seo?.keywords || undefined,
    alternates: { canonical: o.seo?.canonical || o.path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description, url: o.path, siteName: SITE_NAME, images: og ? [{ url: og }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: og ? [og] : undefined },
  };
}

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});

export async function organizationLd() {
  const s = await getSiteSettings();
  const sameAs = Object.values(s.social).filter(Boolean);
  return {
    "@context": "https://schema.org", "@type": "RealEstateAgent", name: SITE_NAME, url: abs("/"),
    telephone: s.contact.phone || undefined, email: s.contact.email || undefined,
    address: s.contact.address ? { "@type": "PostalAddress", streetAddress: s.contact.address } : undefined,
    openingHours: s.contact.hours || undefined, sameAs: sameAs.length ? sameAs : undefined,
  };
}

export const websiteLd = () => ({
  "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: abs("/"),
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${abs("/properties")}?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});
