// Pemeriksaan keamanan statis. Jalankan: npm run check:security (juga cocok untuk CI).
// Gagal (exit 1) bila ada aksi server/route admin tanpa pengecekan izin, SQL mentah, innerHTML tanpa sanitasi, dan sejenisnya.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const walk = (d) => readdirSync(d).flatMap((n) => { const p = path.join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk("src").filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => f.split(path.sep).join("/"));
const problems = [];
const add = (file, msg) => problems.push(`${file}: ${msg}`);

// Aksi server yang memang publik (formulir pengunjung dan login). Selain ini wajib memeriksa izin.
const PUBLIC_ACTIONS = new Set(["loginAction", "logoutAction", "submitInquiry", "submitContact"]);

for (const f of files) {
  const src = readFileSync(f, "utf8");

  // 1. Setiap fungsi yang diekspor dari berkas "use server" bisa dipanggil siapa saja yang mengetahui ID-nya, dari halaman mana pun.
  if (/^\s*["']use server["']/.test(src)) {
    if (/export\s+(const|let)\s+\w+\s*=\s*(async)?/.test(src)) add(f, 'ekspor non-fungsi di berkas "use server" (gunakan "export async function")');
    const re = /export\s+async\s+function\s+(\w+)/g;
    const starts = [...src.matchAll(re)].map((m) => ({ name: m[1], at: m.index }));
    starts.forEach((s, i) => {
      const body = src.slice(s.at, starts[i + 1]?.at ?? src.length);
      if (!PUBLIC_ACTIONS.has(s.name) && !/require(Permission|User)\(/.test(body)) add(f, `aksi "${s.name}" tidak memanggil requirePermission/requireUser`);
    });
  }

  // 2. Route handler admin harus memakai apiAuth.
  if (f.startsWith("src/app/api/admin/") && f.endsWith("/route.ts")) {
    const re = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g;
    const starts = [...src.matchAll(re)].map((m) => ({ name: m[1], at: m.index }));
    starts.forEach((s, i) => {
      if (!/apiAuth\(/.test(src.slice(s.at, starts[i + 1]?.at ?? src.length))) add(f, `handler ${s.name} tidak memanggil apiAuth`);
    });
  }

  // 3. Halaman admin memeriksa izin sendiri (layout hanya memastikan sudah login).
  if (/^src\/app\/admin\/\(panel\)\/.*page\.tsx$/.test(f) && !f.endsWith("/forbidden/page.tsx") && !/require(Permission|User)\(/.test(src)) add(f, "halaman admin tanpa requirePermission/requireUser");

  // 4. SQL mentah.
  if (/\$(queryRaw|executeRaw)(Unsafe)?\b/.test(src)) add(f, "memakai SQL mentah (pastikan terparameter lalu tambahkan ke daftar izin skrip ini)");

  // 5. innerHTML hanya untuk JSON-LD (di-escape) atau HTML yang disanitasi.
  src.split("\n").forEach((line, n) => {
    if (line.includes("dangerouslySetInnerHTML") && !/JSON\.stringify|sanitizeDescription/.test(line)) add(f, `baris ${n + 1}: dangerouslySetInnerHTML tanpa sanitasi atau JSON.stringify`);
  });

  // 6. Rahasia tidak boleh terekspos ke browser.
  if (/NEXT_PUBLIC_\w*(SECRET|TOKEN|PASSWORD|PRIVATE|KEY)/i.test(src)) add(f, "variabel NEXT_PUBLIC_ yang tampak seperti rahasia");

  // 7. X-Forwarded-For hanya boleh dibaca lewat clientIp().
  if (/x-forwarded-for/i.test(src) && f !== "src/lib/client-ip.ts") add(f, "membaca x-forwarded-for langsung (gunakan clientIp)");
}

if (problems.length) {
  console.error(`\n${problems.length} masalah keamanan ditemukan:\n` + problems.map((p) => ` - ${p}`).join("\n") + "\n");
  process.exit(1);
}
console.log(`OK: ${files.length} berkas diperiksa, tidak ada pelanggaran.`);
