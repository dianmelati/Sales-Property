import { clientIp } from "@/lib/client-ip";
import { fail, ok } from "@/lib/api";
import { hit } from "@/lib/rate-limit";
import { cardsBySlugs } from "@/server/properties/public";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ip = clientIp(req.headers);
  if (!(await hit(`by-slug:${ip}`, 60, 60_000)).ok) return fail("RATE_LIMITED", "Too many requests. Try again shortly.", 429);
  const raw = new URL(req.url).searchParams.get("slugs") ?? "";
  const slugs = raw.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,120}$/.test(s));
  const res = ok(await cardsBySlugs(slugs));
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
