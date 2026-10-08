import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { deleteFaq, moveFaq, toggleFaq } from "@/server/cms/actions";

export const metadata = { title: "FAQs" };
export const dynamic = "force-dynamic";

export default async function FaqsPage() {
  await requirePermission("cms:write");
  const rows = await prisma.fAQ.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const btn = "underline underline-offset-4 hover:text-brass disabled:no-underline disabled:opacity-30";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">FAQs</h1>
        <Link href="/admin/cms/faqs/new" className="btn-primary">Add question</Link>
      </div>
      {rows.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No questions yet</p><p className="mt-2 text-sm text-mist">The homepage FAQ section stays hidden until at least one question is visible.</p></div>
      ) : (
        <ol className="mt-10 divide-y divide-basalt/15 border-y border-basalt/15">
          {rows.map((f, i) => (
            <li key={f.id} className={`flex flex-wrap items-start gap-x-6 gap-y-2 py-5 ${f.isVisible ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1"><p className="font-medium">{f.question}</p><p className="mt-1 line-clamp-1 text-sm text-mist">{f.answer}{!f.isVisible && " · Hidden"}</p></div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <Link href={`/admin/cms/faqs/${f.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link>
                <form action={moveFaq.bind(null, f.id, "up")}><button disabled={i === 0} className={btn}>Up</button></form>
                <form action={moveFaq.bind(null, f.id, "down")}><button disabled={i === rows.length - 1} className={btn}>Down</button></form>
                <form action={toggleFaq.bind(null, f.id)}><button className={btn}>{f.isVisible ? "Hide" : "Show"}</button></form>
                <form action={deleteFaq.bind(null, f.id)}><button className={btn}>Delete</button></form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
