import type { Metadata } from "next";
import { HomeSectionView } from "@/components/home-sections";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { getHomeSections } from "@/server/cms/home";
import { buildMetadata, getPageSeo, organizationLd, websiteLd } from "@/server/seo/meta";

// ISR: HTML di-cache dan disegarkan tiap 5 menit, atau langsung saat admin menyimpan (revalidatePublic).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const sections = await getHomeSections();
  const hero = sections.find((s) => s.type === "hero")?.content as { headline?: string; description?: string } | undefined;
  return buildMetadata({
    seo: await getPageSeo("home"), absoluteTitle: true, path: "/",
    title: "Estate: exceptional properties for sale and rent",
    description: hero?.description || "Discover exceptional properties in the most desirable locations.",
  });
}

export default async function HomePage() {
  const sections = await getHomeSections();
  return (
    <>
      <JsonLd data={[await organizationLd(), websiteLd()]} />
      <SiteHeader overlay={sections[0]?.type === "hero"} />
      <main>
        {sections.map((s, i) => (i < 2 ? <HomeSectionView key={s.id} s={s} /> : <div key={s.id} className="cv-auto"><HomeSectionView s={s} /></div>))}
      </main>
      <SiteFooter />
    </>
  );
}
