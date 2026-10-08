import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/api";
import { STATUS_LABEL, SOURCE_LABEL, type LeadStatusKey } from "@/lib/leads";
import { csvCell as cell } from "@/lib/csv";
import { audit } from "@/server/audit";
import { leadWhere } from "@/server/leads/queries";
import { leadScope } from "@/server/leads/scope";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await apiAuth(req, "lead:read");
  if ("error" in auth) return auth.error;
  const sp = new URL(req.url).searchParams;
  const f = { q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, source: sp.get("source") ?? undefined, agent: sp.get("agent") ?? undefined, period: sp.get("period") ?? undefined };
  const rows = await prisma.lead.findMany({
    where: leadWhere(f, await leadScope(auth.user)), orderBy: { createdAt: "desc" }, take: 5000,
    include: { property: { select: { code: true, title: true } }, agent: { select: { name: true } } },
  });
  const head = ["Created", "Name", "Phone", "Email", "Status", "Source", "Property ID", "Property", "Agent", "Viewing date", "Message"];
  const lines = [head.map(cell).join(",")];
  for (const r of rows) {
    lines.push([
      r.createdAt.toISOString(), r.name, r.phone, r.email, STATUS_LABEL[r.status as LeadStatusKey], SOURCE_LABEL[r.source] ?? r.source,
      r.property?.code, r.property?.title, r.agent?.name, r.viewingAt?.toISOString().slice(0, 10), r.message,
    ].map(cell).join(","));
  }
  await audit({ userId: auth.user.id, action: "lead.export", entity: "Lead", diff: { rows: rows.length } });
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
