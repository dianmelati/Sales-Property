import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { InvalidImageError, processImage } from "@/lib/media/process-image";

const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#7a8a88" } }).png().toBuffer();
const code = (c: string) => (e: unknown) => e instanceof InvalidImageError && e.code === c;

test("menghasilkan empat varian WebP, ukuran tidak diperbesar", async () => {
  const r = await processImage(await png(1000, 800));
  assert.deepEqual(Object.keys(r.variants).sort(), ["large", "medium", "small", "thumbnail"]);
  for (const v of Object.values(r.variants)) assert.equal((await sharp(v.buffer).metadata()).format, "webp");
  assert.equal(r.variants.thumbnail.width, 320);
  assert.equal(r.variants.small.width, 640);
  assert.equal(r.variants.medium.width, 1000); // sumber 1000 px, tidak diperbesar ke 1280
  assert.equal(r.variants.large.width, 1000);
  assert.equal(r.sourceMime, "image/png");
  assert.deepEqual([r.width, r.height], [1000, 800]);
  assert.match(r.blurDataUrl, /^data:image\/webp;base64,/);
});

test("metadata EXIF (hak cipta, orientasi) tidak ikut ke hasil", async () => {
  const jpg = await sharp({ create: { width: 1000, height: 900, channels: 3, background: "#445" } }).jpeg().withExif({ IFD0: { Copyright: "RAHASIA-PEMILIK", Artist: "Seseorang" } }).toBuffer();
  assert.ok((await sharp(jpg).metadata()).exif, "fixture seharusnya memuat EXIF");
  const r = await processImage(jpg);
  for (const v of Object.values(r.variants)) {
    const m = await sharp(v.buffer).metadata();
    assert.equal(m.exif, undefined);
    assert.ok(!v.buffer.includes(Buffer.from("RAHASIA-PEMILIK")));
  }
});

test("orientasi EXIF diterapkan: foto potret dari kamera tidak menjadi miring", async () => {
  const jpg = await sharp({ create: { width: 1000, height: 800, channels: 3, background: "#889" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const r = await processImage(jpg);
  assert.deepEqual([r.width, r.height], [800, 1000]);
  const m = await sharp(r.variants.large.buffer).metadata();
  assert.ok(m.height! > m.width!);
});

test("gambar terlalu kecil ditolak, denah boleh lebih kecil", async () => {
  const small = await png(500, 400);
  await assert.rejects(processImage(small), code("BAD_DIMENSIONS"));
  const r = await processImage(small, { plan: true, minSide: 300 });
  assert.equal(r.variants.large.width, 500);
});

test("bukan gambar, terlalu besar, atau rusak", async () => {
  await assert.rejects(processImage(Buffer.from("<html><script>alert(1)</script></html>".padEnd(64))), code("BAD_TYPE"));
  await assert.rejects(processImage(Buffer.alloc(26 * 1024 * 1024)), code("TOO_LARGE"));
  await assert.rejects(processImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)])), code("UNREADABLE"));
  const whole = await png(1200, 1000);
  await assert.rejects(processImage(whole.subarray(0, Math.floor(whole.length * 0.5))), code("UNREADABLE")); // terpotong
});
