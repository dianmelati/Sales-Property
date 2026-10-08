// Menjaga dokumentasi variabel environment tetap jujur: semua yang dipakai kode terdokumentasi, tidak ada yang usang.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const walk = (d) => readdirSync(d).flatMap((n) => { const p = path.join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const code = [...walk("src"), "prisma/seed.ts", "next.config.mjs"].filter((f) => /\.(ts|tsx|mjs)$/.test(f));
const text = code.map((f) => readFileSync(f, "utf8")).join("\n");
const keysOf = (f) => (existsSync(f) ? [...readFileSync(f, "utf8").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]) : []);

// Disediakan oleh platform/Next.js, atau hanya untuk pengujian (didokumentasikan di TESTING.md).
const PLATFORM = new Set(["NODE_ENV", "CI", "NEXT_RUNTIME", "NEXT_PHASE", "ANALYZE", "NEXT_TELEMETRY_DISABLED", "PORT", "HOSTNAME"]);
const used = new Set([...text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]));
const app = keysOf(".env.example"), docker = keysOf(".env.docker.example");
const deployDoc = existsSync("DEPLOYMENT.md") ? readFileSync("DEPLOYMENT.md", "utf8") : "";
const problems = [];

for (const k of used) if (!PLATFORM.has(k) && !app.includes(k)) problems.push(`${k} dipakai kode tetapi tidak ada di .env.example`);
for (const k of app) if (!text.includes(k)) problems.push(`${k} ada di .env.example tetapi tidak dipakai kode (usang?)`);
for (const k of [...app, ...docker]) if (!deployDoc.includes(k)) problems.push(`${k} belum dijelaskan di DEPLOYMENT.md`);

if (problems.length) { console.error(problems.map((p) => ` - ${p}`).join("\n")); process.exit(1); }
console.log(`OK: ${used.size} variabel dipakai kode, ${app.length} di .env.example, ${docker.length} di .env.docker.example, semua terdokumentasi.`);
