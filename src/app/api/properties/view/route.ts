import { clientIp } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { fail, ok, sameOrigin } from "@/lib/api";
import { hit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;

/**
 * Menghitung tampilan properti dari browser sungguhan. Dipisah dari render halaman supaya halaman bisa di-cache,
 * dan bot yang tidak menjalankan JavaScript tidak ikut terhitung.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("BAD_ORIGIN", "Request origin not allowed.", 403);
  if (BOT.test(req.headers.get("user-agent") ?? "")) return ok({ counted: false });

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return fail("INVALID", "Invalid property.", 422);

  const ip = clientIp(req.headers);
  if (!(await hit(`view-ip:${ip}`, 60, 60_000)).ok) return fail("RATE_LIMITED", "Too many requests.", 429);
  if (!(await hit(`view:${ip}:${slug}`, 1, 30 * 60_000)).ok) return ok({ counted: false }); // satu per pengunjung per 30 menit

  const r = await prisma.property.updateMany({ where: { slug, status: "PUBLISHED", deletedAt: null }, data: { viewCount: { increment: 1 } } });
  return ok({ counted: r.count > 0 });
}
