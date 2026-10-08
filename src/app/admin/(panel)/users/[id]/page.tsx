import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { UserForm } from "./user-form";

export const metadata = { title: "User" };

export default async function UserEdit({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("user:manage");
  const { id } = await params;
  const u = id === "new" ? null : await prisma.user.findFirst({ where: { id, deletedAt: null }, include: { role: { select: { name: true } } } });
  if (id !== "new" && !u) notFound();
  return (
    <>
      <h1 className="mb-10 text-4xl">{u ? "Edit user" : "Add user"}</h1>
      <UserForm id={u?.id ?? null} isSelf={u?.id === me.id} d={u ? { name: u.name, email: u.email, role: u.role.name, isActive: u.isActive } : {}} />
    </>
  );
}
