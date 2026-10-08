import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const script = path.resolve("scripts/check-security.mjs");
const run = (files: Record<string, string>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "sec-"));
  try {
    for (const [f, c] of Object.entries(files)) { mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); writeFileSync(path.join(dir, f), c); }
    return spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
};

test("proyek ini sendiri lolos pemeriksaan", () => {
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("pemeriksaan menangkap pelanggaran yang disengaja", () => {
  const cases: [string, Record<string, string>, RegExp][] = [
    ["aksi tanpa izin", { "src/server/a.ts": '"use server";\nexport async function hapusSemua() { return 1; }\n' }, /hapusSemua/],
    ["route admin tanpa apiAuth", { "src/app/api/admin/x/route.ts": "export async function POST() { return new Response(); }\n" }, /apiAuth/],
    ["halaman admin tanpa izin", { "src/app/admin/(panel)/x/page.tsx": "export default function P() { return null; }\n" }, /halaman admin/],
    ["SQL mentah", { "src/a.ts": "prisma.$queryRaw`select 1`;\n" }, /SQL mentah/],
    ["innerHTML tanpa sanitasi", { "src/a.tsx": "<div dangerouslySetInnerHTML={{ __html: userInput }} />\n" }, /dangerouslySetInnerHTML/],
    ["rahasia di NEXT_PUBLIC", { "src/a.ts": "const k = process.env.NEXT_PUBLIC_API_SECRET;\n" }, /NEXT_PUBLIC_/],
    ["x-forwarded-for langsung", { "src/a.ts": 'req.headers.get("x-forwarded-for");\n' }, /clientIp/],
  ];
  for (const [name, files, re] of cases) {
    const r = run(files);
    assert.equal(r.status, 1, name);
    assert.match(r.stderr, re, name);
  }
});

test("kode yang benar tidak ditandai", () => {
  const r = run({
    "src/server/a.ts": '"use server";\nexport async function aman() { await requirePermission("x"); }\nexport async function loginAction() { return 1; }\n',
    "src/app/api/admin/x/route.ts": "export async function GET(req: Request) { await apiAuth(req, 'p'); }\n",
    "src/a.tsx": "<script dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />\n",
  });
  assert.equal(r.status, 0, r.stderr);
});
