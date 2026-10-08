"use server";

import { revalidatePublic } from "@/server/revalidate";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import { isSafeHref } from "@/lib/cms/links";
import { parseContent } from "@/lib/cms/schemas";
import { SECTION_TYPES, type SectionType } from "@/lib/cms/types";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { audit } from "@/server/audit";

export interface CmsState { message?: string; errors?: Record<string, string>; saved?: boolean }
const done = () => { revalidatePath("/"); revalidatePath("/admin/cms/homepage"); revalidatePublic(); };

async function homePage() {
  return prisma.page.upsert({ where: { key: "home" }, update: {}, create: { key: "home", title: "Home" } });
}
async function normalizeOrder(pageId: string) {
  const list = await prisma.pageSection.findMany({ where: { pageId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  await prisma.$transaction(list.map((s, i) => prisma.pageSection.update({ where: { id: s.id }, data: { sortOrder: i } })));
}

// ───────── Seksi beranda ─────────
export async function createDefaultHome() {
  const user = await requirePermission("cms:write");
  const page = await homePage();
  if ((await prisma.pageSection.count({ where: { pageId: page.id } })) === 0) {
    await prisma.pageSection.createMany({ data: DEFAULT_HOME.map((d, i) => ({ pageId: page.id, type: d.type, content: d.content as Prisma.InputJsonValue, sortOrder: i })) });
    await audit({ userId: user.id, action: "cms.home_defaults", entity: "Page", entityId: page.id });
  }
  done();
}

export async function addSection(formData: FormData) {
  const user = await requirePermission("cms:write");
  const type = String(formData.get("type")) as SectionType;
  if (!(type in SECTION_TYPES)) return;
  const page = await homePage();
  if (type === "hero" && (await prisma.pageSection.count({ where: { pageId: page.id, type: "hero" } })) > 0) return;
  const seed = DEFAULT_HOME.find((d) => d.type === type)?.content ?? { title: SECTION_TYPES[type] };
  const last = await prisma.pageSection.findFirst({ where: { pageId: page.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const s = await prisma.pageSection.create({ data: { pageId: page.id, type, content: seed as Prisma.InputJsonValue, sortOrder: (last?.sortOrder ?? -1) + 1, isVisible: false } });
  await audit({ userId: user.id, action: "cms.section_add", entity: "PageSection", entityId: s.id, diff: { type } });
  done();
  redirect(`/admin/cms/homepage/${s.id}`);
}

export async function saveSection(id: string, _: CmsState, formData: FormData): Promise<CmsState> {
  const user = await requirePermission("cms:write");
  const s = await prisma.pageSection.findUnique({ where: { id } });
  if (!s) return { message: "This section no longer exists." };
  const parsed = parseContent(s.type as SectionType, formData);
  if (!parsed.ok) return { message: "Some fields need attention.", errors: parsed.errors };

  let imageId = s.imageId;
  if (s.type === "hero") {
    imageId = String(formData.get("imageId") ?? "") || null;
    if (imageId && !(await prisma.media.findFirst({ where: { id: imageId, kind: "IMAGE", deletedAt: null }, select: { id: true } }))) {
      return { message: "The chosen image is no longer in the library.", errors: { imageId: "Choose another image" } };
    }
  }
  await prisma.pageSection.update({ where: { id }, data: { content: parsed.content as Prisma.InputJsonValue, imageId } });
  await audit({ userId: user.id, action: "cms.section_update", entity: "PageSection", entityId: id, diff: { type: s.type } });
  done();
  return { saved: true, message: s.isVisible ? "Saved and live." : "Saved. This section is hidden; show it from the list to publish it." };
}

export async function moveSection(id: string, dir: "up" | "down") {
  await requirePermission("cms:write");
  const s = await prisma.pageSection.findUnique({ where: { id }, select: { pageId: true } });
  if (!s) return;
  const list = await prisma.pageSection.findMany({ where: { pageId: s.pageId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((x) => x.id === id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((x, k) => prisma.pageSection.update({ where: { id: x.id }, data: { sortOrder: k } })));
  done();
}

export async function toggleSection(id: string) {
  const user = await requirePermission("cms:write");
  const s = await prisma.pageSection.findUnique({ where: { id }, select: { isVisible: true } });
  if (!s) return;
  await prisma.pageSection.update({ where: { id }, data: { isVisible: !s.isVisible } });
  await audit({ userId: user.id, action: s.isVisible ? "cms.section_hide" : "cms.section_show", entity: "PageSection", entityId: id });
  done();
}

export async function deleteSection(id: string) {
  const user = await requirePermission("cms:write");
  const s = await prisma.pageSection.findUnique({ where: { id }, select: { pageId: true, type: true } });
  if (!s) return;
  await prisma.pageSection.delete({ where: { id } });
  await normalizeOrder(s.pageId);
  await audit({ userId: user.id, action: "cms.section_delete", entity: "PageSection", entityId: id, diff: { type: s.type } });
  done();
}

// ───────── Testimoni ─────────
const testimonialSchema = z.object({
  author: z.string().trim().min(2, "Enter a name").max(100),
  role: z.string().trim().max(100).optional(),
  quote: z.string().trim().min(10, "Write at least 10 characters").max(600),
  isVisible: z.preprocess((v) => v === "on", z.boolean()),
});

function issues(e: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const i of e.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

export async function saveTestimonial(id: string | null, _: CmsState, fd: FormData): Promise<CmsState> {
  const user = await requirePermission("cms:write");
  const p = testimonialSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { message: "Some fields need attention.", errors: issues(p.error) };
  const data = { ...p.data, role: p.data.role || null };
  if (id) {
    if (!(await prisma.testimonial.findUnique({ where: { id }, select: { id: true } }))) return { message: "This testimonial no longer exists." };
    await prisma.testimonial.update({ where: { id }, data });
  } else {
    const last = await prisma.testimonial.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    await prisma.testimonial.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }
  await audit({ userId: user.id, action: id ? "cms.testimonial_update" : "cms.testimonial_create", entity: "Testimonial", entityId: id });
  done();
  redirect("/admin/cms/testimonials");
}

export async function deleteTestimonial(id: string) {
  const user = await requirePermission("cms:write");
  await prisma.testimonial.deleteMany({ where: { id } });
  await audit({ userId: user.id, action: "cms.testimonial_delete", entity: "Testimonial", entityId: id });
  done(); revalidatePath("/admin/cms/testimonials");
}
export async function toggleTestimonial(id: string) {
  await requirePermission("cms:write");
  const t = await prisma.testimonial.findUnique({ where: { id }, select: { isVisible: true } });
  if (t) await prisma.testimonial.update({ where: { id }, data: { isVisible: !t.isVisible } });
  done(); revalidatePath("/admin/cms/testimonials");
}
export async function moveTestimonial(id: string, dir: "up" | "down") {
  await requirePermission("cms:write");
  const list = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((x) => x.id === id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((x, k) => prisma.testimonial.update({ where: { id: x.id }, data: { sortOrder: k } })));
  done(); revalidatePath("/admin/cms/testimonials");
}

// ───────── FAQ ─────────
const faqSchema = z.object({
  question: z.string().trim().min(5, "Write the question").max(200),
  answer: z.string().trim().min(5, "Write the answer").max(1500),
  isVisible: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveFaq(id: string | null, _: CmsState, fd: FormData): Promise<CmsState> {
  const user = await requirePermission("cms:write");
  const p = faqSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return { message: "Some fields need attention.", errors: issues(p.error) };
  if (id) {
    if (!(await prisma.fAQ.findUnique({ where: { id }, select: { id: true } }))) return { message: "This question no longer exists." };
    await prisma.fAQ.update({ where: { id }, data: p.data });
  } else {
    const last = await prisma.fAQ.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    await prisma.fAQ.create({ data: { ...p.data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }
  await audit({ userId: user.id, action: id ? "cms.faq_update" : "cms.faq_create", entity: "FAQ", entityId: id });
  done();
  redirect("/admin/cms/faqs");
}
export async function deleteFaq(id: string) {
  const user = await requirePermission("cms:write");
  await prisma.fAQ.deleteMany({ where: { id } });
  await audit({ userId: user.id, action: "cms.faq_delete", entity: "FAQ", entityId: id });
  done(); revalidatePath("/admin/cms/faqs");
}
export async function toggleFaq(id: string) {
  await requirePermission("cms:write");
  const f = await prisma.fAQ.findUnique({ where: { id }, select: { isVisible: true } });
  if (f) await prisma.fAQ.update({ where: { id }, data: { isVisible: !f.isVisible } });
  done(); revalidatePath("/admin/cms/faqs");
}
export async function moveFaq(id: string, dir: "up" | "down") {
  await requirePermission("cms:write");
  const list = await prisma.fAQ.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = list.findIndex((x) => x.id === id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((x, k) => prisma.fAQ.update({ where: { id: x.id }, data: { sortOrder: k } })));
  done(); revalidatePath("/admin/cms/faqs");
}

// ───────── Pengaturan situs ─────────
const optUrl = z.string().trim().max(300).refine((v) => !v || /^https:\/\//i.test(v), "Use a full link starting with https://");
const settingsSchema = z.object({
  whatsapp: z.string().trim().max(30).refine((v) => !v || (/^[+\d\s()-]+$/.test(v) && normalizeWhatsApp(v) !== null), "Enter a valid phone number, e.g. 0812 3456 7890"),
  email: z.string().trim().max(254).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
  hours: z.string().trim().max(200),
  instagram: optUrl, facebook: optUrl, youtube: optUrl, tiktok: optUrl,
  footerText: z.string().trim().max(300),
  nav: z.array(z.object({ label: z.string().trim().min(1, "Label required").max(30), href: z.string().trim().max(300).refine(isSafeHref, "Start with / or https://") })).max(8, "At most 8 menu items"),
});

export async function saveSettings(_: CmsState, fd: FormData): Promise<CmsState> {
  const user = await requirePermission("settings:write");
  const raw: Record<string, unknown> = Object.fromEntries(fd.entries());
  try { raw.nav = JSON.parse(String(raw.nav ?? "[]")).filter((r: { label?: string; href?: string }) => r && (r.label?.trim() || r.href?.trim())); } catch { raw.nav = []; }
  const p = settingsSchema.safeParse(raw);
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) { const k = String(i.path[0]); errors[k] ??= k === "nav" && typeof i.path[1] === "number" ? `Menu item ${i.path[1] + 1}: ${i.message}` : i.message; }
    return { message: "Some fields need attention.", errors };
  }
  const v = p.data;
  const entries: [string, Prisma.InputJsonValue][] = [
    ["whatsapp.number", v.whatsapp],
    ["contact", { email: v.email, phone: v.phone, address: v.address, hours: v.hours }],
    ["social", { instagram: v.instagram, facebook: v.facebook, youtube: v.youtube, tiktok: v.tiktok }],
    ["footer.text", v.footerText],
    ["nav.main", v.nav],
  ];
  await prisma.$transaction(entries.map(([key, value]) => prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })));
  await audit({ userId: user.id, action: "settings.update", entity: "SiteSetting", diff: { keys: entries.map(([k]) => k) } });
  revalidatePath("/", "layout");
  revalidatePublic();
  return { saved: true, message: "Settings saved." };
}
