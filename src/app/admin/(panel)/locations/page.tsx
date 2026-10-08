import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { deleteLocation } from "@/server/locations/actions";

export const metadata = { title: "Locations" };
export const dynamic = "force-dynamic";

export default async function LocationsAdmin() {
  const user = await requirePermission("property:read");
  const rows = await prisma.propertyLocation.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { properties: { where: { deletedAt: null } } } } } });
  const write = can(user.role, "property:write"), del = can(user.role, "property:delete");
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl">Locations</h1>{write && <Link href="/admin/locations/new" className="btn-primary">Add location</Link>}</div>
      <p className="mt-3 max-w-xl text-sm text-mist">Each location has its own public page. A description and cover photo make it more useful to visitors and to search engines.</p>
      {rows.length === 0 ? <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No locations yet</p></div> : (
        <div className="mt-10 overflow-x-auto"><table className="w-full min-w-[560px] border-y border-basalt/15 text-left text-sm">
          <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">Location</th><th className="py-3 pr-4 font-normal">Properties</th><th className="py-3 pr-4 font-normal">Page</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-basalt/10">{rows.map((l) => (
            <tr key={l.id}>
              <td className="py-4 pr-4"><p className="font-medium">{l.name}</p><p className="text-xs text-mist">{[l.city, l.province].filter(Boolean).join(", ")}</p></td>
              <td className="py-4 pr-4 tabular-nums">{l._count.properties}</td>
              <td className="py-4 pr-4 text-mist">{l.description ? "Has description" : "No description"}{l.coverId ? "" : " · No photo"}</td>
              <td className="py-4 text-right">{write && <span className="flex justify-end gap-5"><Link href={`/admin/locations/${l.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link>
                {del && l._count.properties === 0 && <form action={deleteLocation.bind(null, l.id)}><button className="underline underline-offset-4 hover:text-brass">Delete</button></form>}</span>}</td>
            </tr>))}</tbody></table></div>)}
    </>
  );
}
