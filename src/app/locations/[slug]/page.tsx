import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Photo } from "@/components/photo";
import { PropertyCard } from "@/components/property-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { toCardImage } from "@/lib/media/card-image";
import { variantUrls } from "@/lib/media/urls";
import { cardsByWhere } from "@/server/properties/public";
import { breadcrumbLd, buildMetadata } from "@/server/seo/meta";

export const revalidate = 300;
export async function generateStaticParams() { return []; } // dirender saat diminta pertama kali, lalu di-cache
type Params = Promise<{ slug: string }>;

const load = (slug: string) => prisma.propertyLocation.findUnique({
  where: { slug },
  include: { cover: { select: { variants: true, blurDataUrl: true, alt: true, width: true, height: true } }, seo: { include: { ogImage: { select: { variants: true } } } } },
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = await load((await params).slug);
  if (!l) return { title: "Location not found", robots: { index: false } };
  const { total } = await cardsByWhere({ locationId: l.id }, 1);
  return buildMetadata({
    seo: l.seo, title: `Properties in ${l.name}`, path: `/locations/${l.slug}`,
    description: l.description?.slice(0, 155) || `Browse ${total} ${total === 1 ? "property" : "properties"} for sale and rent in ${l.name}, ${l.city}.`,
    image: l.cover ? variantUrls(l.cover.variants).large : null, noIndex: total === 0,
  });
}

export default async function LocationPage({ params }: { params: Params }) {
  const l = await load((await params).slug);
  if (!l) notFound();
  const { items, total } = await cardsByWhere({ locationId: l.id }, 12);
  const cover = toCardImage(l.cover, l.name);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-10 lg:px-12 lg:py-14">
        <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Locations", path: "/locations" }, { name: l.name, path: `/locations/${l.slug}` }])} />
        <nav aria-label="Breadcrumb" className="text-sm text-mist"><Link href="/" className="hover:text-basalt">Home</Link> / <Link href="/locations" className="hover:text-basalt">Locations</Link> / {l.name}</nav>
        <div className={`mt-8 grid gap-10 ${cover ? "lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16" : ""}`}>
          <div>
            <h1 className="text-5xl lg:text-7xl">{l.name}</h1>
            <p className="mt-3 text-mist">{[l.city, l.province].filter(Boolean).join(", ")} · {total} {total === 1 ? "property" : "properties"}</p>
            {l.description && <div className="mt-8 max-w-[60ch] space-y-4 text-lg leading-relaxed">{l.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
          </div>
          {cover && <div className="aspect-[4/3] overflow-hidden bg-stone"><Photo image={cover} priority sizes="(min-width:1024px) 45vw, 100vw" /></div>}
        </div>
        <section className="mt-20" aria-labelledby="list">
          <div className="flex items-end justify-between gap-6 border-b border-basalt/20 pb-5"><h2 id="list" className="text-3xl lg:text-4xl">Properties in {l.name}</h2>{total > items.length && <Link href={`/properties?location=${l.slug}`} className="text-sm underline underline-offset-4 hover:text-brass">View all {total}</Link>}</div>
          {items.length === 0 ? <p className="mt-10 text-sm text-mist">No properties are listed here at the moment.</p> : (
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
