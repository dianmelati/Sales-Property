import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { DailyBars, StatusBars } from "@/components/charts";
import { LEAD_STATUSES, STATUS_LABEL, SOURCE_LABEL } from "@/lib/leads";
import { leadScope } from "@/server/leads/scope";
import { leadStats, leadsByDay, leadsByStatus, propertyStats, recentLeads, topContacted, topViewed } from "@/server/leads/stats";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="border-t border-basalt pt-4"><dt className="text-sm text-mist">{label}</dt><dd className="mt-1 font-serif text-5xl tracking-display">{value}</dd></div>;
}

export default async function AdminHome() {
  const user = await requirePermission("dashboard:read");
  const showProps = can(user.role, "property:read");
  const showLeads = can(user.role, "lead:read");
  const scope = showLeads ? await leadScope(user) : {};

  const [props, leads, byStatus, byDay, viewed, contacted, recent] = await Promise.all([
    showProps ? propertyStats() : null,
    showLeads ? leadStats(scope) : null,
    showLeads ? leadsByStatus(scope) : null,
    showLeads ? leadsByDay(scope, 30) : null,
    showProps ? topViewed() : [],
    showLeads ? topContacted(scope) : [],
    showLeads ? recentLeads(scope) : [],
  ]);

  return (
    <>
      <h1 className="text-4xl">Welcome, {user.name.split(" ")[0]}</h1>

      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
        {props && <><Stat label="Total properties" value={props.total} /><Stat label="Published" value={props.published} /><Stat label="Drafts" value={props.draft} /><Stat label="Featured" value={props.featured} /></>}
        {leads && <><Stat label="Total leads" value={leads.total} /><Stat label="New leads" value={leads.fresh} /><Stat label="Viewing requests" value={leads.viewing} /></>}
      </dl>

      {byDay && byStatus && (
        <div className="mt-16 grid gap-14 lg:grid-cols-[1.5fr_1fr]">
          <section aria-labelledby="c1"><h2 id="c1" className="mb-4 text-2xl">Leads, last 30 days</h2><DailyBars data={byDay} label="New leads per day" /></section>
          <section aria-labelledby="c2"><h2 id="c2" className="mb-4 text-2xl">Pipeline</h2>
            <StatusBars rows={LEAD_STATUSES.map((s) => ({ label: STATUS_LABEL[s], count: byStatus[s] ?? 0 }))} /></section>
        </div>
      )}

      <div className="mt-16 grid gap-14 lg:grid-cols-2">
        {showLeads && (
          <section aria-labelledby="r1">
            <div className="mb-4 flex items-end justify-between"><h2 id="r1" className="text-2xl">Recent inquiries</h2><Link href="/admin/leads" className="text-sm underline underline-offset-4 hover:text-brass">All leads</Link></div>
            {recent.length === 0 ? <p className="border-y border-basalt/15 py-8 text-sm text-mist">No inquiries yet. They appear here as soon as someone contacts you from a property page.</p> : (
              <ul className="divide-y divide-basalt/15 border-y border-basalt/15">
                {recent.map((l) => (
                  <li key={l.id}><Link href={`/admin/leads/${l.id}`} className="flex items-start justify-between gap-4 py-3 text-sm hover:text-moss">
                    <span className="min-w-0"><span className="block truncate font-medium">{l.name}</span><span className="block truncate text-xs text-mist">{l.property?.title ?? SOURCE_LABEL[l.source] ?? l.source}</span></span>
                    <span className="shrink-0 text-xs text-mist">{STATUS_LABEL[l.status as keyof typeof STATUS_LABEL]}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
        )}
        {showProps && (
          <section aria-labelledby="v1"><h2 id="v1" className="mb-4 text-2xl">Most viewed properties</h2>
            {viewed.length === 0 ? <p className="border-y border-basalt/15 py-8 text-sm text-mist">Views appear once visitors open property pages.</p> : (
              <ol className="divide-y divide-basalt/15 border-y border-basalt/15">{viewed.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-3 text-sm"><Link href={`/admin/properties/${p.id}/edit`} className="min-w-0 truncate hover:text-moss">{p.title}</Link><span className="shrink-0 tabular-nums text-mist">{p.viewCount}</span></li>
              ))}</ol>
            )}
            <p className="mt-2 text-xs text-mist">Views are approximate and include some bots.</p>
          </section>
        )}
        {showLeads && (
          <section aria-labelledby="t1"><h2 id="t1" className="mb-4 text-2xl">Most contacted properties</h2>
            {contacted.length === 0 ? <p className="border-y border-basalt/15 py-8 text-sm text-mist">Properties with inquiries appear here.</p> : (
              <ol className="divide-y divide-basalt/15 border-y border-basalt/15">{contacted.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-3 text-sm"><Link href={`/admin/properties/${p.id}/edit`} className="min-w-0 truncate hover:text-moss">{p.title}</Link><span className="shrink-0 tabular-nums text-mist">{p.count}</span></li>
              ))}</ol>
            )}
          </section>
        )}
      </div>
    </>
  );
}
