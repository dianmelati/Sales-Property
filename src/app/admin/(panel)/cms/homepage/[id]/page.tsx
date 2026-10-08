import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { SECTION_TYPES, type SectionType } from "@/lib/cms/types";
import { SectionForm } from "./section-form";

export const metadata = { title: "Edit section" };

export default async function EditSection({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("cms:write");
  const { id } = await params;
  const sec = await prisma.pageSection.findUnique({ where: { id }, include: { image: { select: { id: true, variants: true } } } });
  if (!sec || !(sec.type in SECTION_TYPES)) notFound();
  return (
    <>
      <p className="text-sm text-mist">{SECTION_TYPES[sec.type as SectionType]}{!sec.isVisible && " · Hidden. Show it from the list to publish."}</p>
      <h1 className="mb-10 text-4xl">Edit section</h1>
      <SectionForm id={sec.id} type={sec.type as SectionType} content={(sec.content ?? {}) as Record<string, unknown>}
        image={sec.image ? { id: sec.image.id, url: variantUrls(sec.image.variants).medium } : null} />
    </>
  );
}
