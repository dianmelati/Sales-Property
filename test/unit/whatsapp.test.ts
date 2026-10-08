import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWhatsAppUrl, normalizeWhatsApp } from "@/lib/whatsapp";

test("nomor lokal Indonesia diubah ke format internasional", () => {
  assert.equal(normalizeWhatsApp("081383137988"), "6281383137988");
  assert.equal(normalizeWhatsApp("0813-8313-7988"), "6281383137988");
  assert.equal(normalizeWhatsApp("+62 813 8313 7988"), "6281383137988");
  assert.equal(normalizeWhatsApp("6281383137988"), "6281383137988");
  assert.equal(normalizeWhatsApp("0062813837988"), "62813837988");
});

test("nomor tidak valid menghasilkan null", () => {
  for (const v of ["", "abc", "0812", "1234567", "0".repeat(20)]) assert.equal(normalizeWhatsApp(v), null, v);
});

test("tautan memuat pesan khusus properti, ter-encode", () => {
  const url = buildWhatsAppUrl("081383137988", "Rumah & Villa \"A\"");
  assert.ok(url.startsWith("https://wa.me/6281383137988?text="));
  const text = decodeURIComponent(url.split("text=")[1]);
  assert.match(text, /interested in Rumah & Villa "A"\./);
  assert.match(text, /arrange a viewing/);
  assert.ok(!url.includes(" ") && !url.includes('"'));
});

test("tanpa judul memakai pesan umum", () => {
  assert.match(decodeURIComponent(buildWhatsAppUrl("6281383137988").split("text=")[1]), /your properties/);
});
