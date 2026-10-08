import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { toCardImage } from "@/lib/media/card-image";
import { getAbout } from "@/server/cms/pages";
import { buildMetadata, getPageSeo, organizationLd } from "@/server/seo/meta";

// ISR: HTML di-cache dan disegarkan tiap 5 menit, atau langsung saat admin menyimpan (revalidatePublic).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const a = await getAbout();
  return buildMetadata({ seo: await getPageSeo("about"), title: "About", description: a.body.split(/\n{2,}/)[0]?.slice(0, 155) || "Learn about our agency and how we work.", path: "/about" });
}

export default async function AboutPage() {
  const a = await getAbout();
  const media = a.imageId ? await prisma.media.findFirst({ where: { id: a.imageId, deletedAt: null }, select: { variants: true, blurDataUrl: true, alt: true, width: true, height: true } }) : null;
  const image = toCardImage(media, a.headline);
  const paras = a.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-12 lg:px-12 lg:py-20">
        <JsonLd data={await organizationLd()} />
        <h1 className="max-w-4xl text-5xl lg:text-7xl">{a.headline}</h1>
        <div className={`mt-14 grid gap-14 ${image ? "lg:grid-cols-[1fr_1fr] lg:gap-20" : ""}`}>
          {image && <div className="aspect-[4/5] overflow-hidden bg-stone"><Photo image={image} priority sizes="(min-width:1024px) 45vw, 100vw" /></div>}
          <div className="max-w-[62ch] space-y-5 text-lg leading-relaxed">
            {paras.length ? paras.map((p, i) => <p key={i}>{p}</p>) : <p className="text-mist">Discover exceptional properties in the most desirable locations.</p>}
            <div className="flex flex-wrap gap-4 pt-6"><Link href="/properties" className="btn-primary">Browse properties</Link><Link href="/contact" className="btn-ghost">Contact us</Link></div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
