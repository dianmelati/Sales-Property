import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "@/lib/client-ip";
import { hit } from "@/lib/rate-limit";

const headers = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });
const saved = { ...process.env };
beforeEach(() => { for (const k of ["TRUSTED_IP_HEADER", "TRUSTED_PROXY_HOPS", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete process.env[k]; });
afterEach(() => { process.env = { ...saved }; });

test("tanpa konfigurasi proxy, X-Forwarded-For diabaikan (tidak bisa dipalsukan)", () => {
  assert.equal(clientIp(headers({ "x-forwarded-for": "6.6.6.6" })), "unknown");
  assert.equal(clientIp(headers({})), "unknown");
});

test("di belakang proxy tepercaya, diambil dari kanan", () => {
  process.env.TRUSTED_PROXY_HOPS = "1";
  assert.equal(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 2.2.2.2" })), "2.2.2.2"); // 9.9.9.9 dikirim penyerang
  assert.equal(clientIp(headers({ "x-forwarded-for": "2.2.2.2" })), "2.2.2.2");
  process.env.TRUSTED_PROXY_HOPS = "2";
  assert.equal(clientIp(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(headers({ "x-forwarded-for": "2.2.2.2" })), "unknown"); // rantai lebih pendek dari yang diharapkan
});

test("header khusus proxy diutamakan", () => {
  process.env.TRUSTED_IP_HEADER = "CF-Connecting-IP";
  assert.equal(clientIp(headers({ "cf-connecting-ip": "3.3.3.3", "x-forwarded-for": "9.9.9.9" })), "3.3.3.3");
  assert.equal(clientIp(headers({ "x-forwarded-for": "9.9.9.9" })), "unknown");
});

test("pembatas laju: batas, kunci terpisah, jendela berakhir", async () => {
  const k = `t:${Math.random()}`;
  assert.equal((await hit(k, 2, 60)).ok, true);
  assert.equal((await hit(k, 2, 60)).ok, true);
  const third = await hit(k, 2, 60);
  assert.equal(third.ok, false);
  assert.ok(third.retryAfterSec >= 1);
  assert.equal((await hit(`${k}:lain`, 2, 60)).ok, true);
  await new Promise((r) => setTimeout(r, 90));
  assert.equal((await hit(k, 2, 60)).ok, true);
});

test("kunci dengan IP tidak dikenal tidak dibatasi agar pengunjung tidak berbagi satu ember", async () => {
  for (let i = 0; i < 50; i++) {
    assert.equal((await hit("login:ip:unknown", 1, 60_000)).ok, true);
    assert.equal((await hit("inquiry:unknown", 1, 60_000)).ok, true);
  }
});
