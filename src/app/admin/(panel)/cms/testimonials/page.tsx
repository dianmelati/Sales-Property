import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { deleteTestimonial, moveTestimonial, toggleTestimonial } from "@/server/cms/actions";

export const metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  await requirePermission("cms:write");
  const rows = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const btn = "underline underline-offset-4 hover:text-brass disabled:no-underline disabled:opacity-30";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Testimonials</h1>
        <Link href="/admin/cms/testimonials/new" className="btn-primary">Add testimonial</Link>
      </div>
      {rows.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14"><p className="font-serif text-2xl">No testimonials yet</p><p className="mt-2 text-sm text-mist">Add real client quotes. The homepage section stays hidden until at least one is visible.</p></div>
      ) : (
        <ol className="mt-10 divide-y divide-basalt/15 border-y border-basalt/15">
          {rows.map((t, i) => (
            <li key={t.id} className={`flex flex-wrap items-start gap-x-6 gap-y-2 py-5 ${t.isVisible ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1"><p className="line-clamp-2">“{t.quote}”</p><p className="mt-1 text-xs text-mist">{t.author}{t.role && `, ${t.role}`}{!t.isVisible && " · Hidden"}</p></div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <Link href={`/admin/cms/testimonials/${t.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link>
                <form action={moveTestimonial.bind(null, t.id, "up")}><button disabled={i === 0} className={btn}>Up</button></form>
                <form action={moveTestimonial.bind(null, t.id, "down")}><button disabled={i === rows.length - 1} className={btn}>Down</button></form>
                <form action={toggleTestimonial.bind(null, t.id)}><button className={btn}>{t.isVisible ? "Hide" : "Show"}</button></form>
                <form action={deleteTestimonial.bind(null, t.id)}><button className={btn}>Delete</button></form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
