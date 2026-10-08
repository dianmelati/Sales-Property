/**
 * Pembatas laju jendela tetap.
 * - Dengan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN: dibagi antar semua instance (cocok untuk serverless/multi-instance).
 * - Tanpa itu, atau bila Redis gagal: di memori per instance (hilang saat restart).
 * - Kunci yang mengandung "unknown" (IP tidak diketahui, lihat client-ip.ts) tidak dibatasi, supaya semua pengunjung tidak berbagi satu ember.
 */
type Result = { ok: boolean; retryAfterSec: number };
const buckets = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

export async function hit(key: string, limit: number, windowMs: number): Promise<Result> {
  if (/(^|:)unknown(:|$)/.test(key)) return { ok: true, retryAfterSec: 0 };
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const k = `rl:${key}`;
      const res = await fetch(`${url}/pipeline`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(1500),
        body: JSON.stringify([["INCR", k], ["PEXPIRE", k, String(windowMs), "NX"], ["PTTL", k]]),
      });
      const j = (await res.json()) as { result?: number }[];
      const count = Number(j[0]?.result), ttl = Number(j[2]?.result);
      if (Number.isFinite(count)) return { ok: count <= limit, retryAfterSec: Math.max(1, Math.ceil((Number.isFinite(ttl) ? ttl : windowMs) / 1000)) };
    } catch { /* Redis tidak tersedia: jatuh ke pembatas memori */ }
  }
  return memoryHit(key, limit, windowMs);
}
