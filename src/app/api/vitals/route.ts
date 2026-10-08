import { clientIp } from "@/lib/client-ip";
import { hit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const NAMES = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

/** Menerima sampel Core Web Vitals dari pengunjung nyata dan menuliskannya sebagai satu baris JSON ke log server. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!(await hit(`vitals:${ip}`, 120, 60_000)).ok) return new Response(null, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || !NAMES.has(b.name) || !Number.isFinite(b.value) || !["good", "needs-improvement", "poor"].includes(b.rating) || typeof b.path !== "string") return new Response(null, { status: 400 });
  console.log(JSON.stringify({ type: "web-vital", name: b.name, value: b.value, rating: b.rating, path: b.path.slice(0, 120), device: b.device === "mobile" ? "mobile" : "desktop" }));
  return new Response(null, { status: 204 });
}
