import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUSES, SOURCE_LABEL, STATUS_LABEL, type LeadStatusKey } from "@/lib/leads";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { addNote, updateLead } from "@/server/leads/admin-actions";
import { leadScope } from "@/server/leads/scope";

export const metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("lead:read");
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, ...(await leadScope(user)) },
    include: { property: { select: { id: true, title: true, code: true } }, agent: { select: { name: true } }, notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });
  if (!lead) notFound();
  const canWrite = can(user.role, "lead:write");
  const agents = canWrite && user.role !== "AGENT" ? await prisma.agent.findMany({ where: { deletedAt: null, OR: [{ isActive: true }, { id: lead.agentId ?? "" }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const wa = normalizeWhatsApp(lead.phone);
  const when = (d: Date) => d.toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const viewing = lead.viewingAt?.toISOString().slice(0, 10) ?? "";

  return (
    <>
      <Link href="/admin/leads" className="text-sm underline underline-offset-4">All leads</Link>
      <h1 className="mt-4 text-4xl">{lead.name}</h1>
      <p className="mt-2 text-sm text-mist">{SOURCE_LABEL[lead.source] ?? lead.source} · received {when(lead.createdAt)}</p>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <dl className="divide-y divide-basalt/15 border-y border-basalt/15 text-sm">
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3"><dt className="text-mist">Phone</dt><dd className="flex flex-wrap gap-x-5"><a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4 hover:text-brass">{lead.phone}</a>{wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-brass">Open in WhatsApp</a>}</dd></div>
            {lead.email && <div className="grid grid-cols-[130px_1fr] gap-4 py-3"><dt className="text-mist">Email</dt><dd><a href={`mailto:${lead.email}`} className="underline underline-offset-4 hover:text-brass">{lead.email}</a></dd></div>}
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3"><dt className="text-mist">Property</dt><dd>{lead.property ? <Link href={`/admin/properties/${lead.property.id}/edit`} className="underline underline-offset-4 hover:text-brass">{lead.property.title} ({lead.property.code})</Link> : <span className="text-mist">General inquiry</span>}</dd></div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3"><dt className="text-mist">Agent</dt><dd>{lead.agent?.name ?? <span className="text-mist">Unassigned</span>}</dd></div>
            {lead.viewingAt && <div className="grid grid-cols-[130px_1fr] gap-4 py-3"><dt className="text-mist">Viewing</dt><dd>{lead.viewingAt.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</dd></div>}
          </dl>
          {lead.message && <section className="mt-8" aria-labelledby="msg"><h2 id="msg" className="text-xl">Message</h2><p className="mt-3 max-w-[65ch] whitespace-pre-wrap text-sm leading-relaxed">{lead.message}</p></section>}

          <section className="mt-14" aria-labelledby="notes">
            <h2 id="notes" className="text-2xl">Notes and history</h2>
            {canWrite && (
              <form action={addNote.bind(null, lead.id)} className="mt-5">
                <label className="block text-xs text-mist">Add a note<textarea name="body" required maxLength={2000} rows={3} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" /></label>
                <button className="btn-ghost mt-3 !py-2.5">Save note</button>
              </form>
            )}
            {lead.notes.length === 0 ? <p className="mt-6 text-sm text-mist">No notes yet.</p> : (
              <ol className="mt-6 divide-y divide-basalt/15 border-y border-basalt/15">
                {lead.notes.map((n) => (
                  <li key={n.id} className="py-4 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-mist">{n.author?.name ?? "System"} · {when(n.createdAt)}</p></li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {canWrite && (
          <aside aria-label="Manage lead" className="lg:border-l lg:border-basalt/15 lg:pl-10">
            <form action={updateLead.bind(null, lead.id)} className="space-y-6">
              <label className="block text-xs text-mist">Status
                <select name="status" defaultValue={lead.status} className="field mt-1 text-sm text-basalt">{LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s as LeadStatusKey]}</option>)}</select>
              </label>
              {user.role !== "AGENT" && (
                <label className="block text-xs text-mist">Assigned agent
                  <select name="agentId" defaultValue={lead.agentId ?? ""} className="field mt-1 text-sm text-basalt"><option value="">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                </label>
              )}
              <label className="block text-xs text-mist">Viewing date<input name="viewingDate" type="date" defaultValue={viewing} className="field mt-1 text-sm text-basalt" /></label>
              <button className="btn-primary w-full">Save changes</button>
              <p className="text-xs text-mist">Every change is added to the history on the left.</p>
            </form>
          </aside>
        )}
      </div>
    </>
  );
}
