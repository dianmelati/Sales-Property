import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PRESET_LABEL, type LightPreset } from "@/components/model-viewer/types";

export const metadata = { title: "3D models" };
export const dynamic = "force-dynamic";

export default async function ModelsOverview() {
  await requirePermission("property:read");
  const models = await prisma.threeDModel.findMany({
    where: { property: { deletedAt: null } }, orderBy: [{ property: { title: "asc" } }, { createdAt: "asc" }],
    include: { property: { select: { id: true, title: true, code: true } }, media: { select: { sizeBytes: true } } }, take: 500,
  });
  const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
  return (
    <>
      <h1 className="text-4xl">3D models</h1>
      <p className="mt-3 max-w-xl text-sm text-mist">Models are added from each property&apos;s edit page, under 3D models.</p>
      {models.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No 3D models yet</p><p className="mt-2 text-sm text-mist">Open a property and upload a .glb exported from Blender.</p><Link href="/admin/properties" className="btn-primary mt-6">Go to properties</Link></div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-y border-basalt/15 text-left text-sm">
            <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">Model</th><th className="py-3 pr-4 font-normal">Property</th><th className="py-3 pr-4 font-normal">Lighting</th><th className="py-3 pr-4 font-normal">Size</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-basalt/10">
              {models.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-4">{m.label}{m.isDefault && <span className="ml-2 text-xs text-mist">Shown first</span>}</td>
                  <td className="py-3 pr-4">{m.property.title}<p className="text-xs text-mist">{m.property.code}</p></td>
                  <td className="py-3 pr-4 text-mist">{PRESET_LABEL[(m.lightPreset as LightPreset)] ?? m.lightPreset}</td>
                  <td className="py-3 pr-4 text-mist">{mb(m.media.sizeBytes)}</td>
                  <td className="py-3 text-right"><Link href={`/admin/properties/${m.property.id}/edit`} className="underline underline-offset-4 hover:text-brass">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
