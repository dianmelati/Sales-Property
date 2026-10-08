import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsApp } from "@/lib/whatsapp";

export interface NavItem { label: string; href: string }
export interface SiteSettings {
  nav: NavItem[];
  whatsappRaw: string;
  whatsapp: string | null; // sudah dinormalisasi (62...) atau null bila belum diisi
  contact: { email: string; phone: string; address: string; hours: string };
  social: { instagram: string; facebook: string; youtube: string; tiktok: string };
  footerText: string;
}

export const DEFAULT_NAV: NavItem[] = [
  { label: "Properties", href: "/properties" }, { label: "Locations", href: "/locations" }, { label: "Agents", href: "/agents" },
  { label: "About", href: "/about" }, { label: "Contact", href: "/contact" },
];
export const SETTING_KEYS = ["whatsapp.number", "contact", "social", "footer.text", "nav.main"] as const;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const c = obj(m.get("contact")), s = obj(m.get("social"));
  const navRaw = m.get("nav.main");
  const nav = Array.isArray(navRaw)
    ? navRaw.map((n) => ({ label: str(obj(n).label), href: str(obj(n).href) })).filter((n) => n.label && n.href)
    : [];
  const raw = str(m.get("whatsapp.number"));
  return {
    nav: nav.length ? nav : DEFAULT_NAV,
    whatsappRaw: raw, whatsapp: raw ? normalizeWhatsApp(raw) : null,
    contact: { email: str(c.email), phone: str(c.phone), address: str(c.address), hours: str(c.hours) },
    social: { instagram: str(s.instagram), facebook: str(s.facebook), youtube: str(s.youtube), tiktok: str(s.tiktok) },
    footerText: str(m.get("footer.text")),
  };
});
