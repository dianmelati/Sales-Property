// Uji asap setelah deploy. Pakai: node scripts/smoke.mjs https://contoh.id
// Memeriksa hal-hal yang paling sering salah di produksi: konfigurasi domain, header keamanan, sitemap, akses admin.
// Keluar dengan kode 1 bila ada yang gagal. Tidak mengubah data apa pun.
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) { console.error("Pakai: node scripts/smoke.mjs https://contoh.id"); process.exit(2); }
const origin = new URL(base);
let failed = 0;

const get = (path, init = {}) => fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(20000), ...init });
async function check(name, fn) {
  const t0 = Date.now();
  try { const note = await fn(); console.log(`PASS  ${name}${note ? ` (${note})` : ""} [${Date.now() - t0} ms]`); }
  catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

await check("health: aplikasi dan database hidup", async () => {
  const r = await get("/api/health"); must(r.status === 200, `status ${r.status}`);
  must((await r.json()).status === "ok", "isi bukan ok");
});

for (const path of ["/", "/properties", "/locations", "/agents", "/about", "/contact", "/favorites", "/compare"]) {
  await check(`halaman ${path} terbuka`, async () => {
    const r = await get(path); must(r.status === 200, `status ${r.status}`);
    must((await r.text()).includes("<h1"), "tidak ada <h1>");
  });
}

await check("header keamanan di beranda", async () => {
  const r = await get("/"); const h = r.headers;
  const csp = h.get("content-security-policy") ?? "";
  must(csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"), "CSP tidak lengkap");
  must(h.get("x-frame-options") === "DENY", "X-Frame-Options bukan DENY");
  must(h.get("x-content-type-options") === "nosniff", "nosniff hilang");
  must(!h.get("x-powered-by"), "X-Powered-By terbuka");
  if (origin.protocol === "https:") must((h.get("strict-transport-security") ?? "").includes("max-age"), "HSTS hilang");
});

await check("robots.txt menutup admin dan menunjuk sitemap di domain yang benar", async () => {
  const t = await (await get("/robots.txt")).text();
  must(t.includes("Disallow: /admin"), "admin tidak ditutup");
  const m = t.match(/Sitemap:\s*(\S+)/); must(m, "tidak ada baris Sitemap");
  must(new URL(m[1]).origin === origin.origin, `Sitemap menunjuk ke ${new URL(m[1]).origin}; periksa NEXT_PUBLIC_SITE_URL`);
});

await check("sitemap.xml valid dan memakai domain yang benar", async () => {
  const r = await get("/sitemap.xml"); must(r.status === 200, `status ${r.status}`);
  const t = await r.text(); const locs = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  must(locs.length > 0, "tidak ada <loc>");
  const bad = locs.find((l) => new URL(l).origin !== origin.origin); must(!bad, `URL di domain lain: ${bad}`);
  return `${locs.length} URL`;
});

await check("admin mengarahkan tamu ke login", async () => {
  const r = await get("/admin/properties"); must([301, 302, 303, 307, 308].includes(r.status), `status ${r.status}`);
  must((r.headers.get("location") ?? "").includes("/admin/login"), "tidak diarahkan ke /admin/login");
});

await check("API admin menolak tamu dan permintaan lintas situs", async () => {
  must((await get("/api/admin/media")).status === 401, "GET tanpa login bukan 401");
  const r = await get("/api/admin/media", { method: "POST", headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } });
  must(r.status === 403, `POST lintas situs status ${r.status}`);
});

await check("slug yang tidak ada menghasilkan 404", async () => {
  const r = await get("/properties/slug-yang-pasti-tidak-ada-xyz"); must(r.status === 404, `status ${r.status}`);
});

if (origin.protocol === "https:") {
  await check("HTTP diarahkan ke HTTPS", async () => {
    const r = await fetch(`http://${origin.host}/`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    must([301, 302, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").startsWith("https://"), `status ${r.status}`);
  });
}

console.log(failed ? `\n${failed} pemeriksaan GAGAL.` : "\nSemua pemeriksaan lulus. Lanjutkan dengan daftar uji manual di DEPLOYMENT.md.");
process.exit(failed ? 1 : 0);
