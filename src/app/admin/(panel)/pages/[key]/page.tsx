import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { getAbout, getContactContent } from "@/server/cms/pages";
import { PageForm } from "./page-form";

export const metadata = { title: "Edit page" };
export const dynamic = "force-dynamic";

export default async function PageEdit({ params }: { params: Promise<{ key: string }> }) {
  await requirePermission("cms:write");
  const { key } = await params;
  if (key !== "about" && key !== "contact") notFound();
  if (key === "about") {
    const a = await getAbout();
    const m = a.imageId ? await prisma.media.findFirst({ where: { id: a.imageId, deletedAt: null }, select: { id: true, variants: true } }) : null;
    return (<><h1 className="mb-10 text-4xl">About page</h1><PageForm pageKey="about" d={{ headline: a.headline, body: a.body }} image={m ? { id: m.id, url: variantUrls(m.variants).small } : null} /></>);
  }
  const c = await getContactContent();
  return (<><h1 className="mb-10 text-4xl">Contact page</h1><PageForm pageKey="contact" d={{ headline: c.headline, intro: c.intro }} image={null} /></>);
}
