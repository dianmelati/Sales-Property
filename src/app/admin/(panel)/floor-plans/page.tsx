import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";

export const metadata = { title: "Floor plans" };
export const dynamic = "force-dynamic";

export default async function FloorPlansOverview() {
  await requirePermission("property:read");
  const plans = await prisma.floorPlan.findMany({
    where: { property: { deletedAt: null } }, orderBy: [{ property: { title: "asc" } }, { sortOrder: "asc" }],
    include: { property: { select: { id: true, title: true, code: true } }, media: { select: { variants: true, mimeType: true, sizeBytes: true } } },
    take: 500,
  });
  const noPlans = await prisma.property.count({ where: { deletedAt: null, floorPlans: { none: {} } } });
  const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
  return (
    <>
      <h1 className="text-4xl">Floor plans</h1>
      <p className="mt-3 max-w-xl text-sm text-mist">Plans are added from each property&apos;s edit page. {noPlans > 0 && `${noPlans} ${noPlans === 1 ? "property has" : "properties have"} no floor plan yet.`}</p>
      {plans.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No floor plans yet</p><p className="mt-2 text-sm text-mist">Open a property and add its plans under Floor plans.</p><Link href="/admin/properties" className="btn-primary mt-6">Go to properties</Link></div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">Plan</th><th className="py-3 pr-4 font-normal">Property</th><th className="py-3 pr-4 font-normal">Type</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {plans.map((p) => {
                const pdf = p.media.mimeType === "application/pdf"; const u = variantUrls(p.media.variants);
                return (
                  <tr key={p.id}>
                    <td className="py-3 pr-4"><div className="flex items-center gap-4"><div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden bg-stone text-xs text-mist">{pdf ? "PDF" : /* eslint-disable-next-line @next/next/no-img-element */ <img src={u.thumbnail} alt="" className="h-full w-full object-contain" />}</div><span>{p.label}</span></div></td>
                    <td className="py-3 pr-4">{p.property.title}<p className="text-xs text-mist">{p.property.code}</p></td>
                    <td className="py-3 pr-4 text-mist">{pdf ? "PDF" : p.media.mimeType === "image/svg+xml" ? "SVG" : "Image"} · {kb(p.media.sizeBytes)}</td>
                    <td className="py-3 text-right"><Link href={`/admin/properties/${p.property.id}/edit`} className="underline underline-offset-4 hover:text-brass">Manage</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
