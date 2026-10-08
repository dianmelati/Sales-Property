import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { toCardImage } from "@/lib/media/card-image";
import { buildMetadata, getPageSeo } from "@/server/seo/meta";

// ISR: HTML di-cache dan disegarkan tiap 5 menit, atau langsung saat admin menyimpan (revalidatePublic).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ seo: await getPageSeo("locations"), title: "Locations", description: "Browse our properties by area.", path: "/locations" });
}

export default async function LocationsPage() {
  const rows = await prisma.propertyLocation.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, city: true, cover: { select: { variants: true, blurDataUrl: true, alt: true, width: true, height: true } }, _count: { select: { properties: { where: { status: "PUBLISHED", deletedAt: null } } } } },
  });
  const list = rows.filter((r) => r._count.properties > 0).sort((a, b) => b._count.properties - a._count.properties);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-5xl lg:text-6xl">Locations</h1>
        <p className="mt-4 max-w-xl text-mist">Every area where we currently have properties.</p>
        {list.length === 0 ? (
          <div className="mt-12 border-y border-basalt/15 py-16"><p className="font-serif text-3xl">No locations to show yet</p><p className="mt-3 text-sm text-mist">Areas appear here as soon as they have a published property.</p></div>
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((l, i) => (
              <Link key={l.slug} href={`/locations/${l.slug}`} className="group block">
                <div className="aspect-[3/2] overflow-hidden bg-stone"><Photo image={toCardImage(l.cover, l.name)} priority={i < 3} sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" /></div>
                <div className="mt-4 flex items-baseline justify-between gap-4"><h2 className="text-3xl">{l.name}</h2><span className="text-sm text-mist">{l._count.properties} {l._count.properties === 1 ? "property" : "properties"}</span></div>
                <p className="text-sm text-mist">{l.city}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
