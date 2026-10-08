import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";
const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super admin", ADMIN: "Admin", EDITOR: "Editor", AGENT: "Agent" };

export default async function UsersPage() {
  const me = await requirePermission("user:manage");
  const users = await prisma.user.findMany({ where: { deletedAt: null }, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { role: { select: { name: true } }, agent: { select: { name: true } } } });
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Users</h1>
        <Link href="/admin/users/new" className="btn-primary">Add user</Link>
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[640px] border-y border-basalt/15 text-left text-sm">
          <thead className="text-xs text-mist"><tr className="border-b border-basalt/15"><th className="py-3 pr-4 font-normal">User</th><th className="py-3 pr-4 font-normal">Role</th><th className="py-3 pr-4 font-normal">Agent profile</th><th className="py-3 pr-4 font-normal">Status</th><th className="py-3 font-normal"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-basalt/10">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? "" : "opacity-60"}>
                <td className="py-4 pr-4"><p className="font-medium">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-mist">You</span>}</p><p className="text-xs text-mist">{u.email}</p></td>
                <td className="py-4 pr-4">{ROLE_LABEL[u.role.name]}</td>
                <td className="py-4 pr-4">{u.agent?.name ?? <span className="text-mist">None</span>}</td>
                <td className="py-4 pr-4">{u.isActive ? "Active" : "Deactivated"}</td>
                <td className="py-4 text-right"><Link href={`/admin/users/${u.id}`} className="underline underline-offset-4 hover:text-brass">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 max-w-xl text-xs text-mist">Users are deactivated rather than deleted so the audit log keeps their name. Deactivated users are signed out immediately.</p>
    </>
  );
}
