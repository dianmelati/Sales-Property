import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PropertyCard } from "@/components/property-card";
import { FiltersToggle, SortSelect } from "@/components/properties-controls";
import { formatPrice } from "@/lib/format";
import { getPublicOptions, parseFilters, searchPublic, SORT_LABELS, type PublicFilters } from "@/server/properties/public";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | string[] | undefined>>;

const flatten = (sp: Record<string, string | string[] | undefined>) =>
  Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));

const PRICES = [25e6, 50e6, 100e6, 250e6, 500e6, 1e9, 2e9, 5e9, 1e10, 2e10, 5e10];
const FILTER_KEYS = ["q", "location", "type", "transaction", "minPrice", "maxPrice", "beds", "baths", "minLand", "minBuilding", "certificate", "furnished", "pool", "garage", "garden", "featured"] as const;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const raw = flatten(await searchParams);
  const filtered = FILTER_KEYS.some((k) => raw[k]) || (Number(raw.page) || 1) > 1;
  return {
    title: "Properties for sale and rent",
    description: "Browse houses, villas and apartments for sale and rent. Filter by location, price, bedrooms and more.",
    alternates: { canonical: "/properties" },
    // Halaman hasil filter tidak diindeks agar tidak menggandakan konten; tautannya tetap diikuti.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function PropertiesPage({ searchParams }: { searchParams: SP }) {
  const raw = flatten(await searchParams);
  const f = parseFilters(raw);
  const [options, result] = await Promise.all([getPublicOptions(), searchPublic(f)]);

  const href = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...raw, ...over })) if (v) q.set(k, v);
    const s = q.toString();
    return `/properties${s ? `?${s}` : ""}`;
  };
  if (result.total > 0 && f.page > result.pages) redirect(href({ page: String(result.pages) }));

  const nameOf = (list: { name: string; slug: string }[], slug?: string) => list.find((o) => o.slug === slug)?.name ?? slug;
  const chips: { label: string; remove: string[] }[] = [];
  const add = (cond: unknown, label: string, ...remove: string[]) => cond && chips.push({ label, remove });
  add(f.q, `"${f.q}"`, "q");
  add(f.location, nameOf(options.locations, f.location) ?? "", "location");
  add(f.type, nameOf(options.categories, f.type) ?? "", "type");
  add(f.transaction, f.transaction === "RENT" ? "For rent" : "For sale", "transaction");
  add(f.minPrice, `From ${formatPrice(f.minPrice ?? 0)}`, "minPrice");
  add(f.maxPrice, `Up to ${formatPrice(f.maxPrice ?? 0)}`, "maxPrice");
  add(f.beds, `${f.beds}+ bedrooms`, "beds");
  add(f.baths, `${f.baths}+ bathrooms`, "baths");
  add(f.minLand, `Land ${f.minLand}+ m²`, "minLand");
  add(f.minBuilding, `Building ${f.minBuilding}+ m²`, "minBuilding");
  add(f.certificate, `Certificate ${f.certificate}`, "certificate");
  add(f.furnished, "Furnished", "furnished"); add(f.pool, "Swimming pool", "pool");
  add(f.garage, "Garage", "garage"); add(f.garden, "Garden", "garden"); add(f.featured, "Featured", "featured");

  const priceSelect = (name: "minPrice" | "maxPrice", label: string, value?: number) => (
    <label className="block text-xs text-mist">{label}
      <select name={name} defaultValue={value ? String(value) : ""} className="field mt-1 text-sm text-basalt">
        <option value="">{name === "minPrice" ? "No minimum" : "No maximum"}</option>
        {PRICES.map((p) => <option key={p} value={p}>{formatPrice(p)}</option>)}
      </select>
    </label>
  );
  const countSelect = (name: "beds" | "baths", label: string, value?: number) => (
    <label className="block text-xs text-mist">{label}
      <select name={name} defaultValue={value ? String(value) : ""} className="field mt-1 text-sm text-basalt">
        <option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
      </select>
    </label>
  );
  const check = (name: keyof PublicFilters, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={String(name)} value="1" defaultChecked={!!f[name]} /> {label}</label>
  );

  const pageLink = (n: number) => href({ page: n > 1 ? String(n) : undefined });
  const nums = [...new Set([1, f.page - 1, f.page, f.page + 1, result.pages])].filter((n) => n >= 1 && n <= result.pages).sort((a, b) => a - b);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-5xl lg:text-6xl">Properties</h1>

        <div className="mt-12 grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
          <FiltersToggle activeCount={chips.length}>
            <form method="get" action="/properties" className="space-y-6" aria-label="Filter properties">
              <input type="hidden" name="sort" value={f.sort === "newest" ? "" : f.sort} disabled={f.sort === "newest"} />
              <input type="hidden" name="view" value={f.view} disabled={f.view === "grid"} />
              <label className="block text-xs text-mist">Search
                <input name="q" defaultValue={f.q} placeholder="Title, address or ID" className="field mt-1 text-sm text-basalt" />
              </label>
              <label className="block text-xs text-mist">Location
                <select name="location" defaultValue={options.locations.some((l) => l.slug === f.location) ? f.location : ""} className="field mt-1 text-sm text-basalt">
                  <option value="">All locations</option>{options.locations.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                </select>
              </label>
              <label className="block text-xs text-mist">Property type
                <select name="type" defaultValue={f.type ?? ""} className="field mt-1 text-sm text-basalt">
                  <option value="">All types</option>{options.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-xs text-mist">Buy or rent
                <select name="transaction" defaultValue={f.transaction ?? ""} className="field mt-1 text-sm text-basalt">
                  <option value="">Sale and rent</option><option value="SALE">For sale</option><option value="RENT">For rent</option>
                </select>
              </label>
              {priceSelect("minPrice", "Minimum price", f.minPrice)}
              {priceSelect("maxPrice", "Maximum price", f.maxPrice)}
              <div className="grid grid-cols-2 gap-4">{countSelect("beds", "Bedrooms", f.beds)}{countSelect("baths", "Bathrooms", f.baths)}</div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs text-mist">Land (m², min)<input name="minLand" type="number" min="0" inputMode="numeric" defaultValue={f.minLand} className="field mt-1 text-sm text-basalt" /></label>
                <label className="block text-xs text-mist">Building (m², min)<input name="minBuilding" type="number" min="0" inputMode="numeric" defaultValue={f.minBuilding} className="field mt-1 text-sm text-basalt" /></label>
              </div>
              <label className="block text-xs text-mist">Certificate
                <select name="certificate" defaultValue={f.certificate ?? ""} className="field mt-1 text-sm text-basalt">
                  <option value="">Any</option>{["SHM", "HGB", "HPL", "STRATA", "OTHER"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <fieldset className="space-y-2"><legend className="mb-2 text-xs text-mist">Features</legend>
                {check("furnished", "Furnished")}{check("pool", "Swimming pool")}{check("garage", "Garage")}{check("garden", "Garden")}{check("featured", "Featured only")}
              </fieldset>
              <div className="flex items-center gap-6 pt-2">
                <button className="btn-primary">Show results</button>
                {chips.length > 0 && <Link href={href(Object.fromEntries([...FILTER_KEYS, "page"].map((k) => [k, undefined])))} className="text-sm underline underline-offset-4">Clear all</Link>}
              </div>
            </form>
          </FiltersToggle>

          <section aria-label="Results">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-basalt/15 pb-4">
              <p className="text-sm" role="status">{result.total} {result.total === 1 ? "property" : "properties"}</p>
              <div className="flex flex-wrap items-center gap-6">
                <SortSelect value={f.sort} options={Object.entries(SORT_LABELS)} />
                <div className="flex gap-4 text-sm" role="group" aria-label="View">
                  <Link href={href({ view: undefined, page: undefined })} aria-current={f.view === "grid" ? "true" : undefined} className={f.view === "grid" ? "underline underline-offset-4" : "text-mist hover:text-basalt"}>Grid</Link>
                  <Link href={href({ view: "list", page: undefined })} aria-current={f.view === "list" ? "true" : undefined} className={f.view === "list" ? "underline underline-offset-4" : "text-mist hover:text-basalt"}>List</Link>
                </div>
              </div>
            </div>

            {chips.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
                {chips.map((c) => (
                  <li key={c.label}>
                    <Link href={href({ ...Object.fromEntries(c.remove.map((k) => [k, undefined])), page: undefined })} className="inline-flex items-center gap-2 border border-basalt/25 px-3 py-1 text-xs hover:border-basalt" aria-label={`Remove filter ${c.label}`}>
                      {c.label} <span aria-hidden="true">×</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {result.items.length === 0 ? (
              <div className="mt-10 border-y border-basalt/15 py-16">
                <p className="font-serif text-3xl">{chips.length ? "No properties match these filters" : "No properties are listed yet"}</p>
                <p className="mt-3 max-w-md text-sm text-mist">{chips.length ? "Widen your price range or remove a filter to see more." : "New listings are added regularly. Please check back soon."}</p>
              </div>
            ) : (
              <div className={f.view === "list" ? "mt-10 space-y-12" : "mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3"}>
                {result.items.map((p, i) => <PropertyCard key={p.id} p={p} view={f.view} priority={i < 2 && f.page === 1} />)}
              </div>
            )}

            {result.pages > 1 && (
              <nav aria-label="Pagination" className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-basalt/15 pt-6 text-sm">
                <div className="flex gap-6">
                  {f.page > 1 && <Link href={pageLink(f.page - 1)} rel="prev" className="underline underline-offset-4">Previous</Link>}
                  {f.page < result.pages && <Link href={pageLink(f.page + 1)} rel="next" className="underline underline-offset-4">Next</Link>}
                </div>
                <ol className="flex items-center gap-4">
                  {nums.map((n, i) => (
                    <li key={n} className="flex items-center gap-4">
                      {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden="true" className="text-mist">…</span>}
                      <Link href={pageLink(n)} aria-current={n === f.page ? "page" : undefined} aria-label={`Page ${n}`} className={n === f.page ? "border-b border-basalt" : "text-mist hover:text-basalt"}>{n}</Link>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
