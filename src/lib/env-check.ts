/** Pemeriksaan konfigurasi saat server mulai (src/instrumentation.ts). Di produksi, konfigurasi berbahaya menghentikan server. */
export function assertConfig() {
  const prod = process.env.NODE_ENV === "production";
  const fatal: string[] = [];
  const warn: string[] = [];
  const secret = process.env.AUTH_SECRET ?? "";

  if (secret.length < 32 || secret.includes("ganti-dengan")) (prod ? fatal : warn).push("AUTH_SECRET harus berupa nilai acak minimal 32 karakter (openssl rand -base64 32).");
  if (!process.env.DATABASE_URL) fatal.push("DATABASE_URL belum diisi.");

  if (prod) {
    if (!/^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) fatal.push("NEXT_PUBLIC_SITE_URL harus berupa alamat https:// di produksi.");
    if (process.env.STORAGE_DRIVER === "s3") {
      for (const k of ["STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY", "STORAGE_PUBLIC_HOST"]) if (!process.env[k]) fatal.push(`${k} belum diisi (STORAGE_DRIVER=s3).`);
    } else warn.push("STORAGE_DRIVER=local di produksi: unggahan disimpan di disk server dan hilang di hosting serverless. Pakai s3.");
    if (!process.env.TRUSTED_IP_HEADER && !process.env.TRUSTED_PROXY_HOPS) warn.push("TRUSTED_IP_HEADER atau TRUSTED_PROXY_HOPS belum diisi: pembatas laju berbasis IP dan IP di audit log nonaktif.");
    if (!process.env.UPSTASH_REDIS_REST_URL) warn.push("Pembatas laju hanya di memori per instance. Isi UPSTASH_REDIS_REST_URL/TOKEN bila memakai lebih dari satu instance.");
    if (/password|admin123|changeme/i.test(process.env.ADMIN_SEED_PASSWORD ?? "")) warn.push("ADMIN_SEED_PASSWORD terlihat lemah. Ganti lewat Admin > Akun.");
  }
  for (const w of warn) console.warn(`[config] ${w}`);
  if (fatal.length) throw new Error(`Konfigurasi tidak aman atau tidak lengkap:\n- ${fatal.join("\n- ")}`);
}
