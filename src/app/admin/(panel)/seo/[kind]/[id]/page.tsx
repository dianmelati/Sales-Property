import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { siteUrl } from "@/lib/site";
import { PAGE_KEYS, type PageKey } from "@/server/seo/meta";
import { SeoForm } from "./seo-form";

export const metadata = { title: "Edit SEO" };

const PATHS: Record<PageKey, string> = { home: "/", properties: "/properties", locations: "/locations", agents: "/agents", about: "/about", contact: "/contact" };

export default async function SeoEdit({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requirePermission("seo:write");
  const { kind, id } = await params;
  type Loose = { title: string | null; description: string | null; keywords: string | null; canonical: string | null; noIndex: boolean; ogImage?: { id: string; variants: unknown } | null } | null;
  let name = "", path = "";
  let seo: Loose = null;
  let fallbackTitle = "", fallbackDescription = "";

  if (kind === "page" && id in PAGE_KEYS) {
    name = PAGE_KEYS[id as PageKey]; path = PATHS[id as PageKey];
    seo = await prisma.seoMetadata.findFirst({ where: { page: { key: id } }, include: { ogImage: { select: { id: true, variants: true } } } });
    fallbackTitle = name; fallbackDescription = "Shown when this page is shared or appears in search results.";
  } else if (kind === "location") {
    const l = await prisma.propertyLocation.findUnique({ where: { id }, include: { seo: { include: { ogImage: { select: { id: true, variants: true } } } } } });
    if (!l) notFound();
    name = l.name; path = `/locations/${l.slug}`; seo = l.seo;
    fallbackTitle = `Properties in ${l.name}`; fallbackDescription = l.description?.slice(0, 160) || `Browse properties for sale and rent in ${l.name}, ${l.city}.`;
  } else notFound();

  return (
    <>
      <p className="text-sm text-mist">{kind === "page" ? "Page" : "Location"}</p>
      <h1 className="mb-10 text-4xl">{name}</h1>
      <SeoForm kind={kind as "page" | "location"} id={id} url={`${siteUrl()}${path}`} fallbackTitle={fallbackTitle} fallbackDescription={fallbackDescription}
        d={{ title: seo?.title ?? "", description: seo?.description ?? "", keywords: seo?.keywords ?? "", canonical: seo?.canonical ?? "", noIndex: seo?.noIndex ?? false }}
        og={seo?.ogImage ? { id: seo.ogImage.id, url: variantUrls(seo.ogImage.variants).medium } : null} />
    </>
  );
}
