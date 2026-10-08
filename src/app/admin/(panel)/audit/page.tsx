import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit logs" };
export const dynamic = "force-dynamic";
type SP = { q?: string; entity?: string; user?: string; period?: string; page?: string };
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("audit:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const and: Prisma.AuditLogWhereInput[] = [];
  if (sp.q?.trim()) and.push({ action: { contains: sp.q.trim().slice(0, 60), mode: "insensitive" } });
  if (sp.entity) and.push({ entity: sp.entity });
  if (sp.user) and.push({ userId: sp.user });
  const days = Number(sp.period);
  if ([1, 7, 30, 90].includes(days)) and.push({ createdAt: { gte: new Date(Date.now() - days * 864e5) } });
  const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};

  const [rows, total, entities, users] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { name: true } } } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["entity"], orderBy: { entity: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (o: Record<string, string | undefined>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...o })) if (v) q.set(k, v); return q.toString(); };
  const sel = "field !py-2 text-sm";
  const when = (d: Date) => d.toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <h1 className="text-4xl">Audit logs</h1>
      <p className="mt-3 max-w-xl text-sm text-mist">A record of who changed what. Entries cannot be edited or deleted from the admin.</p>
      <form method="get" className="mt-10 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="text-xs text-mist">Action contains<input name="q" defaultValue={sp.q} placeholder="e.g. property, login_failed" className={sel} /></label>
        <label className="text-xs text-mist">Record type<select name="entity" defaultValue={sp.entity ?? ""} className={sel}><option value="">All</option>{entities.map((e) => <option key={e.entity}>{e.entity}</option>)}</select></label>
        <label className="text-xs text-mist">User<select name="user" defaultValue={sp.user ?? ""} className={sel}><option value="">Everyone</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="text-xs text-mist">When<select name="period" defaultValue={sp.period ?? ""} className={sel}><option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <button className="btn-ghost !py-2">Apply</button>
      </form>

      <div className="mt-8 overflow-x-auto">
        {rows.length === 0 ? <div className="border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No entries match</p></div> : (
          <table className="w-full min-w-[760px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">When</th><th className="py-3 pr-4 font-normal">Who</th><th className="py-3 pr-4 font-normal">Action</th><th className="py-3 pr-4 font-normal">Record</th><th className="py-3 font-normal">IP</th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap py-3 pr-4 text-mist">{when(r.createdAt)}</td>
                  <td className="py-3 pr-4">{r.user?.name ?? <span className="text-mist">{r.action.startsWith("auth.") ? "Unknown or visitor" : "System"}</span>}</td>
                  <td className="py-3 pr-4"><span className="font-mono text-xs">{r.action}</span>
                    {r.diff != null && <details className="mt-1"><summary className="cursor-pointer text-xs text-mist">Details</summary><pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs text-mist">{JSON.stringify(r.diff, null, 2).slice(0, 2000)}</pre></details>}</td>
                  <td className="py-3 pr-4">{r.entity}{r.entityId && <span className="block text-xs text-mist">{r.entityId.slice(0, 10)}</span>}</td>
                  <td className="py-3 text-xs text-mist">{r.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
          <p className="text-mist">{total} entries, page {page} of {pages}</p>
          <div className="flex gap-6">
            {page > 1 && <Link href={`/admin/audit?${qs({ page: String(page - 1) })}`} className="underline underline-offset-4">Previous</Link>}
            {page < pages && <Link href={`/admin/audit?${qs({ page: String(page + 1) })}`} className="underline underline-offset-4">Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
