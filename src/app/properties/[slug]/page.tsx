import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Photo } from "@/components/photo";
import { JsonLd } from "@/components/json-ld";
import { CompareButton } from "@/components/compare-button";
import { breadcrumbLd } from "@/server/seo/meta";
import { Facade } from "@/components/facade";
import { PropertyCard } from "@/components/property-card";
import { FavoriteButton } from "@/components/favorite-button";
import { GalleryButton, Lightbox } from "@/components/lightbox";
import { formatPriceFull } from "@/lib/format";
import { sanitizeDescription } from "@/lib/sanitize";
import { variantUrls } from "@/lib/media/urls";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getPublicProperty, getWhatsAppNumber, toImages, toModelViews, toPlanViews } from "@/server/properties/detail";
import { FloorPlanViewer } from "@/components/floor-plan-viewer";
import { ModelSection } from "@/components/model-viewer/model-section";
import { similarCards } from "@/server/properties/public";
import { InquiryForm } from "./inquiry-form";
import { ViewBeacon } from "./view-beacon";

export const revalidate = 300;
export async function generateStaticParams() { return []; } // dirender saat diminta pertama kali, lalu di-cache
type Params = Promise<{ slug: string }>;

const STATUS_NOTE: Record<string, string> = { RESERVED: "Reserved", SOLD: "Sold", RENTED: "Rented" };
const stripHtml = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getPublicProperty((await params).slug);
  if (!p) return { title: "Property not found", robots: { index: false } };
  const title = p.seo?.title || `${p.title}, ${p.location.name}`;
  const desc = p.seo?.description || stripHtml(p.description ?? "").slice(0, 155) ||
    `${p.category.name} ${p.transaction === "RENT" ? "for rent" : "for sale"} in ${p.location.name}.`;
  const ogKey = p.seo?.ogImage?.variants ?? p.images[0]?.media.variants;
  const og = ogKey ? variantUrls(ogKey).large : undefined;
  const url = `/properties/${p.slug}`;
  return {
    title, description: desc, keywords: p.seo?.keywords || undefined,
    alternates: { canonical: p.seo?.canonical || url },
    robots: p.seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", title, description: desc, url, images: og ? [{ url: og }] : undefined },
    twitter: { card: "summary_large_image", title, description: desc, images: og ? [og] : undefined },
  };
}

