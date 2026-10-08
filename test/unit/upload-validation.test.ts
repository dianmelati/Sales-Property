import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectModel } from "@/server/media/glb";
import { assertSafeSvg } from "@/lib/media/svg";
import { InvalidImageError, sniffMime } from "@/lib/media/process-image";

function glb(json: unknown, tweak?: { version?: number; extra?: number; rawJson?: string }) {
  let text = tweak?.rawJson ?? JSON.stringify(json);
  while (Buffer.byteLength(text) % 4) text += " ";
  const body = Buffer.from(text);
  const total = 12 + 8 + body.length;
  const b = Buffer.alloc(total + (tweak?.extra ?? 0));
  b.writeUInt32LE(0x46546c67, 0); b.writeUInt32LE(tweak?.version ?? 2, 4); b.writeUInt32LE(total, 8);
  b.writeUInt32LE(body.length, 12); b.writeUInt32LE(0x4e4f534a, 16); body.copy(b, 20);
  return b;
}
const code = (c: string) => (e: unknown) => e instanceof InvalidImageError && e.code === c;
const ok = { asset: { version: "2.0" } };

test("GLB valid diterima", () => {
  assert.deepEqual(inspectModel(glb(ok)), { ext: "glb", mime: "model/gltf-binary" });
  assert.equal(inspectModel(glb({ ...ok, buffers: [{ byteLength: 4 }], images: [{ uri: "data:image/png;base64,AAAA" }] })).ext, "glb");
});

test("GLB: versi, panjang, dan JSON rusak ditolak", () => {
  assert.throws(() => inspectModel(glb(ok, { version: 1 })), code("BAD_TYPE"));
  assert.throws(() => inspectModel(glb(ok, { extra: 1 })), code("UNREADABLE"));
  assert.throws(() => inspectModel(glb(null, { rawJson: "{bukan json" })), code("UNREADABLE"));
  assert.throws(() => inspectModel(glb({ asset: { version: "1.0" } })), code("BAD_TYPE"));
  assert.throws(() => inspectModel(Buffer.from("kecil")), code("UNREADABLE"));
});

test("GLB: berkas luar dan tekstur KTX2 ditolak", () => {
  assert.throws(() => inspectModel(glb({ ...ok, buffers: [{ uri: "scene.bin" }] })), code("BAD_TYPE"));
  assert.throws(() => inspectModel(glb({ ...ok, images: [{ uri: "http://evil.example/x.png" }] })), code("BAD_TYPE"));
  assert.throws(() => inspectModel(glb({ ...ok, images: [{ uri: "//evil.example/x.png" }] })), code("BAD_TYPE"));
  assert.throws(() => inspectModel(glb({ ...ok, extensionsRequired: ["KHR_texture_basisu"] })), code("BAD_TYPE"));
  assert.equal(inspectModel(glb({ ...ok, extensionsRequired: ["KHR_draco_mesh_compression"] })).ext, "glb");
});

test("glTF teks: hanya yang mandiri", () => {
  assert.deepEqual(inspectModel(Buffer.from(JSON.stringify({ ...ok, buffers: [{ uri: "data:application/octet-stream;base64,AAAA" }] }) + " ".repeat(20))), { ext: "gltf", mime: "model/gltf+json" });
  assert.throws(() => inspectModel(Buffer.from(JSON.stringify({ ...ok, buffers: [{ uri: "model.bin" }] }) + " ".repeat(20))), code("BAD_TYPE"));
  assert.throws(() => inspectModel(Buffer.from("<html>bukan model</html>" + " ".repeat(30))), code("BAD_TYPE"));
});

test("SVG aman diterima", () => {
  assertSafeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><rect width="10" height="10" fill="url(#g)"/><use href="#a"/></svg>');
  assertSafeSvg('<svg><image href="data:image/png;base64,AAAA"/></svg>');
});

test("SVG berbahaya ditolak", () => {
  const bad = [
    "<svg><script>alert(1)</script></svg>", '<svg onload="alert(1)"></svg>', '<svg><rect onclick = "x()"/></svg>',
    "<svg><foreignObject><div/></foreignObject></svg>", '<!DOCTYPE svg SYSTEM "x"><svg/>', '<!ENTITY xxe SYSTEM "file:///etc/passwd">',
    '<svg><a href="javascript:alert(1)"/></svg>', '<svg><image href="http://evil.example/x.png"/></svg>',
    '<svg><image xlink:href="file:///etc/passwd"/></svg>', '<svg><rect style="fill:url(http://evil.example/x)"/></svg>',
    '<svg><image href="data:image/svg+xml;base64,AAAA"/></svg>', "<svg><iframe src=x /></svg>",
  ];
  for (const s of bad) assert.throws(() => assertSafeSvg(s), code("BAD_TYPE"), s);
});

test("sniffMime membaca isi file, bukan ekstensi", () => {
  assert.equal(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), "image/jpeg");
  assert.equal(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0])), "image/png");
  assert.equal(sniffMime(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(8)])), "image/heic");
  assert.equal(sniffMime(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypmp42"), Buffer.alloc(8)])), null);
  assert.equal(sniffMime(Buffer.from("<html><script>alert(1)</script></html>")), null);
  assert.equal(sniffMime(Buffer.from("GIF89a" + "x".repeat(20))), null);
  assert.equal(sniffMime(Buffer.alloc(4)), null);
});
