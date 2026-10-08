import Link from "next/link";
import { Facade } from "./facade";
import { Photo } from "./photo";
import { PropertyCard } from "./property-card";
import { formatPrice } from "@/lib/format";
import { safeHref } from "@/lib/cms/links";
import type { CtaContent, HeroContent, Item, ItemsContent, LocationsContent, PropertiesContent, TitleContent } from "@/lib/cms/types";
import type { HomeSection } from "@/server/cms/home";
import { getFaqs, getFeaturedAgents, getTestimonials } from "@/server/cms/home";
import { getPublicOptions, homeCards, locationsWithCounts } from "@/server/properties/public";

const c = <T,>(s: HomeSection) => s.content as unknown as T;
const list = (v: unknown): Item[] => (Array.isArray(v) ? (v as Item[]) : []);

async function Hero({ s }: { s: HomeSection }) {
  const h = c<HeroContent>(s);
  const options = await getPublicOptions();
  const prices = [["5000000000", "Rp 5 miliar"], ["10000000000", "Rp 10 miliar"], ["20000000000", "Rp 20 miliar"], ["50000000000", "Rp 50 miliar"]];
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-page gap-10 px-6 pb-16 pt-32 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-12 lg:pt-40">
        <div className="flex flex-col justify-end pb-6">
          <h1 className="text-[clamp(3rem,7vw,6.25rem)]">{h.headline}</h1>
          {h.description && <p className="mt-8 max-w-md text-lg text-mist">{h.description}</p>}
          {h.ctaLabel && h.ctaHref && <Link href={safeHref(h.ctaHref)} className="btn-primary mt-8 self-start">{h.ctaLabel}</Link>}
        </div>
        <div className="hero-reveal aspect-[5/4] overflow-hidden bg-stone lg:aspect-[4/4.2]">
          {s.image ? <Photo image={s.image} priority sizes="(min-width:1024px) 55vw, 100vw" /> : <Facade tone={0} className="h-full w-full" />}
        </div>
      </div>
      <div className="mx-auto max-w-page px-6 pb-24 lg:px-12">
        <form action="/properties" method="get" className="grid gap-x-8 gap-y-2 bg-paper p-6 md:grid-cols-[1.4fr_1fr_1fr_.7fr_auto] md:items-end lg:p-8" aria-label="Search properties">
          <label className="block text-xs text-mist">Location
            <select name="location" className="field mt-1 text-basalt" defaultValue=""><option value="">All locations</option>{options.locations.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select>
          </label>
          <label className="block text-xs text-mist">Property type
            <select name="type" className="field mt-1 text-basalt" defaultValue=""><option value="">Any type</option>{options.categories.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
          </label>
          <label className="block text-xs text-mist">Maximum price
            <select name="maxPrice" className="field mt-1 text-basalt" defaultValue=""><option value="">No limit</option>{prices.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="block text-xs text-mist">Bedrooms
            <select name="beds" className="field mt-1 text-basalt" defaultValue=""><option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
          </label>
          <button type="submit" className="btn-brass mt-4 md:mt-0">Search properties</button>
        </form>
      </div>
    </section>
  );
}

async function Properties({ s }: { s: HomeSection }) {
  const p = c<PropertiesContent>(s);
  const cards = await homeCards(p.variant, p.count);
  if (cards.length === 0) return null;
  const head = (
    <div className="mb-12 flex items-end justify-between gap-6 border-b border-basalt/20 pb-6">
      <h2 className="text-4xl lg:text-5xl">{p.title}</h2>
      {p.linkLabel && p.linkHref && <Link href={safeHref(p.linkHref)} className="shrink-0 text-sm underline underline-offset-4 hover:text-brass">{p.linkLabel}</Link>}
    </div>
  );
  if (p.variant !== "featured") {
    return (
      <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-label={p.title}>
        {head}
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{cards.map((x) => <PropertyCard key={x.id} p={x} />)}</div>
      </section>
    );
  }
  const [lead, ...rest] = cards;
  return (
    <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-label={p.title}>
      {head}
      <div className={`grid gap-12 ${rest.length ? "lg:grid-cols-[1.3fr_1fr] lg:gap-16" : ""}`}>
        <Link href={`/properties/${lead.slug}`} className="group block">
          <div className="aspect-[4/3] overflow-hidden bg-stone"><Photo image={lead.image} sizes="(min-width:1024px) 55vw, 100vw" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" /></div>
          <div className="mt-6 flex items-start justify-between gap-6">
            <div><p className="text-sm text-mist">{lead.category}, {lead.transaction === "RENT" ? "for rent" : "for sale"}</p><h3 className="mt-1 text-3xl">{lead.title}</h3><p className="mt-2 text-sm text-mist">{lead.location}</p></div>
            <p className="shrink-0 font-serif text-2xl text-brass">{formatPrice(lead.price, lead.currency)}</p>
          </div>
        </Link>
        {rest.length > 0 && (
          <ul className="divide-y divide-basalt/15 border-y border-basalt/15 self-start">
            {rest.map((x) => (
              <li key={x.id}>
                <Link href={`/properties/${x.slug}`} className="group grid grid-cols-[110px_1fr] gap-5 py-5">
                  <div className="aspect-square overflow-hidden bg-stone"><Photo image={x.image} sizes="110px" /></div>
                  <div className="flex flex-col justify-between"><div><h3 className="text-xl group-hover:text-moss">{x.title}</h3><p className="mt-1 text-sm text-mist">{x.location}</p></div><p className="text-sm"><span className="text-brass">{formatPrice(x.price, x.currency)}</span></p></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function Locations({ s }: { s: HomeSection }) {
  const l = c<LocationsContent>(s);
  const rows = await locationsWithCounts(l.count);
  if (rows.length === 0) return null;
  return (
    <section className="mb-28 bg-stone" aria-labelledby={`h-${s.id}`}>
      <div className="mx-auto grid max-w-page gap-12 px-6 py-24 lg:grid-cols-[1fr_1.4fr] lg:px-12">
        <div><h2 id={`h-${s.id}`} className="text-4xl lg:text-5xl">{l.title}</h2>{l.intro && <p className="mt-6 max-w-sm text-mist">{l.intro}</p>}</div>
        <ul className="border-t border-basalt/20">
          {rows.map((r) => (
            <li key={r.slug} className="border-b border-basalt/20">
              <Link href={`/properties?location=${r.slug}`} className="group flex items-baseline justify-between py-6">
                <span className="font-serif text-3xl tracking-display transition-transform duration-300 group-hover:translate-x-2 lg:text-4xl">{r.name}</span>
                <span className="text-sm text-mist">{r.count} {r.count === 1 ? "property" : "properties"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Columns({ s }: { s: HomeSection }) {
  const x = c<ItemsContent>(s);
  const items = list(x.items);
  if (items.length === 0) return null;
  const cols = items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-labelledby={`h-${s.id}`}>
      <h2 id={`h-${s.id}`} className="max-w-2xl text-4xl lg:text-5xl">{x.title}</h2>
      {x.intro && <p className="mt-4 max-w-xl text-mist">{x.intro}</p>}
      <div className={`mt-14 grid gap-12 ${cols}`}>
        {items.map((it, i) => (
          <div key={i} className="border-t border-basalt pt-6">
            <h3 className="text-2xl">{it.href ? <Link href={safeHref(it.href)} className="underline-offset-4 hover:underline">{it.title}</Link> : it.title}</h3>
            {it.text && <p className="mt-4 max-w-sm text-mist">{it.text}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

async function Agents({ s }: { s: HomeSection }) {
  const a = c<LocationsContent>(s);
  const rows = await getFeaturedAgents(a.count);
  if (rows.length === 0) return null;
  return (
    <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-labelledby={`h-${s.id}`}>
      <h2 id={`h-${s.id}`} className="text-4xl lg:text-5xl">{a.title}</h2>
      {a.intro && <p className="mt-4 max-w-xl text-mist">{a.intro}</p>}
      <ul className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {rows.map((x) => (
          <li key={x.id}>
           <Link href={`/agents/${x.slug}`} className="group block">
            <div className="aspect-[4/5] overflow-hidden bg-stone">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.photo && <img src={x.photo.src} alt={x.photo.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
            </div>
            <p className="mt-4 font-serif text-xl">{x.name}</p>
            {x.title && <p className="text-sm text-mist">{x.title}</p>}
           </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Testimonials({ s }: { s: HomeSection }) {
  const t = await getTestimonials();
  if (t.length === 0) return null;
  return (
    <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-labelledby={`h-${s.id}`}>
      <h2 id={`h-${s.id}`} className="text-4xl lg:text-5xl">{c<TitleContent>(s).title}</h2>
      <div className="mt-14 grid gap-12 md:grid-cols-3">
        {t.slice(0, 6).map((x) => (
          <figure key={x.id} className="border-t border-basalt pt-6">
            <blockquote className="font-serif text-2xl leading-snug tracking-display">“{x.quote}”</blockquote>
            <figcaption className="mt-5 text-sm"><span>{x.author}</span>{x.role && <span className="text-mist">, {x.role}</span>}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

async function Faq({ s }: { s: HomeSection }) {
  const f = await getFaqs();
  if (f.length === 0) return null;
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: f.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) };
  return (
    <section className="mx-auto max-w-page px-6 pb-28 lg:px-12" aria-labelledby={`h-${s.id}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <h2 id={`h-${s.id}`} className="text-4xl lg:text-5xl">{c<TitleContent>(s).title}</h2>
        <div className="border-t border-basalt/20">
          {f.map((q) => (
            <details key={q.id} className="group border-b border-basalt/20 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg [&::-webkit-details-marker]:hidden">
                {q.question}<span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-[62ch] text-mist">{q.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta({ s }: { s: HomeSection }) {
  const x = c<CtaContent>(s);
  return (
    <section className="bg-basalt text-paper">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-6 py-24 lg:flex-row lg:items-end lg:justify-between lg:px-12">
        <h2 className="max-w-2xl text-4xl lg:text-6xl">{x.title}</h2>
        <Link href={safeHref(x.buttonHref)} className="btn-brass">{x.buttonLabel}</Link>
      </div>
    </section>
  );
}

export function HomeSectionView({ s }: { s: HomeSection }) {
  switch (s.type) {
    case "hero": return <Hero s={s} />;
    case "properties": return <Properties s={s} />;
    case "locations": return <Locations s={s} />;
    case "why_us": case "services": case "insights": return <Columns s={s} />;
    case "agents": return <Agents s={s} />;
    case "testimonials": return <Testimonials s={s} />;
    case "faq": return <Faq s={s} />;
    case "cta": return <Cta s={s} />;
    default: return null;
  }
}
