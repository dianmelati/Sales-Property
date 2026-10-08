"use server";

import { revalidatePublic } from "@/server/revalidate";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/server/audit";

export interface PageState { message?: string; errors?: Record<string, string>; saved?: boolean }

const about = z.object({ headline: z.string().trim().min(3, "Enter a headline").max(120), body: z.string().trim().max(6000, "At most 6000 characters"), imageId: z.string().trim().max(40).optional() });
const contact = z.object({ headline: z.string().trim().min(3, "Enter a headline").max(120), intro: z.string().trim().max(400, "At most 400 characters") });

export async function savePageContent(key: "about" | "contact", _: PageState, fd: FormData): Promise<PageState> {
  const user = await requirePermission("cms:write");
  const raw = Object.fromEntries(fd.entries());
  const p = (key === "about" ? about : contact).safeParse(raw);
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Some fields need attention.", errors };
  }
  const value = p.data as Record<string, string | undefined>;
  if (key === "about" && value.imageId && !(await prisma.media.findFirst({ where: { id: value.imageId, kind: "IMAGE", deletedAt: null }, select: { id: true } }))) {
    return { message: "The chosen image is no longer in the library.", errors: { imageId: "Choose another image" } };
  }
  await prisma.siteSetting.upsert({ where: { key: `page.${key}` }, update: { value }, create: { key: `page.${key}`, value } });
  await audit({ userId: user.id, action: "cms.page_update", entity: "SiteSetting", entityId: `page.${key}` });
  revalidatePath(`/${key}`);
  revalidatePublic();
  return { saved: true, message: "Saved and live." };
}
