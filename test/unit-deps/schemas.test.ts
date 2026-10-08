// Memerlukan `npm install` (zod). Tidak dijalankan di lingkungan pembuatan karena paketnya tidak tersedia di sana.
import { test } from "node:test";
import assert from "node:assert/strict";
import { propertyInputSchema } from "@/server/properties/schema";
import { parseContent } from "@/lib/cms/schemas";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };
const base = { title: "Rumah di Ubud", categoryId: "c1", locationId: "l1", transaction: "SALE", price: "8900000000" };

test("properti: isian minimal sah dan nilai bawaan terisi", () => {
  const r = propertyInputSchema.safeParse(base);
  assert.ok(r.success, JSON.stringify(r.error?.issues));
  assert.equal(r.data.currency, "IDR");
  assert.equal(r.data.status, "DRAFT");
  assert.equal(r.data.furnished, false);
  assert.equal(r.data.bedrooms, undefined);
});

test("properti: isian bermasalah ditolak", () => {
  const bad = (o: Record<string, string>) => assert.equal(propertyInputSchema.safeParse({ ...base, ...o }).success, false, JSON.stringify(o));
  bad({ title: "abcd" }); bad({ price: "abc" }); bad({ price: "0" }); bad({ price: "-5" }); bad({ transaction: "TRADE" });
  bad({ slug: "Bad Slug" }); bad({ bedrooms: "-1" }); bad({ latitude: "91", longitude: "10" }); bad({ status: "HACKED" });
  bad({ latitude: "-6.2" }); // garis lintang tanpa garis bujur
  assert.ok(propertyInputSchema.safeParse({ ...base, latitude: "-6.2", longitude: "106.8", bedrooms: "3", slug: "" }).success);
});

test("konten CMS: hero", () => {
  const ok = parseContent("hero", fd({ headline: "Temukan rumah", description: "Teks", ctaLabel: "Lihat", ctaHref: "/properties" }));
  assert.ok(ok.ok);
  const bad = parseContent("hero", fd({ headline: "ab", description: "", ctaLabel: "", ctaHref: "javascript:alert(1)" }));
  assert.ok(!bad.ok && bad.errors.headline && bad.errors.ctaHref);
});

test("konten CMS: baris item kosong dibuang, batas dan tautan diperiksa", () => {
  const items = JSON.stringify([{ title: "A", text: "x" }, { title: "", text: "" }, { title: "B", text: "y", href: "/p" }]);
  const r = parseContent("why_us", fd({ title: "Mengapa kami", intro: "", items }));
  assert.ok(r.ok && (r.content.items as unknown[]).length === 2);
  const many = JSON.stringify(Array.from({ length: 13 }, (_, i) => ({ title: `t${i}`, text: "" })));
  const m = parseContent("services", fd({ title: "Layanan", intro: "", items: many }));
  assert.ok(!m.ok && m.errors.items);
  const evil = parseContent("insights", fd({ title: "Wawasan", intro: "", items: JSON.stringify([{ title: "x", text: "", href: "javascript:alert(1)" }]) }));
  assert.ok(!evil.ok && /Item 1/.test(evil.errors.items));
  assert.ok(parseContent("why_us", fd({ title: "Mengapa", intro: "", items: "bukan json" })).ok); // JSON rusak diperlakukan sebagai daftar kosong
});

test("konten CMS: properti dan CTA", () => {
  assert.ok(parseContent("properties", fd({ variant: "featured", title: "Unggulan", linkLabel: "Semua", linkHref: "/properties", count: "5" })).ok);
  for (const count of ["0", "10", "x"]) assert.ok(!parseContent("properties", fd({ variant: "featured", title: "Unggulan", linkLabel: "", linkHref: "", count })).ok, count);
  assert.ok(!parseContent("properties", fd({ variant: "random", title: "Unggulan", linkLabel: "", linkHref: "", count: "3" })).ok);
  assert.ok(!parseContent("cta", fd({ title: "Hubungi", buttonLabel: "Klik", buttonHref: "" })).ok);
  assert.ok(parseContent("cta", fd({ title: "Hubungi", buttonLabel: "Klik", buttonHref: "/contact" })).ok);
});
