import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { saveFaq } from "@/server/cms/actions";
import { EntryForm } from "../../entry-form";

export const metadata = { title: "FAQ" };

export default async function FaqEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("cms:write");
  const { id } = await params;
  const f = id === "new" ? null : await prisma.fAQ.findUnique({ where: { id } });
  if (id !== "new" && !f) notFound();
  return (
    <>
      <h1 className="mb-10 text-4xl">{f ? "Edit question" : "Add question"}</h1>
      <EntryForm action={saveFaq.bind(null, f?.id ?? null)} backHref="/admin/cms/faqs" submitLabel="Save question" visible={f?.isVisible ?? true}
        fields={[
          { name: "question", label: "Question", value: f?.question ?? "" },
          { name: "answer", label: "Answer", area: true, value: f?.answer ?? "" },
        ]} />
    </>
  );
}
