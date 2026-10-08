import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { deleteAgent } from "@/server/agents/actions";

export const metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await requirePermission("agent:read");
  const canWrite = can(user.role, "agent:write");
  const rows = await prisma.agent.findMany({
    where: { deletedAt: null }, orderBy: { name: "asc" },
    include: { _count: { select: { properties: true, leads: true } } },
  });
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Agents</h1>
        {canWrite && <Link href="/admin/agents/new" className="btn-primary">Add agent</Link>}
      </div>
      {rows.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No agents yet</p><p className="mt-2 max-w-md text-sm text-mist">Add your agents to assign them to properties and leads.</p></div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">Agent</th><th className="py-3 pr-4 font-normal">Properties</th><th className="py-3 pr-4 font-normal">Leads</th><th className="py-3 pr-4 font-normal">Status</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="py-4 pr-4"><p className="font-medium">{a.name}</p><p className="text-xs text-mist">{a.title ?? a.email ?? a.phone ?? ""}</p></td>
                  <td className="py-4 pr-4 tabular-nums">{a._count.properties}</td>
                  <td className="py-4 pr-4 tabular-nums">{a._count.leads}</td>
                  <td className="py-4 pr-4">{a.isActive ? "Active" : "Inactive"}{a.isFeatured && " · Featured"}</td>
                  <td className="py-4 text-right">{canWrite && (
                    <span className="flex justify-end gap-5">
                      <Link href={`/admin/agents/${a.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link>
                      <form action={deleteAgent.bind(null, a.id)}><button className="underline underline-offset-4 hover:text-brass">Delete</button></form>
                    </span>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 max-w-xl text-xs text-mist">Deleting an agent unassigns their properties. Past leads keep the agent&apos;s name in their history.</p>
    </>
  );
}
