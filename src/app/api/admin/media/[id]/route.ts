import { z } from "zod";
import { revalidatePublic } from "@/server/revalidate";
import { prisma } from "@/lib/prisma";
import { apiAuth, fail, ok } from "@/lib/api";
import { allKeys } from "@/lib/media/urls";
import { getStorage } from "@/lib/media/storage";
import { audit } from "@/server/audit";
import { serializeMedia } from "../route";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(200).optional(),
  alt: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req, "media:write", true);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("INVALID", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const exists = await prisma.media.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) return fail("NOT_FOUND", "This file no longer exists.", 404);
  const m = await prisma.media.update({ where: { id }, data: { name: parsed.data.name, alt: parsed.data.alt } });
  await audit({ userId: auth.user.id, action: "media.update", entity: "Media", entityId: id, diff: parsed.data });
  revalidatePublic();
  return ok(serializeMedia(m));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(req, "media:delete", true);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const m = await prisma.media.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { propertyImages: true, floorPlans: true, models: true, agents: true, locations: true, testimonials: true, pageSections: true, seoImages: true } } },
  });
  if (!m) return fail("NOT_FOUND", "This file no longer exists.", 404);
  const uses = (Object.values(m._count) as number[]).reduce((a, b) => a + b, 0);
  if (uses > 0) return fail("IN_USE", `This file is used in ${uses} place${uses > 1 ? "s" : ""}. Remove it there first.`, 409);

  const storage = getStorage();
  await Promise.all(allKeys(m.variants).map((k) => storage.delete(k)));
  await prisma.media.delete({ where: { id } });
  await audit({ userId: auth.user.id, action: "media.delete", entity: "Media", entityId: id, diff: { name: m.name } });
  return ok({ id });
}
