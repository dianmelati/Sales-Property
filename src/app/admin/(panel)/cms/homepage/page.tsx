import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SECTION_TYPES, type SectionType } from "@/lib/cms/types";
import { addSection, createDefaultHome, deleteSection, moveSection, toggleSection } from "@/server/cms/actions";

export const metadata = { title: "Homepage" };
export const dynamic = "force-dynamic";

export default async function HomepageCms() {
  await requirePermission("cms:write");
  const page = await prisma.page.findUnique({ where: { key: "home" }, include: { sections: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } } });
  const sections = page?.sections ?? [];
  const label = (c: unknown) => { const o = (c ?? {}) as Record<string, unknown>; return String(o.headline ?? o.title ?? ""); };
  const btn = "underline underline-offset-4 hover:text-brass disabled:no-underline disabled:opacity-30";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Homepage</h1>
        <Link href="/" target="_blank" className="text-sm underline underline-offset-4 hover:text-brass">View live homepage</Link>
      </div>
      <p className="mt-3 max-w-xl text-sm text-mist">Sections appear on the homepage in this order. Hidden sections stay saved but are not shown to visitors. Changes go live immediately.</p>

      {sections.length === 0 ? (
        <div className="mt-10 border-y border-basalt/15 py-14">
          <p className="font-serif text-2xl">The homepage uses the built-in layout</p>
          <p className="mt-2 max-w-md text-sm text-mist">Create the default layout to start editing each section, change their order and hide the ones you do not need.</p>
          <form action={createDefaultHome}><button className="btn-primary mt-6">Create default layout</button></form>
        </div>
      ) : (
        <ol className="mt-10 divide-y divide-basalt/15 border-y border-basalt/15">
          {sections.map((s, i) => (
            <li key={s.id} className={`flex flex-wrap items-center gap-x-6 gap-y-2 py-4 ${s.isVisible ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-mist">{SECTION_TYPES[s.type as SectionType] ?? s.type}{!s.isVisible && " · Hidden"}</p>
                <p className="truncate font-medium">{label(s.content) || "Untitled"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <Link href={`/admin/cms/homepage/${s.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link>
                <form action={moveSection.bind(null, s.id, "up")}><button disabled={i === 0} className={btn}>Up</button></form>
                <form action={moveSection.bind(null, s.id, "down")}><button disabled={i === sections.length - 1} className={btn}>Down</button></form>
                <form action={toggleSection.bind(null, s.id)}><button className={btn}>{s.isVisible ? "Hide" : "Show"}</button></form>
                <form action={deleteSection.bind(null, s.id)}><button className={btn}>Delete</button></form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form action={addSection} className="mt-12 flex flex-wrap items-end gap-4">
        <label className="text-xs text-mist">Add a section
          <select name="type" className="field mt-1 min-w-56 text-sm text-basalt">
            {Object.entries(SECTION_TYPES).filter(([k]) => k !== "hero" || !sections.some((s) => s.type === "hero")).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button className="btn-ghost !py-2.5">Add section</button>
      </form>
    </>
  );
}
