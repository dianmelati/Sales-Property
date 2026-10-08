"use server";

import { revalidatePublic } from "@/server/revalidate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { PAGE_KEYS, type PageKey } from "./meta";

export interface SeoState { message?: string; errors?: Record<string, string> }

const opt = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const schema = z.object({
  title: opt(70), description: opt(170), keywords: opt(250),
  canonical: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(300).refine((v) => /^(\/(?!\/)|https:\/\/)/.test(v), "Start with / or https://").optional()),
  ogImageId: opt(40),
  noIndex: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSeo(kind: "page" | "location", id: string, _: SeoState, fd: FormData): Promise<SeoState> {
  const user = await requirePermission("seo:write");
  const p = schema.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const v = p.data;
  if (v.ogImageId && !(await prisma.media.findFirst({ where: { id: v.ogImageId, kind: "IMAGE", deletedAt: null }, select: { id: true } }))) {
    return { message: "The chosen image is no longer in the library.", errors: { ogImageId: "Choose another image" } };
  }
  const data = { title: v.title ?? null, description: v.description ?? null, keywords: v.keywords ?? null, canonical: v.canonical ?? null, ogImageId: v.ogImageId ?? null, noIndex: v.noIndex };

  if (kind === "page") {
    if (!(id in PAGE_KEYS)) return { message: "Unknown page." };
    const page = await prisma.page.upsert({ where: { key: id }, update: {}, create: { key: id, title: PAGE_KEYS[id as PageKey] } });
    await prisma.seoMetadata.upsert({ where: { pageId: page.id }, update: data, create: { ...data, pageId: page.id } });
  } else {
    if (!(await prisma.propertyLocation.findUnique({ where: { id }, select: { id: true } }))) return { message: "This location no longer exists." };
    await prisma.seoMetadata.upsert({ where: { locationId: id }, update: data, create: { ...data, locationId: id } });
  }
  await audit({ userId: user.id, action: "seo.update", entity: kind === "page" ? "Page" : "PropertyLocation", entityId: id, diff: { noIndex: v.noIndex } });
  revalidatePath("/admin/seo");
  revalidatePublic();
  redirect("/admin/seo");
}
