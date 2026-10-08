import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_PERMISSIONS, can, type RoleKey } from "@/lib/auth/permissions";

const roles = Object.keys(ROLE_PERMISSIONS) as RoleKey[];

test("empat role tersedia dan semua izinnya dikenal", () => {
  assert.deepEqual([...roles].sort(), ["ADMIN", "AGENT", "EDITOR", "SUPER_ADMIN"]);
  for (const r of roles) for (const p of ROLE_PERMISSIONS[r]) assert.ok((PERMISSIONS as readonly string[]).includes(p), `${r}: ${p}`);
});

test("SUPER_ADMIN memegang semuanya; ADMIN tidak bisa mengelola pengguna", () => {
  for (const p of PERMISSIONS) assert.ok(can("SUPER_ADMIN", p), p);
  for (const p of PERMISSIONS) assert.equal(can("ADMIN", p), p !== "user:manage", p);
});

test("EDITOR: konten ya; lead, pengguna, pengaturan, audit, hapus tidak", () => {
  for (const p of ["property:write", "property:publish", "media:write", "cms:write", "seo:write"] as const) assert.ok(can("EDITOR", p), p);
  for (const p of ["property:delete", "lead:read", "lead:write", "user:manage", "settings:write", "audit:read", "agent:write", "media:delete"] as const) assert.equal(can("EDITOR", p), false, p);
});

test("AGENT hanya boleh persis izin ini (daftar tertutup)", () => {
  assert.deepEqual([...ROLE_PERMISSIONS.AGENT].sort(), ["dashboard:read", "lead:read", "lead:write", "media:read", "property:read"]);
  for (const p of ["property:write", "property:publish", "agent:read", "cms:write", "seo:write", "settings:write", "user:manage", "audit:read"] as const) assert.equal(can("AGENT", p), false, p);
});
