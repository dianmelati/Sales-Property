import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requirePermission("cms:write");
  const pages = [["about", "About", "Headline, story and photo."], ["contact", "Contact", "Headline and introduction. Phone, email, address and hours come from Settings."]];
  return (
    <>
      <h1 className="text-4xl">Pages</h1>
      <p className="mt-3 max-w-xl text-sm text-mist">The homepage has its own editor under Homepage.</p>
      <ul className="mt-10 divide-y divide-basalt/15 border-y border-basalt/15">
        {pages.map(([k, l, d]) => (
          <li key={k} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><p className="font-medium">{l}</p><p className="text-sm text-mist">{d}</p></div>
            <Link href={`/admin/pages/${k}`} className="underline underline-offset-4 hover:text-brass">Edit</Link></li>
        ))}
      </ul>
    </>
  );
}
