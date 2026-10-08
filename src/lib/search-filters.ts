import type { Prisma } from "@prisma/client";

export const SORTS = {
  newest: [{ publishedAt: "desc" }, { id: "desc" }],
  price_asc: [{ price: "asc" }, { id: "asc" }],
  price_desc: [{ price: "desc" }, { id: "desc" }],
  building_desc: [{ buildingArea: { sort: "desc", nulls: "last" } }, { id: "desc" }],
  land_desc: [{ landArea: { sort: "desc", nulls: "last" } }, { id: "desc" }],
} as const satisfies Record<string, Prisma.PropertyOrderByWithRelationInput[]>;
export type PublicSort = keyof typeof SORTS;
export const SORT_LABELS: Record<PublicSort, string> = {
  newest: "Newest", price_asc: "Price, low to high", price_desc: "Price, high to low",
  building_desc: "Largest building", land_desc: "Largest land",
};

export interface PublicFilters {
  q?: string; location?: string; type?: string; transaction?: "SALE" | "RENT";
  minPrice?: number; maxPrice?: number; beds?: number; baths?: number; minLand?: number; minBuilding?: number;
  certificate?: "SHM" | "HGB" | "HPL" | "STRATA" | "OTHER";
  furnished?: boolean; pool?: boolean; garage?: boolean; garden?: boolean; featured?: boolean;
  sort: PublicSort; view: "grid" | "list"; page: number;
}

type Raw = Record<string, string | undefined>;
const str = (v?: string) => (v?.trim() ? v.trim().slice(0, 80) : undefined);
const num = (v?: string) => { const n = Number(v); return v && Number.isFinite(n) && n > 0 ? Math.min(n, 1e15) : undefined; };
const flag = (v?: string) => (v === "1" ? true : undefined);

export function parseFilters(sp: Raw): PublicFilters {
  const t = sp.transaction?.toUpperCase();
  const cert = sp.certificate?.toUpperCase();
  return {
    q: str(sp.q), location: str(sp.location), type: str(sp.type),
    transaction: t === "SALE" || t === "RENT" ? t : undefined,
    minPrice: num(sp.minPrice), maxPrice: num(sp.maxPrice),
    beds: num(sp.beds), baths: num(sp.baths), minLand: num(sp.minLand), minBuilding: num(sp.minBuilding),
    certificate: ["SHM", "HGB", "HPL", "STRATA", "OTHER"].includes(cert ?? "") ? (cert as PublicFilters["certificate"]) : undefined,
    furnished: flag(sp.furnished), pool: flag(sp.pool), garage: flag(sp.garage), garden: flag(sp.garden), featured: flag(sp.featured),
    sort: sp.sort && sp.sort in SORTS ? (sp.sort as PublicSort) : "newest",
    view: sp.view === "list" ? "list" : "grid",
    page: Math.max(1, Math.floor(Number(sp.page)) || 1),
  };
}
