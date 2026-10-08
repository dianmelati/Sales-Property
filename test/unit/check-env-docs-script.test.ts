import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const script = path.resolve("scripts/check-env-docs.mjs");
const run = (files: Record<string, string>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "env-"));
  try {
    for (const [f, c] of Object.entries(files)) { mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); writeFileSync(path.join(dir, f), c); }
    return spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
const ok = { "src/a.ts": "const a = process.env.DATABASE_URL; const m = process.env.NODE_ENV;\n", ".env.example": "DATABASE_URL=\n", "DEPLOYMENT.md": "DATABASE_URL\n", "prisma/seed.ts": "", "next.config.mjs": "" };

test("proyek ini sendiri lolos", () => { assert.equal(spawnSync(process.execPath, [script], { encoding: "utf8" }).status, 0); });
test("konfigurasi konsisten lolos", () => { assert.equal(run(ok).status, 0); });
test("variabel yang dipakai tapi tidak terdokumentasi gagal", () => {
  const r = run({ ...ok, "src/b.ts": "const x = process.env.RAHASIA_BARU;\n" });
  assert.equal(r.status, 1); assert.match(r.stderr, /RAHASIA_BARU.*\.env\.example/);
});
test("variabel usang di .env.example gagal", () => {
  const r = run({ ...ok, ".env.example": "DATABASE_URL=\nMAPS_TOKEN=\n", "DEPLOYMENT.md": "DATABASE_URL MAPS_TOKEN\n" });
  assert.equal(r.status, 1); assert.match(r.stderr, /MAPS_TOKEN.*usang/);
});
test("variabel yang belum dijelaskan di DEPLOYMENT.md gagal", () => {
  const r = run({ ...ok, "DEPLOYMENT.md": "kosong\n" });
  assert.equal(r.status, 1); assert.match(r.stderr, /DATABASE_URL.*DEPLOYMENT/);
});