export default async function PropertyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await getPublicProperty(slug);
  if (!p) notFound();


  const [images, whatsapp, similar] = await Promise.all([
    Promise.resolve(toImages(p)),
    getWhatsAppNumber(),
    similarCards({ id: p.id, locationId: p.locationId, categoryId: p.categoryId, transaction: p.transaction }),
  ]);

  const price = Number(p.price);
  const closed = p.status === "SOLD" || p.status === "RENTED";
  const specs = [
    p.bedrooms != null && [String(p.bedrooms), "Bedrooms"], p.bathrooms != null && [String(p.bathrooms), "Bathrooms"],
    p.landArea ? [`${p.landArea} m²`, "Land"] : null, p.buildingArea ? [`${p.buildingArea} m²`, "Building"] : null,
    p.floors != null && [String(p.floors), "Floors"], p.parking != null && [String(p.parking), "Parking"],
    p.certificate && [p.certificate, "Certificate"],
  ].filter(Boolean) as [string, string][];
  const features = [...new Set([
    ...p.features.map((f) => f.label),
    ...(p.furnished ? ["Furnished"] : []), ...(p.hasPool ? ["Swimming pool"] : []), ...(p.hasGarage ? ["Garage"] : []), ...(p.hasGarden ? ["Garden"] : []),
  ])];
  const hasCoords = p.latitude != null && p.longitude != null;
  const waUrl = whatsapp ? buildWhatsAppUrl(whatsapp, p.title) : null;
  const agentPhoto = p.agent?.isActive && p.agent.photo ? variantUrls(p.agent.photo.variants).small : null;
  const rest = images.slice(3);
  const plans = toPlanViews(p);
  const models = toModelViews(p);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org", "@type": "RealEstateListing", name: p.title, url: `${base}/properties/${p.slug}`,
    description: stripHtml(p.description ?? "") || undefined, datePosted: p.publishedAt?.toISOString(),
    image: images.slice(0, 6).map((i) => new URL(i.src, base).href),
    offers: { "@type": "Offer", price, priceCurrency: p.currency, availability: closed ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
    about: {
      "@type": "Accommodation", name: p.title, numberOfBedrooms: p.bedrooms ?? undefined, numberOfBathroomsTotal: p.bathrooms ?? undefined,
      floorSize: p.buildingArea ? { "@type": "QuantitativeValue", value: p.buildingArea, unitCode: "MTK" } : undefined,
      address: { "@type": "PostalAddress", streetAddress: p.address ?? undefined, addressLocality: p.location.city },
      geo: hasCoords ? { "@type": "GeoCoordinates", latitude: Number(p.latitude), longitude: Number(p.longitude) } : undefined,
    },
  };

  const tile = (i: number, cls: string, sizes: string, extra?: React.ReactNode) => (
    <GalleryButton index={i} label={`Open photo ${i + 1} of ${images.length}`} className={`relative block overflow-hidden bg-stone ${cls}`}>
      <Photo image={images[i]} sizes={sizes} priority={i === 0} className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" />
      {extra}
    </GalleryButton>
  );

  return (
    <>
      <SiteHeader />
      <main>
        <ViewBeacon slug={p.slug} />
        <JsonLd data={[jsonLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Properties", path: "/properties" }, { name: p.location.name, path: `/properties?location=${p.location.slug}` }, { name: p.title, path: `/properties/${p.slug}` }])]} />
        <div className="mx-auto max-w-page px-6 pt-8 lg:px-12">
          <nav aria-label="Breadcrumb" className="text-sm text-mist">
            <Link href="/" className="hover:text-basalt">Home</Link> / <Link href="/properties" className="hover:text-basalt">Properties</Link> / <Link href={`/properties?location=${p.location.slug}`} className="hover:text-basalt">{p.location.name}</Link>
          </nav>

          {/* 1. Galeri */}
          <div className="mt-6">
            {images.length === 0 ? (
              <div className="aspect-[3/2] overflow-hidden lg:aspect-[21/9]"><Facade tone={0} className="h-full w-full" /></div>
            ) : (
              <div className={`grid gap-2 ${images.length > 1 ? "lg:h-[34rem] lg:grid-cols-[2fr_1fr]" : ""}`}>
                {tile(0, "aspect-[3/2] lg:aspect-auto lg:h-full", "(min-width:1024px) 62vw, 100vw",
                  <span className="absolute bottom-4 left-4 bg-paper px-3 py-1.5 text-xs">{images.length} {images.length === 1 ? "photo" : "photos"}</span>)}
                {images.length > 1 && (
                  <div className="hidden gap-2 lg:grid lg:grid-rows-2">
                    {tile(1, "h-full", "30vw")}
                    {images.length > 2 && tile(2, "h-full", "30vw", images.length > 3 && <span className="absolute inset-0 flex items-center justify-center bg-basalt/55 text-sm text-paper">View all {images.length} photos</span>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
            <div className="min-w-0">
              {/* 2-5. Judul, lokasi, harga, status */}
              <header className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-sm text-mist">{p.category.name}, {p.transaction === "RENT" ? "for rent" : "for sale"}{STATUS_NOTE[p.status] && <span className="ml-3 bg-basalt px-2 py-0.5 text-xs text-paper">{STATUS_NOTE[p.status]}</span>}</p>
                  <h1 className="mt-2 text-4xl lg:text-6xl">{p.title}</h1>
                  <p className="mt-3 text-mist">{[p.address, p.location.name].filter(Boolean).join(", ")}</p>
                </div>
                <div className="flex items-center gap-5"><CompareButton slug={p.slug} title={p.title} /><FavoriteButton slug={p.slug} title={p.title} className="border border-basalt/20" /></div>
              </header>
              <p className="mt-8 font-serif text-4xl text-brass">{formatPriceFull(price, p.currency)}</p>
              <p className="mt-1 text-xs text-mist">Property ID {p.code}</p>

              {/* 6. Spesifikasi utama */}
              {specs.length > 0 && (
                <dl className="mt-10 grid grid-cols-2 border-y border-basalt/15 sm:grid-cols-4">
                  {specs.map(([v, l], i) => (
                    <div key={l} className={`py-5 pl-5 ${i % 2 ? "border-l border-basalt/15" : ""} ${i % 4 ? "sm:border-l sm:border-basalt/15" : "sm:border-l-0 sm:pl-0"} ${i >= 2 ? "border-t border-basalt/15" : ""} ${i >= 4 ? "" : "sm:border-t-0"} ${i === 0 || i % 4 === 0 ? "sm:pl-0" : ""}`}>
                      <dd className="font-serif text-3xl tracking-display">{v}</dd>
                      <dt className="mt-1 text-xs text-mist">{l}</dt>
                    </div>
                  ))}
                </dl>
              )}

              {/* 7. Deskripsi */}
              {p.description && (
                <section className="mt-16" aria-labelledby="about">
                  <h2 id="about" className="text-3xl lg:text-4xl">About this property</h2>
                  <div className="prose-estate mt-6 max-w-[68ch] text-[1.0625rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeDescription(p.description) }} />
                </section>
              )}

              {/* 8. Fitur */}
              {features.length > 0 && (
                <section className="mt-16" aria-labelledby="features">
                  <h2 id="features" className="text-3xl lg:text-4xl">Features</h2>
                  <ul className="mt-6 grid gap-x-10 border-t border-basalt/15 sm:grid-cols-2">
                    {features.map((f) => <li key={f} className="border-b border-basalt/15 py-3 text-sm">{f}</li>)}
                  </ul>
                </section>
              )}

              {/* 9. Foto lainnya */}
              {rest.length > 0 && (
                <section className="mt-16" aria-labelledby="photos">
                  <h2 id="photos" className="text-3xl lg:text-4xl">Photo gallery</h2>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {rest.map((_, k) => <div key={k}>{tile(k + 3, "aspect-[4/3] w-full", "(min-width:1024px) 22vw, 45vw")}</div>)}
                  </div>
                </section>
              )}

              {/* 10. Denah */}
              {plans.length > 0 && (
                <section className="mt-16" aria-labelledby="plans">
                  <h2 id="plans" className="text-3xl lg:text-4xl">Floor plan{plans.length > 1 ? "s" : ""}</h2>
                  <div className="mt-6"><FloorPlanViewer plans={plans} /></div>
                </section>
              )}

              {/* 11. Model 3D */}
              {models.length > 0 && (
                <section className="mt-16" aria-labelledby="model3d">
                  <h2 id="model3d" className="text-3xl lg:text-4xl">3D model</h2>
                  <div className="mt-6"><ModelSection models={models} poster={images[0] ?? null} /></div>
                </section>
              )}

              {/* 12. Video akan ditempatkan di sini, hanya bila datanya ada. */}

              {/* 13. Lokasi */}
              <section className="mt-16" aria-labelledby="location">
                <h2 id="location" className="text-3xl lg:text-4xl">Location</h2>
                <div className="mt-6 grid gap-6 border-y border-basalt/15 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-serif text-2xl">{p.location.name}, {p.location.city}</p>
                    {p.address && <p className="mt-1 text-sm text-mist">{p.address}</p>}
                  </div>
                  {hasCoords && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${Number(p.latitude)},${Number(p.longitude)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open in maps</a>
                  )}
                </div>
              </section>
            </div>

            {/* 15-17. Agen, inquiry, WhatsApp */}
            <aside className="lg:sticky lg:top-8 lg:self-start" aria-label="Contact">
              <div className="border border-basalt/20 p-6 lg:p-8">
                {p.agent?.isActive && (
                  <div className="mb-8 flex items-center gap-4 border-b border-basalt/15 pb-6">
                    <div className="h-16 w-16 shrink-0 overflow-hidden bg-stone">
                      {agentPhoto && /* eslint-disable-next-line @next/next/no-img-element */ <img src={agentPhoto} alt={p.agent.photo?.alt || p.agent.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-xl"><Link href={`/agents/${p.agent.slug}`} className="hover:text-moss">{p.agent.name}</Link></p>
                      {p.agent.title && <p className="text-sm text-mist">{p.agent.title}</p>}
                      <p className="mt-1 text-sm">
                        {p.agent.phone && <a href={`tel:${p.agent.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4 hover:text-brass">{p.agent.phone}</a>}
                      </p>
                    </div>
                  </div>
                )}
                {closed ? (
                  <div>
                    <p className="font-serif text-2xl">This property is {p.status === "SOLD" ? "sold" : "rented"}</p>
                    <p className="mt-2 text-sm text-mist">Tell us what you are looking for and we will suggest similar properties.</p>
                    <Link href="/contact" className="btn-primary mt-6 w-full">Contact us</Link>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-6 text-2xl">Arrange a viewing</h2>
                    <InquiryForm propertyId={p.id} title={p.title} />
                  </>
                )}
                {waUrl && !closed && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-6 w-full">Chat on WhatsApp</a>
                )}
              </div>
            </aside>
          </div>

          {/* 18. Serupa */}
          {similar.length > 0 && (
            <section className="mt-28 border-t border-basalt/15 pt-14 pb-24" aria-labelledby="similar">
              <h2 id="similar" className="text-3xl lg:text-5xl">Similar properties</h2>
              <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((s) => <PropertyCard key={s.id} p={s} />)}
              </div>
            </section>
          )}
          {similar.length === 0 && <div className="pb-24" />}
        </div>
        <Lightbox images={images} />
      </main>
      <SiteFooter />
    </>
  );
}
