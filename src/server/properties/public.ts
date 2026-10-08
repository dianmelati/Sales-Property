import "server-only";
import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import type { CompareRow, PublicCard } from "@/types/property";
import { SORTS, parseFilters, SORT_LABELS, type PublicFilters, type PublicSort } from "@/lib/search-filters";

export { parseFilters, SORT_LABELS };
export type { PublicFilters, PublicSort };

export const PUBLIC_PAGE_SIZE = 12;

function buildWhere(f: PublicFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [];
  if (f.q) and.push({ OR: [
    { title: { contains: f.q, mode: "insensitive" } }, { address: { contains: f.q, mode: "insensitive" } }, { code: { contains: f.q, mode: "insensitive" } },
  ] });
  if (f.location) and.push({ location: { OR: [
    { slug: f.location }, { name: { contains: f.location, mode: "insensitive" } }, { city: { contains: f.location, mode: "insensitive" } },
  ] } });
  if (f.type) and.push({ category: { slug: f.type } });
  if (f.minPrice || f.maxPrice) and.push({ price: { gte: f.minPrice, lte: f.maxPrice } });
  if (f.beds) and.push({ bedrooms: { gte: f.beds } });
  if (f.baths) and.push({ bathrooms: { gte: f.baths } });
  if (f.minLand) and.push({ landArea: { gte: f.minLand } });
  if (f.minBuilding) and.push({ buildingArea: { gte: f.minBuilding } });
  return {
    deletedAt: null, status: "PUBLISHED", ...(f.transaction && { transaction: f.transaction }),
    ...(f.certificate && { certificate: f.certificate }),
    ...(f.furnished && { furnished: true }), ...(f.pool && { hasPool: true }), ...(f.garage && { hasGarage: true }),
    ...(f.garden && { hasGarden: true }), ...(f.featured && { isFeatured: true }),
    ...(and.length && { AND: and }),
  };
}

const cardSelect = {
  id: true, slug: true, code: true, title: true, transaction: true, price: true, currency: true,
  bedrooms: true, bathrooms: true, landArea: true, buildingArea: true, isFeatured: true, isPremium: true,
  category: { select: { name: true } }, location: { select: { name: true } },
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] as Prisma.PropertyImageOrderByWithRelationInput[], take: 1,
    select: { media: { select: { variants: true, blurDataUrl: true, alt: true, name: true, width: true, height: true } } },
  },
} satisfies Prisma.PropertySelect;

type Row = Prisma.PropertyGetPayload<{ select: typeof cardSelect }>;

function toCard(r: Row): PublicCard {
  const m = r.images[0]?.media;
  const u = m ? variantUrls(m.variants) : null;
  return {
    id: r.id, slug: r.slug, code: r.code, title: r.title, category: r.category.name, location: r.location.name,
    transaction: r.transaction, price: Number(r.price), currency: r.currency,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, landArea: r.landArea, buildingArea: r.buildingArea,
    isFeatured: r.isFeatured, isPremium: r.isPremium,
    image: m && u ? { src: u.medium, srcSet: `${u.small} 640w, ${u.medium} 1280w, ${u.large} 2200w`, blur: m.blurDataUrl, alt: m.alt || r.title, width: m.width, height: m.height } : null,
  };
}

async function searchPublicRaw(f: PublicFilters) {
  const where = buildWhere(f);
  const [rows, total] = await Promise.all([
    prisma.property.findMany({ where, orderBy: [...SORTS[f.sort]], skip: (f.page - 1) * PUBLIC_PAGE_SIZE, take: PUBLIC_PAGE_SIZE, select: cardSelect }),
    prisma.property.count({ where }),
  ]);
  return { items: rows.map(toCard), total, pages: Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE)) };
}

export async function cardsBySlugs(slugs: string[]): Promise<PublicCard[]> {
  const list = [...new Set(slugs)].slice(0, 30);
  if (!list.length) return [];
  const rows = await prisma.property.findMany({ where: { slug: { in: list }, deletedAt: null, status: "PUBLISHED" }, select: cardSelect });
  const bySlug = new Map(rows.map((r) => [r.slug, toCard(r)]));
  return list.map((s) => bySlug.get(s)).filter((c): c is PublicCard => !!c);
}

