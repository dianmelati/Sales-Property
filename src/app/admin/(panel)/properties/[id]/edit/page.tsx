import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { getFormOptions } from "@/server/properties/queries";
import { PropertyForm } from "../../property-form";
import { DeleteButton } from "../../delete-button";
import { can } from "@/lib/auth/permissions";
import { variantUrls } from "@/lib/media/urls";
import { PropertyImages } from "../../property-images";
import { FloorPlansPanel } from "../../floor-plans-panel";
import { ModelsPanel } from "../../models-panel";
import type { CameraConfig, LightPreset } from "@/components/model-viewer/types";

export const metadata = { title: "Edit property" };

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requirePermission("property:write");
  const { id } = await params;
  const { created } = await searchParams;
  const p = await prisma.property.findFirst({
    where: { id, deletedAt: null },
    include: { features: { orderBy: { sortOrder: "asc" } }, seo: true, images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { media: true } }, floorPlans: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { media: true } }, models: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], include: { media: true } } },
  });
  if (!p) notFound();
  const options = await getFormOptions();
  const defaults = {
    title: p.title, slug: p.slug, categoryId: p.categoryId, locationId: p.locationId, agentId: p.agentId,
    transaction: p.transaction, price: p.price.toString(), currency: p.currency, address: p.address,
    latitude: p.latitude?.toString(), longitude: p.longitude?.toString(),
    landArea: p.landArea, buildingArea: p.buildingArea, bedrooms: p.bedrooms, bathrooms: p.bathrooms, floors: p.floors, parking: p.parking,
    certificate: p.certificate, furnished: p.furnished, hasPool: p.hasPool, hasGarage: p.hasGarage, hasGarden: p.hasGarden,
    isFeatured: p.isFeatured, isPremium: p.isPremium, description: p.description, status: p.status,
    features: p.features.map((f) => f.label).join("\n"),
    seoTitle: p.seo?.title, seoDescription: p.seo?.description, seoKeywords: p.seo?.keywords,
  };
  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mist">{p.code}</p>
          <h1 className="text-4xl">{p.title}</h1>
        </div>
        {can(user.role, "property:delete") && <DeleteButton id={p.id} title={p.title} />}
      </div>
      <PropertyForm id={p.id} defaults={defaults} options={options} created={created === "1"} />
      <PropertyImages
        propertyId={p.id}
        images={p.images.map((i) => ({ id: i.id, url: variantUrls(i.media.variants).small, alt: i.media.alt, name: i.media.name, isCover: i.isCover }))}
      />
      <FloorPlansPanel
        propertyId={p.id}
        plans={p.floorPlans.map((f) => {
          const pdf = f.media.mimeType === "application/pdf";
          const u = variantUrls(f.media.variants);
          return { id: f.id, label: f.label, kind: pdf ? "pdf" : "image", thumb: pdf ? null : u.small, fileUrl: pdf ? u.file : null, name: f.media.name };
        })}
      />
      <ModelsPanel
        propertyId={p.id}
        models={p.models.map((m) => ({
          id: m.id, label: m.label, url: variantUrls(m.media.variants).file, name: m.media.name, sizeBytes: m.media.sizeBytes,
          lightPreset: (["studio", "daylight", "sunset"].includes(m.lightPreset) ? m.lightPreset : "studio") as LightPreset,
          camera: m.cameraConfig && typeof m.cameraConfig === "object" ? (m.cameraConfig as unknown as CameraConfig) : null, isDefault: m.isDefault,
        }))}
      />
    </>
  );
}
