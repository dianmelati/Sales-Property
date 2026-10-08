import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { LocationForm } from "./location-form";

export const metadata = { title: "Location" };

export default async function LocationEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("property:write");
  const { id } = await params;
  const l = id === "new" ? null : await prisma.propertyLocation.findUnique({ where: { id }, include: { cover: { select: { id: true, variants: true } } } });
  if (id !== "new" && !l) notFound();
  return (
    <>
      <h1 className="mb-10 text-4xl">{l ? "Edit location" : "Add location"}</h1>
      <LocationForm id={l?.id ?? null} cover={l?.cover ? { id: l.cover.id, url: variantUrls(l.cover.variants).small } : null}
        d={l ? { name: l.name, slug: l.slug, city: l.city, province: l.province, description: l.description, latitude: l.latitude?.toString(), longitude: l.longitude?.toString() } : {}} />
    </>
  );
}
