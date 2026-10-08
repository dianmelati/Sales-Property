import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { PublicCard } from "@/types/property";
import { Photo } from "./photo";
import { FavoriteButton } from "./favorite-button";
import { CompareButton } from "./compare-button";

function specs(p: PublicCard): string {
  return [
    p.bedrooms != null && `${p.bedrooms} bedrooms`,
    p.bathrooms != null && `${p.bathrooms} bathrooms`,
    p.landArea ? `${p.landArea} m² land` : null,
    p.buildingArea ? `${p.buildingArea} m² building` : null,
  ].filter(Boolean).join(" · ");
}

export function PropertyCard({ p, view = "grid", priority = false }: { p: PublicCard; view?: "grid" | "list"; priority?: boolean }) {
  const href = `/properties/${p.slug}`;
  const list = view === "list";
  return (
    <article className={`group relative ${list ? "grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8" : ""}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-stone" tabIndex={-1} aria-hidden="true">
        <Photo image={p.image} priority={priority} sizes={list ? "(min-width:1024px) 30vw, (min-width:640px) 40vw, 100vw" : "(min-width:1280px) 28vw, (min-width:640px) 45vw, 100vw"}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        <span className="absolute left-3 top-3 bg-paper px-2.5 py-1 text-xs">{p.transaction === "RENT" ? "For rent" : "For sale"}</span>
        {(p.isPremium || p.isFeatured) && <span className="absolute bottom-3 left-3 bg-basalt px-2.5 py-1 text-xs text-paper">{p.isPremium ? "Premium" : "Featured"}</span>}
      </Link>
      <FavoriteButton slug={p.slug} title={p.title} className={`absolute right-3 top-3 ${list ? "sm:left-[calc(40%-3.25rem)] sm:right-auto" : ""}`} />

      <div className={list ? "flex flex-col justify-center" : "mt-4"}>
        <p className="text-sm text-mist">{p.category}, {p.location}</p>
        <h3 className={`mt-1 ${list ? "text-3xl" : "text-2xl"}`}><Link href={href} className="hover:text-moss">{p.title}</Link></h3>
        <p className="mt-2 font-serif text-xl text-brass">{formatPrice(p.price, p.currency)}</p>
        {specs(p) && <p className="mt-3 text-sm">{specs(p)}</p>}
        {list && <Link href={href} className="btn-ghost mt-6 self-start">View details</Link>}
        <CompareButton slug={p.slug} title={p.title} className="mt-3 self-start" />
      </div>
    </article>
  );
}
