// Memerlukan `npm install` (sanitize-html). Tidak dijalankan di lingkungan pembuatan karena paketnya tidak tersedia di sana.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDescription } from "@/lib/sanitize";

test("skrip dan atribut berbahaya dibuang, isi yang wajar dipertahankan", () => {
  const out = sanitizeDescription('<p>Halo</p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="//evil"></iframe>');
  assert.match(out, /<p>Halo<\/p>/);
  for (const bad of ["<script", "alert(1)", "onerror", "<img", "<iframe"]) assert.ok(!out.includes(bad), bad);
});

test("tautan: skema berbahaya dibuang, tautan sah diberi rel dan target aman", () => {
  assert.ok(!sanitizeDescription('<a href="javascript:alert(1)">x</a>').includes("javascript:"));
  assert.ok(!sanitizeDescription('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>').includes("data:"));
  const a = sanitizeDescription('<a href="https://contoh.id/x" onclick="x()" style="color:red">tautan</a>');
  assert.match(a, /href="https:\/\/contoh\.id\/x"/);
  assert.match(a, /rel="noopener noreferrer"/);
  assert.match(a, /target="_blank"/);
  assert.ok(!a.includes("onclick") && !a.includes("style"));
  assert.match(sanitizeDescription('<a href="mailto:a@b.co">m</a>'), /mailto:a@b\.co/);
});

test("tag di luar daftar dibuang tetapi teksnya tetap; format yang diizinkan tetap", () => {
  assert.equal(sanitizeDescription("<h1>Judul</h1>"), "Judul");
  const ok = sanitizeDescription("<h2>A</h2><p><strong>b</strong> <em>c</em></p><ul><li>d</li></ul><blockquote>e</blockquote>");
  for (const t of ["<h2>", "<strong>", "<em>", "<ul>", "<li>", "<blockquote>"]) assert.ok(ok.includes(t), t);
});

test("payload mXSS umum", () => {
  for (const p of ["<svg><script>alert(1)</script></svg>", "<math><mi//xlink:href=\"data:x,<script>alert(1)</script>\">", "<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\">", '<p style="background:url(javascript:alert(1))">x</p>']) {
    const out = sanitizeDescription(p);
    assert.ok(!/<script|onerror|javascript:|<svg|<math/i.test(out), `${p} => ${out}`);
  }
  assert.equal(sanitizeDescription(""), "");
});
