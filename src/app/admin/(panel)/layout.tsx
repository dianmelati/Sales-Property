import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { can, type PermissionKey } from "@/lib/auth/permissions";
import { logoutAction } from "../login/actions";

const items: { href: string; label: string; perm: PermissionKey }[] = [
  { href: "/admin", label: "Dashboard", perm: "dashboard:read" },
  { href: "/admin/properties", label: "Properties", perm: "property:read" },
  { href: "/admin/leads", label: "Leads", perm: "lead:read" },
  { href: "/admin/agents", label: "Agents", perm: "agent:read" },
  { href: "/admin/media", label: "Media library", perm: "media:read" },
  { href: "/admin/floor-plans", label: "Floor plans", perm: "property:read" },
  { href: "/admin/models", label: "3D models", perm: "property:read" },
  { href: "/admin/locations", label: "Locations", perm: "property:read" },
  { href: "/admin/cms/homepage", label: "Homepage", perm: "cms:write" },
  { href: "/admin/pages", label: "Pages", perm: "cms:write" },
  { href: "/admin/cms/testimonials", label: "Testimonials", perm: "cms:write" },
  { href: "/admin/cms/faqs", label: "FAQs", perm: "cms:write" },
  { href: "/admin/seo", label: "SEO", perm: "seo:write" },
  { href: "/admin/settings", label: "Settings", perm: "settings:write" },
  { href: "/admin/audit", label: "Audit logs", perm: "audit:read" },
  { href: "/admin/users", label: "Users", perm: "user:manage" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const visible = items.filter((i) => can(user.role, i.perm));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-basalt/15 bg-stone lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-8">
          <Link href="/admin" className="font-serif text-2xl tracking-display">Estate</Link>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
          {visible.map((i) => (
            <Link key={i.href} href={i.href} className="whitespace-nowrap px-3 py-2 text-sm hover:bg-paper">
              {i.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="hidden px-5 py-8 lg:block">
          <p className="text-sm"><Link href="/admin/account" className="underline underline-offset-4 hover:text-brass">{user.name}</Link></p>
          <p className="mb-3 text-xs text-mist">{user.role.replace("_", " ").toLowerCase()}</p>
          <button className="text-sm underline underline-offset-4 hover:text-brass">Sign out</button>
        </form>
      </aside>
      <div className="min-w-0 px-5 py-8 lg:px-12 lg:py-12">
        <form action={logoutAction} className="mb-6 text-right lg:hidden">
          <Link href="/admin/account" className="mr-5 text-sm underline underline-offset-4">Account</Link>
          <button className="text-sm underline underline-offset-4">Sign out</button>
        </form>
        {children}
      </div>
    </div>
  );
}
