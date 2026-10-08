export const SECTION_TYPES = {
  hero: "Hero",
  properties: "Property showcase",
  locations: "Popular locations",
  why_us: "Why choose us",
  services: "Services",
  agents: "Featured agents",
  testimonials: "Testimonials",
  faq: "FAQ",
  insights: "Market insights",
  cta: "Call to action",
} as const;
export type SectionType = keyof typeof SECTION_TYPES;

export interface Item { title: string; text?: string; href?: string }
export interface HeroContent { headline: string; description: string; ctaLabel: string; ctaHref: string }
export interface PropertiesContent { variant: "featured" | "premium" | "latest"; title: string; linkLabel: string; linkHref: string; count: number }
export interface LocationsContent { title: string; intro: string; count: number }
export interface ItemsContent { title: string; intro: string; items: Item[] }
export interface TitleContent { title: string }
export interface CtaContent { title: string; buttonLabel: string; buttonHref: string }
