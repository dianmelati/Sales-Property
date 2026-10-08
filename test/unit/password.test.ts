import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { DUMMY_HASH, hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";

test("hash lalu verifikasi", async () => {
  const h = await hashPassword("kata sandi panjang 123");
  assert.ok(await verifyPassword("kata sandi panjang 123", h));
  assert.equal(await verifyPassword("kata sandi panjang 124", h), false);
  assert.equal(await verifyPassword("", h), false);
});

test("salt acak membuat hash berbeda, format memuat parameter", async () => {
  const [a, b] = await Promise.all([hashPassword("sama-saja-123"), hashPassword("sama-saja-123")]);
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$32768\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(needsRehash(a), false);
});

test("hash format lama tetap terverifikasi dan ditandai perlu di-upgrade", async () => {
  const salt = randomBytes(16).toString("hex");
  const legacy = `scrypt$${salt}$${scryptSync("lama-123456", salt, 64).toString("hex")}`;
  assert.ok(await verifyPassword("lama-123456", legacy));
  assert.equal(await verifyPassword("salah-123456", legacy), false);
  assert.equal(needsRehash(legacy), true);
});

test("hash rusak atau berbahaya ditolak tanpa melempar", async () => {
  for (const bad of ["", "x", "scrypt$1$2$3", "bcrypt$a$b", `scrypt$${2 ** 20}$8$1$aa$bb`, `scrypt$8$8$1$aa$bb`, "scrypt$32768$8$1$$"]) {
    assert.equal(await verifyPassword("apa-saja-123", bad), false, bad);
  }
  assert.equal(needsRehash("sampah"), true);
});

test("DUMMY_HASH tidak pernah cocok tetapi dihitung dengan biaya sama", async () => {
  assert.equal(await verifyPassword("apa-saja", DUMMY_HASH), false);
  assert.equal(needsRehash(DUMMY_HASH), false);
});
