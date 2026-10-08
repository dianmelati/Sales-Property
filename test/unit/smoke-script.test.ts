import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** Server tiruan yang meniru situs sehat; opsi `bad` merusak satu hal agar skrip uji asap terbukti bisa gagal. */
function mock(bad: "none" | "no-csp" | "wrong-sitemap-host" | "admin-open" | "db-down") {
  let port = 0;
  const secure = { "content-security-policy": "default-src 'self'; object-src 'none'; frame-ancestors 'none'", "x-frame-options": "DENY", "x-content-type-options": "nosniff" };
  const server = createServer((req, res) => {
    const u = req.url ?? "/";
    const send = (code: number, body = "", headers: Record<string, string> = {}) => { res.writeHead(code, { "content-type": "text/html", ...headers }); res.end(body); };
    if (u === "/api/health") return bad === "db-down" ? send(503, '{"status":"error"}', { "content-type": "application/json" }) : send(200, '{"status":"ok"}', { "content-type": "application/json" });
    if (u === "/robots.txt") return send(200, `User-agent: *\nDisallow: /admin\nSitemap: http://127.0.0.1:${port}/sitemap.xml\n`, { "content-type": "text/plain" });
    if (u === "/sitemap.xml") return send(200, `<urlset><url><loc>${bad === "wrong-sitemap-host" ? "http://localhost:3000" : `http://127.0.0.1:${port}`}/</loc></url></urlset>`, { "content-type": "application/xml" });
    if (u.startsWith("/admin")) return bad === "admin-open" ? send(200, "<h1>admin</h1>") : send(307, "", { location: "/admin/login" });
    if (u === "/api/admin/media") return req.method === "POST" ? send(403, "{}") : send(401, "{}");
    if (u.startsWith("/properties/")) return send(404, "<h1>tidak ada</h1>");
    return send(200, "<html><h1>halo</h1></html>", bad === "no-csp" ? { "x-frame-options": "DENY", "x-content-type-options": "nosniff" } : secure);
  });
  return { server, listen: () => new Promise<string>((r) => server.listen(0, "127.0.0.1", () => { port = (server.address() as AddressInfo).port; r(`http://127.0.0.1:${port}`); })) };
}

const servers: Server[] = [];
const urls: Record<string, string> = {};
before(async () => {
  for (const k of ["none", "no-csp", "wrong-sitemap-host", "admin-open", "db-down"] as const) {
    const m = mock(k); servers.push(m.server); urls[k] = await m.listen();
  }
});
after(() => { for (const s of servers) s.close(); });

// Harus asinkron: pemanggilan sinkron memblokir event loop proses ini, padahal server tiruan berjalan di proses yang sama.
const run = (url: string) => new Promise<{ status: number; stdout: string }>((resolve) =>
  execFile(process.execPath, ["scripts/smoke.mjs", url], { encoding: "utf8", timeout: 60_000 }, (err, stdout) => resolve({ status: err ? ((err as { code?: number }).code ?? 1) : 0, stdout })));

test("uji asap lulus pada situs yang sehat", async () => {
  const r = await run(urls.none);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Semua pemeriksaan lulus/);
});

test("uji asap gagal pada tiap kesalahan konfigurasi yang disengaja", async () => {
  const expect: Record<string, RegExp> = {
    "no-csp": /FAIL\s+header keamanan.*CSP/,
    "wrong-sitemap-host": /FAIL\s+(sitemap|robots)/,
    "admin-open": /FAIL\s+admin mengarahkan/,
    "db-down": /FAIL\s+health/,
  };
  for (const [k, re] of Object.entries(expect)) {
    const r = await run(urls[k]);
    assert.equal(r.status, 1, k);
    assert.match(r.stdout, re, k);
  }
});

test("alamat tidak valid ditolak", async () => {
  assert.equal((await run("bukan-url")).status, 2);
});
