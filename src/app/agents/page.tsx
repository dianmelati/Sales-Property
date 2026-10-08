import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { buildMetadata, getPageSeo } from "@/server/seo/meta";

// ISR: HTML di-cache dan disegarkan tiap 5 menit, atau langsung saat admin menyimpan (revalidatePublic).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ seo: await getPageSeo("agents"), title: "Our agents", description: "Meet the agents who will guide you through buying, selling or renting.", path: "/agents" });
}

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    where: { isActive: true, deletedAt: null }, orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: { slug: true, name: true, title: true, photo: { select: { variants: true, alt: true } }, _count: { select: { properties: { where: { status: "PUBLISHED", deletedAt: null } } } } },
  });
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-5xl lg:text-6xl">Our agents</h1>
        {agents.length === 0 ? (
          <div className="mt-12 border-y border-basalt/15 py-16"><p className="font-serif text-3xl">Our team page is coming soon</p><p className="mt-3 text-sm text-mist">In the meantime, you can reach us through the contact page.</p><Link href="/contact" className="btn-primary mt-8">Contact us</Link></div>
        ) : (
          <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {agents.map((a) => (
              <li key={a.slug}>
                <Link href={`/agents/${a.slug}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden bg-stone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.photo && <img src={variantUrls(a.photo.variants).small} alt={a.photo.alt || a.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />}
                  </div>
                  <p className="mt-4 font-serif text-xl">{a.name}</p>
                  {a.title && <p className="text-sm text-mist">{a.title}</p>}
                  <p className="mt-1 text-xs text-mist">{a._count.properties} {a._count.properties === 1 ? "property" : "properties"}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
