import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { leadWhere, type LeadFilters } from "@/lib/lead-where";

export { leadWhere };
export type { LeadFilters };

export const LEAD_PAGE = 25;
export async function listLeads(f: LeadFilters, scope: Prisma.LeadWhereInput, page: number) {
  const where = leadWhere(f, scope);
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * LEAD_PAGE, take: LEAD_PAGE,
      include: { property: { select: { title: true, code: true } }, agent: { select: { name: true } } },
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / LEAD_PAGE)) };
}
