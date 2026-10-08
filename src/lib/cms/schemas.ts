import "server-only";
import { z } from "zod";
import { isSafeHref } from "./links";
import type { SectionType } from "./types";

const text = (max: number, min = 0) => z.string().trim().min(min, "Required").max(max);
const optHref = z.string().trim().max(300).refine((v) => !v || isSafeHref(v), "Start with / or https://");
const reqHref = z.string().trim().min(1, "Required").max(300).refine(isSafeHref, "Start with / or https://");
const items = z.array(z.object({ title: text(120, 1), text: text(400).default(""), href: optHref.default("") })).max(12, "At most 12 items");

const schemas: Record<SectionType, z.ZodTypeAny> = {
  hero: z.object({ headline: text(120, 3), description: text(300), ctaLabel: text(40), ctaHref: optHref }),
  properties: z.object({ variant: z.enum(["featured", "premium", "latest"]), title: text(80, 2), linkLabel: text(40), linkHref: optHref, count: z.coerce.number().int().min(1).max(9) }),
  locations: z.object({ title: text(80, 2), intro: text(300), count: z.coerce.number().int().min(1).max(12) }),
  why_us: z.object({ title: text(100, 2), intro: text(300), items }),
  services: z.object({ title: text(100, 2), intro: text(300), items }),
  insights: z.object({ title: text(100, 2), intro: text(300), items }),
  agents: z.object({ title: text(80, 2), intro: text(300), count: z.coerce.number().int().min(1).max(12) }),
  testimonials: z.object({ title: text(100, 2) }),
  faq: z.object({ title: text(100, 2) }),
  cta: z.object({ title: text(120, 2), buttonLabel: text(40, 1), buttonHref: reqHref }),
};

export function parseContent(type: SectionType, fd: FormData): { ok: true; content: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const raw: Record<string, unknown> = Object.fromEntries(fd.entries());
  delete raw.imageId;
  if ("items" in raw) {
    try {
      const rows = JSON.parse(String(raw.items));
      raw.items = Array.isArray(rows) ? rows.filter((r) => r && (String(r.title ?? "").trim() || String(r.text ?? "").trim())) : [];
    } catch { raw.items = []; }
  }
  const r = schemas[type].safeParse(raw);
  if (r.success) return { ok: true, content: r.data as Record<string, unknown> };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) {
    const key = String(i.path[0]);
    errors[key] ??= key === "items" && typeof i.path[1] === "number" ? `Item ${i.path[1] + 1}: ${i.message}` : i.message;
  }
  return { ok: false, errors };
}