async function getPublicOptionsRaw() {
  const [categories, locations] = await Promise.all([
    prisma.propertyCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
    prisma.propertyLocation.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);
  return { categories, locations };
}

/** Properti serupa: lokasi dan jenis transaksi sama dulu, lalu tipe yang sama. Hanya yang PUBLISHED. */
export async function similarCards(p: { id: string; locationId: string; categoryId: string; transaction: "SALE" | "RENT" }, take = 3): Promise<PublicCard[]> {
  const base = { deletedAt: null, status: "PUBLISHED" as const, transaction: p.transaction, id: { not: p.id } };
  const first = await prisma.property.findMany({ where: { ...base, locationId: p.locationId }, orderBy: { publishedAt: "desc" }, take, select: cardSelect });
  let rows = first;
  if (rows.length < take) {
    const have = rows.map((r) => r.id);
    const more = await prisma.property.findMany({
      where: { ...base, categoryId: p.categoryId, id: { notIn: [p.id, ...have] } }, orderBy: { publishedAt: "desc" }, take: take - rows.length, select: cardSelect,
    });
    rows = [...rows, ...more];
  }
  return rows.map(toCard);
}

export async function homeCards(variant: "featured" | "premium" | "latest", take: number): Promise<PublicCard[]> {
  const where: Prisma.PropertyWhereInput = { deletedAt: null, status: "PUBLISHED", ...(variant === "featured" && { isFeatured: true }), ...(variant === "premium" && { isPremium: true }) };
  const rows = await prisma.property.findMany({ where, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take, select: cardSelect });
  return rows.map(toCard);
}

export async function locationsWithCounts(take: number) {
  const rows = await prisma.propertyLocation.findMany({
    select: { name: true, slug: true, _count: { select: { properties: { where: { status: "PUBLISHED", deletedAt: null } } } } },
  });
  return rows.map((r) => ({ name: r.name, slug: r.slug, count: r._count.properties })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, take);
}

/** Data lengkap untuk perbandingan (maks. 3). Properti yang sudah terjual tetap bisa dibandingkan. */
export async function comparisonRows(slugs: string[]): Promise<CompareRow[]> {
  const list = [...new Set(slugs)].slice(0, 3);
  if (!list.length) return [];
  const rows = await prisma.property.findMany({
    where: { slug: { in: list }, deletedAt: null, status: { in: ["PUBLISHED", "RESERVED", "SOLD", "RENTED"] } },
    select: { ...cardSelect, floors: true, parking: true, certificate: true, furnished: true, hasPool: true, hasGarage: true, hasGarden: true },
  });
  const by = new Map(rows.map((r) => [r.slug, { ...toCard(r), floors: r.floors, parking: r.parking, certificate: r.certificate, furnished: r.furnished, hasPool: r.hasPool, hasGarage: r.hasGarage, hasGarden: r.hasGarden }]));
  return list.map((s) => by.get(s)).filter((r): r is CompareRow => !!r);
}

/** Kartu untuk kondisi bebas (halaman lokasi dan agen). Hanya yang PUBLISHED. */
export async function cardsByWhere(where: Prisma.PropertyWhereInput, take = 12): Promise<{ items: PublicCard[]; total: number }> {
  const w: Prisma.PropertyWhereInput = { ...where, deletedAt: null, status: "PUBLISHED" };
  const [rows, total] = await Promise.all([
    prisma.property.findMany({ where: w, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take, select: cardSelect }),
    prisma.property.count({ where: w }),
  ]);
  return { items: rows.map(toCard), total };
}

/** Hasil pencarian di-cache 2 menit per kombinasi filter dan dibuang saat admin menyimpan (tag "public"). Pencarian teks bebas tidak di-cache agar cache tidak membengkak. */
export function searchPublic(f: PublicFilters) {
  if (f.q) return searchPublicRaw(f);
  return unstable_cache(() => searchPublicRaw(f), ["public-search", JSON.stringify(f)], { revalidate: 120, tags: ["public"] })();
}
export const getPublicOptions = unstable_cache(getPublicOptionsRaw, ["public-options"], { revalidate: 300, tags: ["public"] });
