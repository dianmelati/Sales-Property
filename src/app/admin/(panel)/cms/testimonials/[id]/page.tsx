import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { saveTestimonial } from "@/server/cms/actions";
import { EntryForm } from "../../entry-form";

export const metadata = { title: "Testimonial" };

export default async function TestimonialEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("cms:write");
  const { id } = await params;
  const t = id === "new" ? null : await prisma.testimonial.findUnique({ where: { id } });
  if (id !== "new" && !t) notFound();
  return (
    <>
      <h1 className="mb-10 text-4xl">{t ? "Edit testimonial" : "Add testimonial"}</h1>
      <EntryForm action={saveTestimonial.bind(null, t?.id ?? null)} backHref="/admin/cms/testimonials" submitLabel="Save testimonial" visible={t?.isVisible ?? true}
        fields={[
          { name: "author", label: "Client name", value: t?.author ?? "" },
          { name: "role", label: "Role or location (optional)", value: t?.role ?? "" },
          { name: "quote", label: "Quote", area: true, value: t?.quote ?? "", hint: "Use only quotes you have permission to publish." },
        ]} />
    </>
  );
}
