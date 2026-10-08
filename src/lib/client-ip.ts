/**
 * Alamat klien yang tidak bisa dipalsukan oleh pengunjung.
 * X-Forwarded-For dikirim klien, jadi HANYA dipercaya bila kita tahu ada proxy tepercaya di depan yang menambahkannya:
 *  - TRUSTED_IP_HEADER: nama header yang diisi proxy Anda (cf-connecting-ip, x-real-ip, x-vercel-forwarded-for, ...)
 *  - TRUSTED_PROXY_HOPS: jumlah proxy yang menambah X-Forwarded-For (biasanya 1); diambil dari kanan.
 * Tanpa keduanya hasilnya "unknown" dan pembatas berbasis IP dinonaktifkan (pembatas per akun/email tetap berlaku).
 */
export function clientIp(h: { get(name: string): string | null }): string {
  const named = process.env.TRUSTED_IP_HEADER?.toLowerCase();
  if (named) { const v = h.get(named)?.trim(); if (v) return v.slice(0, 64); }
  const hops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS ?? "0") || 0);
  if (hops === 0) return "unknown";
  const list = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (list[list.length - hops] ?? "unknown").slice(0, 64);
}
