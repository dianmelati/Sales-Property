import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "@/lib/slug";
import { isSafeHref, safeHref } from "@/lib/cms/links";
import { csvCell } from "@/lib/csv";

test("slugify", () => {
  assert.equal(slugify("Rumah Mewah di BSD City!"), "rumah-mewah-di-bsd-city");
  assert.equal(slugify("Café Résidence"), "cafe-residence");
  assert.equal(slugify("  --Halo   Dunia--  "), "halo-dunia");
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify(""), "");
  assert.ok(slugify("a".repeat(200)).length <= 80);
  assert.match(slugify("Villa 2 Lantai, Ubud (Bali)"), /^[a-z0-9-]+$/);
});

test("tautan CMS: yang aman diterima", () => {
  for (const ok of ["/properties", "/properties?featured=1", "https://example.com/a", "http://example.com", "mailto:a@b.co", "tel:+62812", "#faq", "  /spasi  "]) {
    assert.equal(isSafeHref(ok), true, ok);
  }
});

test("tautan CMS: skema berbahaya dan protocol-relative ditolak", () => {
  for (const bad of ["//evil.com", "javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "file:///etc/passwd", "", "properties"]) {
    assert.equal(isSafeHref(bad), false, JSON.stringify(bad));
    assert.equal(safeHref(bad), "#");
  }
  assert.equal(safeHref(undefined), "#");
  assert.equal(safeHref("  /ok "), "/ok");
});

test("CSV: sel rumus dinetralkan, kutip digandakan", () => {
  assert.equal(csvCell("halo"), '"halo"');
  assert.equal(csvCell('dia berkata "hai"'), '"dia berkata ""hai"""');
  for (const f of ["=SUM(A1)", "+1+1", "-2+3", "@cmd", "\tx", "\rx"]) assert.equal(csvCell(f), `"'${f}"`, f);
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
  assert.equal(csvCell(42), '"42"');
  assert.equal(csvCell("baris1\nbaris2"), '"baris1\nbaris2"');
});
