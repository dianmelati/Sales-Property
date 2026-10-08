import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { variantUrls } from "@/lib/media/urls";
import { AgentForm } from "./agent-form";

export const metadata = { title: "Agent" };

export default async function AgentEdit({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("agent:write");
  const { id } = await params;
  const a = id === "new" ? null : await prisma.agent.findFirst({ where: { id, deletedAt: null }, include: { photo: { select: { id: true, variants: true } } } });
  if (id !== "new" && !a) notFound();

  const accounts = can(user.role, "user:manage")
    ? (await prisma.user.findMany({
        where: { deletedAt: null, role: { name: "AGENT" }, OR: [{ agent: null }, ...(a ? [{ agent: { id: a.id } }] : [])] },
        orderBy: { name: "asc" }, select: { id: true, name: true, email: true },
      })).map((u) => ({ id: u.id, label: `${u.name} (${u.email})` }))
    : null;

  return (
    <>
      <h1 className="mb-10 text-4xl">{a ? "Edit agent" : "Add agent"}</h1>
      <AgentForm id={a?.id ?? null} accounts={accounts}
        d={a ? { name: a.name, slug: a.slug, title: a.title, bio: a.bio, phone: a.phone, email: a.email, userId: a.userId, isFeatured: a.isFeatured, isActive: a.isActive } : {}}
        photo={a?.photo ? { id: a.photo.id, url: variantUrls(a.photo.variants).small } : null} />
    </>
  );
}
