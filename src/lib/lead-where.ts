import type { Prisma } from "@prisma/client";
import { LEAD_STATUSES, SOURCE_LABEL } from "@/lib/leads";

export interface LeadFilters { q?: string; status?: string; source?: string; agent?: string; period?: string }

export function leadWhere(f: LeadFilters, scope: Prisma.LeadWhereInput): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [scope];
  const q = f.q?.trim().slice(0, 80);
  if (q) and.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] });
  if (f.status && (LEAD_STATUSES as readonly string[]).includes(f.status)) and.push({ status: f.status as never });
  if (f.source && f.source in SOURCE_LABEL) and.push({ source: f.source });
  if (f.agent === "unassigned") and.push({ agentId: null });
  else if (f.agent) and.push({ agentId: f.agent });
  const days = Number(f.period);
  if ([7, 30, 90].includes(days)) and.push({ createdAt: { gte: new Date(Date.now() - days * 864e5) } });
  return { AND: and };
}
