import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function propertyStats() {
  const base = { deletedAt: null };
  const [total, published, draft, featured] = await Promise.all([
    prisma.property.count({ where: base }),
    prisma.property.count({ where: { ...base, status: "PUBLISHED" } }),
    prisma.property.count({ where: { ...base, status: "DRAFT" } }),
    prisma.property.count({ where: { ...base, isFeatured: true } }),
  ]);
  return { total, published, draft, featured };
}

export async function leadStats(scope: Prisma.LeadWhereInput) {
  const [total, fresh, viewing] = await Promise.all([
    prisma.lead.count({ where: scope }),
    prisma.lead.count({ where: { AND: [scope, { status: "NEW" }] } }),
    prisma.lead.count({ where: { AND: [scope, { source: "viewing_request" }] } }),
  ]);
  return { total, fresh, viewing };
}

export async function leadsByStatus(scope: Prisma.LeadWhereInput) {
  const rows = await prisma.lead.groupBy({ by: ["status"], where: scope, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Record<string, number>;
}

/** Jumlah lead per hari selama `days` hari terakhir (hari ini termasuk), dalam UTC. */
export async function leadsByDay(scope: Prisma.LeadWhereInput, days = 30) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - (days - 1));
  const rows = await prisma.lead.findMany({ where: { AND: [scope, { createdAt: { gte: start } }] }, select: { createdAt: true }, take: 10000 });
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); buckets.set(d.toISOString().slice(0, 10), 0); }
  for (const r of rows) { const k = r.createdAt.toISOString().slice(0, 10); if (buckets.has(k)) buckets.set(k, buckets.get(k)! + 1); }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

export async function topViewed(take = 5) {
  return prisma.property.findMany({ where: { deletedAt: null, viewCount: { gt: 0 } }, orderBy: { viewCount: "desc" }, take, select: { id: true, title: true, code: true, viewCount: true } });
}

export async function topContacted(scope: Prisma.LeadWhereInput, take = 5) {
  const rows = await prisma.lead.groupBy({ by: ["propertyId"], where: { AND: [scope, { propertyId: { not: null } }] }, _count: { _all: true }, orderBy: { _count: { propertyId: "desc" } }, take });
  const ids = rows.map((r) => r.propertyId!).filter(Boolean);
  const props = await prisma.property.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, code: true } });
  const by = new Map(props.map((p) => [p.id, p]));
  return rows.flatMap((r) => { const p = by.get(r.propertyId!); return p ? [{ ...p, count: r._count._all }] : []; });
}

export async function recentLeads(scope: Prisma.LeadWhereInput, take = 6) {
  return prisma.lead.findMany({ where: scope, orderBy: { createdAt: "desc" }, take, include: { property: { select: { title: true } } } });
}
