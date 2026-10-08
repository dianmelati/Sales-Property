import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice, formatPriceFull } from "@/lib/format";
import { allKeys, variantUrls } from "@/lib/media/urls";
import { assertConfig } from "@/lib/env-check";
import { DEFAULT_HOME } from "@/lib/cms/defaults";
import { SECTION_TYPES } from "@/lib/cms/types";
import { isSafeHref } from "@/lib/cms/links";

test("format harga", () => {
  assert.equal(formatPrice(8_900_000_000), "Rp 8,9 miliar");
  assert.equal(formatPrice(38_000_000), "Rp 38 juta");
  assert.equal(formatPrice(250_000, "USD"), "$250,000");
  assert.match(formatPriceFull(8_900_000_000), /^Rp\s?8\.900\.000\.000$/);
  assert.ok(!formatPriceFull(1_000_000).includes("\u00a0"));
});

test("URL varian dan kunci storage", () => {
  delete process.env.STORAGE_DRIVER;
  const v = { thumbnail: "media/a/t.webp", small: "media/a/s.webp", large: "media/a/l.webp", original: "media/a/o.jpg" };
  const u = variantUrls(v);
  assert.equal(u.thumbnail, "/uploads/media/a/t.webp");
  assert.equal(u.medium, "/uploads/media/a/l.webp"); // medium kosong: memakai large
  assert.equal(u.file, "");
  assert.deepEqual(variantUrls(null), { thumbnail: "", small: "", medium: "", large: "", file: "" });
  assert.equal(variantUrls({ file: "media/b/denah.pdf" }).file, "/uploads/media/b/denah.pdf");
  assert.deepEqual(allKeys(v).sort(), ["media/a/l.webp", "media/a/o.jpg", "media/a/s.webp", "media/a/t.webp"]);
  assert.deepEqual(allKeys(undefined), []);
});

const saved = { ...process.env };
beforeEach(() => { mock.method(console, "warn", () => {}); });
afterEach(() => { process.env = { ...saved }; mock.restoreAll(); });
const prodEnv = () => Object.assign(process.env, {
  NODE_ENV: "production", AUTH_SECRET: "k".repeat(24) + "Zq9" + "x".repeat(20), DATABASE_URL: "postgresql://u:p@h/db",
  NEXT_PUBLIC_SITE_URL: "https://contoh.id", STORAGE_DRIVER: "s3", STORAGE_BUCKET: "b", STORAGE_ACCESS_KEY_ID: "a", STORAGE_SECRET_ACCESS_KEY: "s", STORAGE_PUBLIC_HOST: "cdn.contoh.id",
});

test("konfigurasi produksi yang lengkap lolos", () => { prodEnv(); assert.doesNotThrow(() => assertConfig()); });

test("konfigurasi produksi berbahaya menghentikan server", () => {
  prodEnv(); process.env.AUTH_SECRET = "pendek";
  assert.throws(() => assertConfig(), /AUTH_SECRET/);
  prodEnv(); process.env.AUTH_SECRET = "ganti-dengan-string-acak-panjang-sekali-12345";
  assert.throws(() => assertConfig(), /AUTH_SECRET/);
  prodEnv(); process.env.NEXT_PUBLIC_SITE_URL = "http://contoh.id";
  assert.throws(() => assertConfig(), /https/);
  prodEnv(); delete process.env.STORAGE_BUCKET;
  assert.throws(() => assertConfig(), /STORAGE_BUCKET/);
  prodEnv(); delete process.env.DATABASE_URL;
  assert.throws(() => assertConfig(), /DATABASE_URL/);
});

test("di luar produksi rahasia lemah hanya peringatan", () => {
  Object.assign(process.env, { NODE_ENV: "development", AUTH_SECRET: "pendek", DATABASE_URL: "x" });
  assert.doesNotThrow(() => assertConfig());
});

test("tata letak beranda bawaan konsisten", () => {
  assert.equal(DEFAULT_HOME.filter((d) => d.type === "hero").length, 1);
  for (const d of DEFAULT_HOME) {
    assert.ok(d.type in SECTION_TYPES, d.type);
    const c = d.content as Record<string, unknown>;
    for (const k of ["linkHref", "ctaHref", "buttonHref"]) if (typeof c[k] === "string" && c[k]) assert.ok(isSafeHref(c[k] as string), `${d.type}.${k}`);
    for (const it of (c.items as { href?: string }[] | undefined) ?? []) if (it.href) assert.ok(isSafeHref(it.href));
    if (typeof c.count === "number") assert.ok(c.count >= 1 && c.count <= 12);
  }
});
