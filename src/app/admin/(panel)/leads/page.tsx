import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUSES, SOURCE_LABEL, STATUS_LABEL, type LeadStatusKey } from "@/lib/leads";
import { listLeads } from "@/server/leads/queries";
import { leadScope } from "@/server/leads/scope";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";
type SP = { q?: string; status?: string; source?: string; agent?: string; period?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("lead:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ items, total, pages }, agents] = await Promise.all([
    listLeads(sp, await leadScope(user), page),
    user.role === "AGENT" ? [] : prisma.agent.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const qs = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) q.set(k, v);
    return q.toString();
  };
  const sel = "field !py-2 text-sm";
  const fmt = (d: Date) => d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
  const filtered = !!(sp.q || sp.status || sp.source || sp.agent || sp.period);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Leads</h1>
        <div className="flex flex-wrap items-center gap-6">
          <a href={`/api/admin/leads/export?${qs({ page: undefined })}`} className="text-sm underline underline-offset-4 hover:text-brass">Export CSV</a>
          {can(user.role, "lead:write") && <Link href="/admin/leads/new" className="btn-primary">Add lead</Link>}
        </div>
      </div>

      <form method="get" className="mt-10 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="text-xs text-mist">Search<input name="q" defaultValue={sp.q} placeholder="Name, phone or email" className={sel} /></label>
        <label className="text-xs text-mist">Status<select name="status" defaultValue={sp.status ?? ""} className={sel}><option value="">All</option>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label className="text-xs text-mist">Source<select name="source" defaultValue={sp.source ?? ""} className={sel}><option value="">All</option>{Object.entries(SOURCE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        {user.role !== "AGENT" && (
          <label className="text-xs text-mist">Agent<select name="agent" defaultValue={sp.agent ?? ""} className={sel}><option value="">Everyone</option><option value="unassigned">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        )}
        <label className="text-xs text-mist">Received<select name="period" defaultValue={sp.period ?? ""} className={sel}><option value="">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <button className="btn-ghost !py-2">Apply</button>
      </form>

      <div className="mt-8 overflow-x-auto">
        {items.length === 0 ? (
          <div className="border-y border-basalt/15 py-16"><p className="font-serif text-2xl">{filtered ? "No leads match these filters" : "No leads yet"}</p>
            <p className="mt-2 text-sm text-mist">{filtered ? "Clear a filter or search for something else." : "Inquiries from property pages appear here automatically."}</p></div>
        ) : (
          <table className="w-full min-w-[760px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15">
              <th className="py-3 pr-4 font-normal">Contact</th><th className="py-3 pr-4 font-normal">Property</th><th className="py-3 pr-4 font-normal">Source</th>
              <th className="py-3 pr-4 font-normal">Status</th><th className="py-3 pr-4 font-normal">Agent</th><th className="py-3 font-normal">Received</th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-stone/50">
                  <td className="py-4 pr-4"><Link href={`/admin/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">{l.name}</Link><p className="text-xs text-mist">{l.phone}</p></td>
                  <td className="py-4 pr-4">{l.property ? <>{l.property.title}<p className="text-xs text-mist">{l.property.code}</p></> : <span className="text-mist">General</span>}</td>
                  <td className="py-4 pr-4">{SOURCE_LABEL[l.source] ?? l.source}</td>
                  <td className="py-4 pr-4"><span className={l.status === "NEW" ? "text-brass" : ""}>{STATUS_LABEL[l.status as LeadStatusKey]}</span></td>
                  <td className="py-4 pr-4">{l.agent?.name ?? <span className="text-mist">Unassigned</span>}</td>
                  <td className="py-4 whitespace-nowrap text-mist">{fmt(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
          <p className="text-mist">{total} leads, page {page} of {pages}</p>
          <div className="flex gap-6">
            {page > 1 && <Link href={`/admin/leads?${qs({ page: String(page - 1) })}`} className="underline underline-offset-4">Previous</Link>}
            {page < pages && <Link href={`/admin/leads?${qs({ page: String(page + 1) })}`} className="underline underline-offset-4">Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
