import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LeadForm } from "./lead-form";

export const metadata = { title: "Add lead" };

export default async function NewLead() {
  const user = await requirePermission("lead:write");
  const [properties, agents] = await Promise.all([
    prisma.property.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, title: true, code: true } }),
    user.role === "AGENT" ? [] : prisma.agent.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (<><h1 className="mb-3 text-4xl">Add lead</h1><p className="mb-10 text-sm text-mist">For enquiries that came by phone, in person or through a referral.</p><LeadForm properties={properties} agents={agents} isAgent={user.role === "AGENT"} /></>);
}
