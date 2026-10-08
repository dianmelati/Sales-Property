import type { SectionType } from "./types";

/**
 * Tata letak beranda bawaan. Dipakai oleh seed, tombol "Create default layout" di admin,
 * dan sebagai cadangan bila tabel Page "home" belum punya seksi.
 * Teks di bawah hanyalah contoh. Ganti dengan klaim dan data bisnis yang benar lewat Admin > Homepage.
 */
export const DEFAULT_HOME: { type: SectionType; content: Record<string, unknown> }[] = [
  { type: "hero", content: { headline: "Find a place worth calling home", description: "Discover exceptional properties in the most desirable locations.", ctaLabel: "", ctaHref: "" } },
  { type: "properties", content: { variant: "featured", title: "Featured properties", linkLabel: "View all featured", linkHref: "/properties?featured=1", count: 5 } },
  { type: "properties", content: { variant: "premium", title: "Premium properties", linkLabel: "View all", linkHref: "/properties", count: 3 } },
  { type: "properties", content: { variant: "latest", title: "Latest properties", linkLabel: "View all", linkHref: "/properties", count: 3 } },
  { type: "locations", content: { title: "Where we work", intro: "Browse properties by area.", count: 6 } },
  { type: "why_us", content: { title: "Why choose us", intro: "", items: [
    { title: "Carefully selected", text: "Describe how you choose and check the properties you list." },
    { title: "Seen in full", text: "Floor plans, video and 3D models help you understand a property before you visit." },
    { title: "One agent throughout", text: "Describe how your agents support clients from first viewing to handover." },
  ] } },
  { type: "services", content: { title: "Services", intro: "", items: [
    { title: "Buying", text: "Guidance from shortlist to signing." },
    { title: "Selling", text: "Professional presentation and marketing of your property." },
    { title: "Renting", text: "Long and short-term rentals, matched to your needs." },
  ] } },
  { type: "agents", content: { title: "Our agents", intro: "", count: 4 } },
  { type: "testimonials", content: { title: "What clients say" } },
  { type: "faq", content: { title: "Questions we hear often" } },
  { type: "cta", content: { title: "Tell us what you are looking for", buttonLabel: "Talk to an agent", buttonHref: "/contact" } },
];
