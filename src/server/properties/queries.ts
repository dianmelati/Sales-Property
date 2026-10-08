import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 20;
const SORTS = {
  newest: { createdAt: "desc" }, oldest: { createdAt: "asc" },
  price_desc: { price: "desc" }, price_asc: { price: "asc" },
  title: { title: "asc" }, views: { viewCount: "desc" },
} as const satisfies Record<string, Prisma.PropertyOrderByWithRelationInput>;
export type SortKey = keyof typeof SORTS;
export const isSortKey = (s: string): s is SortKey => s in SORTS;

export interface ListParams { q?: string; status?: string; transaction?: string; categoryId?: string; sort?: string; page?: number }

export async function listProperties(p: ListParams) {
  const where: Prisma.PropertyWhereInput = { deletedAt: null };
  if (p.q) where.OR = [
    { title: { contains: p.q, mode: "insensitive" } },
    { code: { contains: p.q, mode: "insensitive" } },
    { address: { contains: p.q, mode: "insensitive" } },
  ];
  if (p.status && ["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "RENTED", "ARCHIVED"].includes(p.status)) where.status = p.status as never;
  if (p.transaction === "SALE" || p.transaction === "RENT") where.transaction = p.transaction;
  if (p.categoryId) where.categoryId = p.categoryId;

  const page = Math.max(1, p.page ?? 1);
  const orderBy = SORTS[p.sort && isSortKey(p.sort) ? p.sort : "newest"];
  const [items, total] = await Promise.all([
    prisma.property.findMany({
      where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, code: true, title: true, slug: true, status: true, transaction: true, price: true, currency: true, isFeatured: true, updatedAt: true, category: { select: { name: true } }, location: { select: { name: true } } },
    }),
    prisma.property.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFormOptions() {
  const [categories, locations, agents] = await Promise.all([
    prisma.propertyCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.propertyLocation.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.agent.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, locations, agents };
}
