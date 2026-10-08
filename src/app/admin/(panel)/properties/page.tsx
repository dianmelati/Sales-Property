import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { listProperties } from "@/server/properties/queries";

export const metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

type SP = { q?: string; status?: string; transaction?: string; categoryId?: string; sort?: string; page?: string; deleted?: string };

const STATUS_LABEL: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Published", RESERVED: "Reserved", SOLD: "Sold", RENTED: "Rented", ARCHIVED: "Archived" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("property:read");
  const sp = await searchParams;
  const [{ items, total, page, pages }, categories] = await Promise.all([
    listProperties({ ...sp, page: Number(sp.page) || 1 }),
    prisma.propertyCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const link = (over: Partial<SP>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, deleted: undefined, ...over })) if (v) q.set(k, String(v));
    const s = q.toString();
    return `/admin/properties${s ? `?${s}` : ""}`;
  };
  const sel = "field !py-2 text-sm";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Properties</h1>
        {can(user.role, "property:write") && <Link href="/admin/properties/new" className="btn-primary">Add property</Link>}
      </div>
      {sp.deleted && <p role="status" className="mt-6 border-l-2 border-moss pl-3 text-sm">Property deleted.</p>}

      {/* Filter berbasis GET: bisa dibagikan dan tahan refresh */}
      <form method="get" className="mt-10 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="text-xs text-mist">Search<input name="q" defaultValue={sp.q} placeholder="Title, ID or address" className={sel} /></label>
        <label className="text-xs text-mist">Status
          <select name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">All</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="text-xs text-mist">Transaction
          <select name="transaction" defaultValue={sp.transaction ?? ""} className={sel}><option value="">All</option><option value="SALE">For sale</option><option value="RENT">For rent</option></select>
        </label>
        <label className="text-xs text-mist">Type
          <select name="categoryId" defaultValue={sp.categoryId ?? ""} className={sel}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="text-xs text-mist">Sort by
          <select name="sort" defaultValue={sp.sort ?? "newest"} className={sel}>
            <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price_desc">Price, high to low</option>
            <option value="price_asc">Price, low to high</option><option value="title">Title</option><option value="views">Most viewed</option>
          </select>
        </label>
        <button className="btn-ghost !py-2">Apply</button>
      </form>

      <div className="mt-8 overflow-x-auto">
        {items.length === 0 ? (
          <div className="border-y border-basalt/15 py-16">
            <p className="font-serif text-2xl">{total === 0 && !sp.q && !sp.status ? "No properties yet" : "Nothing matches these filters"}</p>
            <p className="mt-2 text-sm text-mist">{total === 0 && !sp.q && !sp.status ? "Add your first property to start filling the website." : "Clear a filter or search for something else."}</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15">
              <th className="py-3 pr-4 font-normal">Property</th><th className="py-3 pr-4 font-normal">Type and area</th><th className="py-3 pr-4 font-normal">Price</th>
              <th className="py-3 pr-4 font-normal">Status</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="py-4 pr-4"><p className="font-medium">{p.title}</p><p className="text-xs text-mist">{p.code}{p.isFeatured && " · Featured"}</p></td>
                  <td className="py-4 pr-4">{p.category.name}, {p.transaction === "RENT" ? "rent" : "sale"}<p className="text-xs text-mist">{p.location.name}</p></td>
                  <td className="py-4 pr-4 whitespace-nowrap">{formatPrice(Number(p.price), p.currency)}</td>
                  <td className="py-4 pr-4">{STATUS_LABEL[p.status]}</td>
                  <td className="py-4 text-right"><Link href={`/admin/properties/${p.id}/edit`} className="underline underline-offset-4 hover:text-brass">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
          <p className="text-mist">{total} properties, page {page} of {pages}</p>
          <div className="flex gap-6">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className="underline underline-offset-4">Previous</Link>}
            {page < pages && <Link href={link({ page: String(page + 1) })} className="underline underline-offset-4">Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
