import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PropertyCard } from "@/components/property-card";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { abs } from "@/lib/site";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { cardsByWhere } from "@/server/properties/public";
import { breadcrumbLd, buildMetadata } from "@/server/seo/meta";

export const revalidate = 300;
export async function generateStaticParams() { return []; } // dirender saat diminta pertama kali, lalu di-cache
type Params = Promise<{ slug: string }>;

const load = (slug: string) => prisma.agent.findFirst({ where: { slug, isActive: true, deletedAt: null }, include: { photo: { select: { variants: true, alt: true } } } });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const a = await load((await params).slug);
  if (!a) return { title: "Agent not found", robots: { index: false } };
  return buildMetadata({
    seo: null, title: `${a.name}${a.title ? `, ${a.title}` : ""}`, path: `/agents/${a.slug}`,
    description: a.bio?.slice(0, 155) || `${a.name} is a property agent. See their listings and get in touch.`,
    image: a.photo ? variantUrls(a.photo.variants).large : null,
  });
}

export default async function AgentPage({ params }: { params: Params }) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const { items, total } = await cardsByWhere({ agentId: a.id }, 12);
  const photo = a.photo ? variantUrls(a.photo.variants).medium : null;
  const wa = a.phone ? normalizeWhatsApp(a.phone) : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-10 lg:px-12 lg:py-14">
        <JsonLd data={[
          { "@context": "https://schema.org", "@type": "Person", name: a.name, jobTitle: a.title ?? undefined, telephone: a.phone ?? undefined, email: a.email ?? undefined, image: photo ? abs(photo) : undefined, url: abs(`/agents/${a.slug}`) },
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Agents", path: "/agents" }, { name: a.name, path: `/agents/${a.slug}` }]),
        ]} />
        <nav aria-label="Breadcrumb" className="text-sm text-mist"><Link href="/" className="hover:text-basalt">Home</Link> / <Link href="/agents" className="hover:text-basalt">Agents</Link> / {a.name}</nav>
        <div className="mt-8 grid gap-10 md:grid-cols-[320px_1fr] md:gap-16">
          <div className="aspect-[4/5] overflow-hidden bg-stone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt={a.photo?.alt || a.name} className="h-full w-full object-cover" />}
          </div>
          <div className="self-end">
            <h1 className="text-5xl lg:text-6xl">{a.name}</h1>
            {a.title && <p className="mt-2 text-lg text-mist">{a.title}</p>}
            {a.bio && <div className="mt-8 max-w-[60ch] space-y-4 text-lg leading-relaxed">{a.bio.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="btn-primary">Call {a.phone}</a>}
              {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello ${a.name}, I would like to talk about a property.`)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">WhatsApp</a>}
              {a.email && <a href={`mailto:${a.email}`} className="self-center underline underline-offset-4 hover:text-brass">{a.email}</a>}
            </div>
          </div>
        </div>
        <section className="mt-20" aria-labelledby="list">
          <div className="flex items-end justify-between gap-6 border-b border-basalt/20 pb-5"><h2 id="list" className="text-3xl lg:text-4xl">Properties with {a.name.split(" ")[0]}</h2><span className="text-sm text-mist">{total} listed</span></div>
          {items.length === 0 ? <p className="mt-10 text-sm text-mist">No properties are listed with this agent at the moment.</p> : (
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
