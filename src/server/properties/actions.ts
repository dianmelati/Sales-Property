"use server";

import { revalidatePublic } from "@/server/revalidate";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { sanitizeDescription } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { audit } from "@/server/audit";
import { propertyInputSchema } from "./schema";

export interface PropertyFormState {
  message?: string;
  errors?: Record<string, string>;
  saved?: boolean;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "property";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await prisma.property.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!hit) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function nextCode(): Promise<string> {
  const last = await prisma.property.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? parseInt(last.code.replace(/\D/g, ""), 10) + 1 : 1;
  return `EST-${String(n).padStart(4, "0")}`;
}

export async function saveProperty(id: string | null, _: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  const user = await requirePermission("property:write");

  const raw = Object.fromEntries(formData.entries());
  const parsed = propertyInputSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { message: "Some fields need attention.", errors };
  }
  const v = parsed.data;
  const intent = formData.get("intent");

  // Mengubah status ke PUBLISHED butuh izin khusus.
  let status = v.status;
  if (intent === "publish") status = "PUBLISHED";
  const existing = id ? await prisma.property.findFirst({ where: { id, deletedAt: null } }) : null;
  if (id && !existing) return { message: "This property no longer exists." };
  if (status === "PUBLISHED" && existing?.status !== "PUBLISHED") await requirePermission("property:publish");

  const [category, location] = await Promise.all([
    prisma.propertyCategory.findUnique({ where: { id: v.categoryId }, select: { id: true } }),
    prisma.propertyLocation.findUnique({ where: { id: v.locationId }, select: { id: true } }),
  ]);
  if (!category || !location) return { message: "Property type or location is invalid.", errors: { categoryId: "Choose again" } };
  if (v.agentId && !(await prisma.agent.findFirst({ where: { id: v.agentId, deletedAt: null }, select: { id: true } }))) return { message: "The chosen agent no longer exists.", errors: { agentId: "Choose another agent" } };

  const slug = await uniqueSlug(v.slug || v.title, id ?? undefined);
  const features = v.featuresText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  const data = {
    title: v.title, slug,
    categoryId: v.categoryId, locationId: v.locationId, agentId: v.agentId ?? null,
    transaction: v.transaction, price: v.price, currency: v.currency,
    address: v.address ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null,
    landArea: v.landArea ?? null, buildingArea: v.buildingArea ?? null,
    bedrooms: v.bedrooms ?? null, bathrooms: v.bathrooms ?? null, floors: v.floors ?? null, parking: v.parking ?? null,
    certificate: v.certificate ?? null,
    furnished: v.furnished, hasPool: v.hasPool, hasGarage: v.hasGarage, hasGarden: v.hasGarden,
    isFeatured: v.isFeatured, isPremium: v.isPremium,
    description: sanitizeDescription(v.description),
    status,
    publishedAt: status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
  };
  const seo = { title: v.seoTitle ?? null, description: v.seoDescription ?? null, keywords: v.seoKeywords ?? null };

  const saved = await prisma.$transaction(async (tx) => {
    const p = id
      ? await tx.property.update({ where: { id }, data })
      : await tx.property.create({ data: { ...data, code: await nextCode() } });
    await tx.propertyFeature.deleteMany({ where: { propertyId: p.id } });
    if (features.length) await tx.propertyFeature.createMany({ data: features.map((label, i) => ({ propertyId: p.id, label, sortOrder: i })) });
    await tx.seoMetadata.upsert({ where: { propertyId: p.id }, update: seo, create: { ...seo, propertyId: p.id } });
    return p;
  });

  await audit({ userId: user.id, action: id ? "property.update" : "property.create", entity: "Property", entityId: saved.id, diff: { status, title: v.title } });
  revalidatePath("/admin/properties");
  revalidatePublic();
  revalidatePath("/properties");
  if (!id) redirect(`/admin/properties/${saved.id}/edit?created=1`);
  return { saved: true, message: status === "PUBLISHED" ? "Published." : "Saved." };
}

export async function deleteProperty(id: string) {
  const user = await requirePermission("property:delete");
  const p = await prisma.property.findFirst({ where: { id, deletedAt: null }, select: { id: true, title: true } });
  if (!p) return;
  // Soft delete: slug dilepas supaya judul yang sama bisa dipakai lagi.
  await prisma.property.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED", slug: `${id}-deleted` } });
  await audit({ userId: user.id, action: "property.delete", entity: "Property", entityId: id, diff: { title: p.title } });
  revalidatePath("/admin/properties");
  revalidatePublic();
  redirect("/admin/properties?deleted=1");
}
