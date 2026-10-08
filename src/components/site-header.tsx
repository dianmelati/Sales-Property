import Link from "next/link";
import { safeHref } from "@/lib/cms/links";
import { NavCounts } from "./nav-counts";
import { getSiteSettings } from "@/server/cms/settings";

export async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const { nav } = await getSiteSettings();
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-10" : "border-b border-basalt/15"}>
      <div className="mx-auto flex max-w-page items-center justify-between px-6 py-6 lg:px-12">
        <Link href="/" className="font-serif text-2xl tracking-display">Estate</Link>
        <nav aria-label="Main" className="hidden gap-9 text-sm md:flex">
          {nav.map((n) => <Link key={n.href + n.label} href={safeHref(n.href)} className="transition-colors hover:text-brass">{n.label}</Link>)}
        </nav>
        <NavCounts />
      </div>
      <nav aria-label="Main mobile" className="flex gap-6 overflow-x-auto px-6 pb-4 text-sm md:hidden">
        {nav.map((n) => <Link key={n.href + n.label} href={safeHref(n.href)} className="whitespace-nowrap">{n.label}</Link>)}
      </nav>
    </header>
  );
}

export async function SiteFooter() {
  const { nav, contact, social, footerText } = await getSiteSettings();
  const socials = (Object.entries(social) as [string, string][]).filter(([, url]) => url.startsWith("https://"));
  return (
    <footer className="bg-basalt text-paper/70">
      <div className="mx-auto grid max-w-page gap-10 border-t border-paper/15 px-6 py-12 text-sm lg:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
        <div>
          <p className="font-serif text-2xl text-paper">Estate</p>
          {footerText && <p className="mt-3 max-w-sm">{footerText}</p>}
          <p className="mt-6">© {new Date().getFullYear()} Estate. All rights reserved.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          {nav.map((n) => <Link key={n.href + n.label} href={safeHref(n.href)} className="hover:text-paper">{n.label}</Link>)}
        </nav>
        <div className="space-y-2">
          {contact.phone && <p><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-paper">{contact.phone}</a></p>}
          {contact.email && <p><a href={`mailto:${contact.email}`} className="hover:text-paper">{contact.email}</a></p>}
          {contact.address && <p>{contact.address}</p>}
          {contact.hours && <p>{contact.hours}</p>}
          {socials.length > 0 && (
            <p className="flex flex-wrap gap-x-5 gap-y-1 pt-2">
              {socials.map(([k, url]) => <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-paper">{k}</a>)}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
