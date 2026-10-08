import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getContactContent } from "@/server/cms/pages";
import { getSiteSettings } from "@/server/cms/settings";
import { buildMetadata, getPageSeo, organizationLd } from "@/server/seo/meta";
import { ContactForm } from "./contact-form";

// ISR: HTML di-cache dan disegarkan tiap 5 menit, atau langsung saat admin menyimpan (revalidatePublic).
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ seo: await getPageSeo("contact"), title: "Contact", description: "Talk to an agent about buying, selling or renting a property.", path: "/contact" });
}

export default async function ContactPage() {
  const [c, s] = await Promise.all([getContactContent(), getSiteSettings()]);
  const rows = [
    s.contact.phone && ["Phone", <a key="p" href={`tel:${s.contact.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4 hover:text-brass">{s.contact.phone}</a>],
    s.contact.email && ["Email", <a key="e" href={`mailto:${s.contact.email}`} className="underline underline-offset-4 hover:text-brass">{s.contact.email}</a>],
    s.contact.address && ["Office", s.contact.address],
    s.contact.hours && ["Hours", s.contact.hours],
  ].filter(Boolean) as [string, React.ReactNode][];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-12 lg:px-12 lg:py-20">
        <JsonLd data={await organizationLd()} />
        <h1 className="max-w-3xl text-5xl lg:text-7xl">{c.headline}</h1>
        <p className="mt-6 max-w-xl text-lg text-mist">{c.intro}</p>
        <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <div>
            {rows.length > 0 && (
              <dl className="divide-y divide-basalt/15 border-y border-basalt/15 text-sm">
                {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[90px_1fr] gap-4 py-4"><dt className="text-mist">{k}</dt><dd>{v}</dd></div>)}
              </dl>
            )}
            {s.whatsapp && <a href={buildWhatsAppUrl(s.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-8">Chat on WhatsApp</a>}
            {rows.length === 0 && !s.whatsapp && <p className="text-sm text-mist">Use the form and we will get back to you.</p>}
          </div>
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
