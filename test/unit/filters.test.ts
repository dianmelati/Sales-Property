import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFilters } from "@/lib/search-filters";
import { leadWhere } from "@/lib/lead-where";

test("filter pencarian: nilai awal", () => {
  const f = parseFilters({});
  assert.deepEqual([f.sort, f.view, f.page], ["newest", "grid", 1]);
  assert.equal(f.q, undefined);
});

test("halaman dibersihkan: tidak pernah di bawah 1, pecahan dibulatkan ke bawah", () => {
  for (const [raw, want] of [["abc", 1], ["-3", 1], ["0", 1], ["2.9", 2], ["7", 7], ["", 1]] as const) assert.equal(parseFilters({ page: raw }).page, want, raw);
});

test("angka harus positif dan terbatas; teks dipangkas", () => {
  const f = parseFilters({ minPrice: "5e9", maxPrice: "0", beds: "-2", baths: "NaN", minLand: "1e20", q: `  ${"x".repeat(200)}  ` });
  assert.equal(f.minPrice, 5e9);
  assert.equal(f.maxPrice, undefined);
  assert.equal(f.beds, undefined);
  assert.equal(f.baths, undefined);
  assert.equal(f.minLand, 1e15);
  assert.equal(f.q!.length, 80);
  assert.equal(parseFilters({ q: "   " }).q, undefined);
});

test("enum divalidasi; nilai tak dikenal diabaikan", () => {
  assert.equal(parseFilters({ transaction: "rent" }).transaction, "RENT");
  assert.equal(parseFilters({ transaction: "DROP TABLE" }).transaction, undefined);
  assert.equal(parseFilters({ certificate: "shm" }).certificate, "SHM");
  assert.equal(parseFilters({ certificate: "x" }).certificate, undefined);
  assert.equal(parseFilters({ sort: "price_asc" }).sort, "price_asc");
  assert.equal(parseFilters({ sort: "'; --" }).sort, "newest");
  assert.equal(parseFilters({ view: "list" }).view, "list");
  assert.equal(parseFilters({ view: "x" }).view, "grid");
});

test("bendera hanya aktif dengan nilai 1", () => {
  const f = parseFilters({ pool: "1", garden: "true", furnished: "0", featured: "1" });
  assert.deepEqual([f.pool, f.garden, f.furnished, f.featured], [true, undefined, undefined, true]);
});

test("filter lead: lingkup agen selalu ikut dan tidak bisa dilewati", () => {
  const scope = { agentId: "A" };
  const w = leadWhere({ agent: "B" }, scope) as { AND: object[] };
  assert.deepEqual(w.AND[0], scope);
  assert.deepEqual(w.AND[1], { agentId: "B" }); // hasil kosong: dua syarat agentId saling bertentangan
  assert.deepEqual((leadWhere({}, {}) as { AND: object[] }).AND, [{}]);
});

test("filter lead: nilai tidak sah diabaikan", () => {
  const and = (f: object) => (leadWhere(f, {}) as { AND: object[] }).AND.slice(1);
  assert.deepEqual(and({ status: "NEW" }), [{ status: "NEW" }]);
  assert.deepEqual(and({ status: "HACKED", source: "bukan_sumber", period: "999" }), []);
  assert.deepEqual(and({ agent: "unassigned" }), [{ agentId: null }]);
  const [p] = and({ period: "30" }) as { createdAt: { gte: Date } }[];
  assert.ok(Math.abs(Date.now() - 30 * 864e5 - p.createdAt.gte.getTime()) < 5000);
  const [q] = and({ q: "y".repeat(300) }) as { OR: { name: { contains: string } }[] }[];
  assert.equal(q.OR[0].name.contains.length, 80);
});
