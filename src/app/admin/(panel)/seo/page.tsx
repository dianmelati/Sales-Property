import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PAGE_KEYS } from "@/server/seo/meta";

export const metadata = { title: "SEO" };
export const dynamic = "force-dynamic";

export default async function SeoOverview() {
  await requirePermission("seo:write");
  const [pageSeo, locations, missing, total] = await Promise.all([
    prisma.seoMetadata.findMany({ where: { pageId: { not: null } }, select: { title: true, description: true, noIndex: true, page: { select: { key: true } } } }),
    prisma.propertyLocation.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, seo: { select: { title: true, description: true, noIndex: true } } } }),
    prisma.property.count({ where: { deletedAt: null, status: "PUBLISHED", OR: [{ seo: { is: null } }, { seo: { is: { OR: [{ title: null }, { description: null }] } } }] } }),
    prisma.property.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
  ]);
  const byKey = new Map(pageSeo.map((s) => [s.page?.key, s]));
  const state = (s?: { title: string | null; description: string | null; noIndex: boolean } | null) =>
    s?.noIndex ? "Hidden from search" : s?.title && s?.description ? "Complete" : s?.title || s?.description ? "Partly filled" : "Using defaults";
  const row = (key: string, label: string, href: string, s?: Parameters<typeof state>[0]) => (
    <tr key={key}><td className="py-3 pr-4">{label}</td><td className={`py-3 pr-4 ${state(s) === "Complete" ? "text-moss" : "text-mist"}`}>{state(s)}</td>
      <td className="py-3 text-right"><Link href={href} className="underline underline-offset-4 hover:text-brass">Edit</Link></td></tr>
  );
  const th = <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">Page</th><th className="py-3 pr-4 font-normal">SEO</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>;

  return (
    <>
      <h1 className="text-4xl">SEO</h1>
      <p className="mt-3 max-w-xl text-sm text-mist">Pages without their own text still get sensible titles and descriptions. Fill them in to control how your site looks in search results and when links are shared. The sitemap at /sitemap.xml updates itself.</p>

      <section className="mt-12" aria-labelledby="s1"><h2 id="s1" className="mb-3 text-2xl">Site pages</h2>
        <table className="w-full border-y border-basalt/15 text-left text-sm">{th}<tbody className="divide-y divide-basalt/10">
          {Object.entries(PAGE_KEYS).map(([k, l]) => row(k, l, `/admin/seo/page/${k}`, byKey.get(k)))}</tbody></table></section>

      <section className="mt-12" aria-labelledby="s2"><h2 id="s2" className="mb-3 text-2xl">Locations</h2>
        {locations.length === 0 ? <p className="text-sm text-mist">No locations yet.</p> : (
          <table className="w-full border-y border-basalt/15 text-left text-sm">{th}<tbody className="divide-y divide-basalt/10">{locations.map((l) => row(l.id, l.name, `/admin/seo/location/${l.id}`, l.seo))}</tbody></table>)}</section>

      <section className="mt-12" aria-labelledby="s3"><h2 id="s3" className="mb-3 text-2xl">Properties</h2>
        <p className="text-sm">{missing === 0 ? `All ${total} published properties have an SEO title and description.` : `${missing} of ${total} published properties are missing an SEO title or description.`}</p>
        <p className="mt-2 text-sm text-mist">Property SEO is edited in the SEO step of each property. <Link href="/admin/properties?status=PUBLISHED" className="underline underline-offset-4 hover:text-brass">Open properties</Link></p></section>
    </>
  );
}
