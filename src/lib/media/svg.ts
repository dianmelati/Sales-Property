import { InvalidImageError } from "./process-image";

/**
 * SVG dari pengguna tidak pernah disimpan atau disajikan. Ia di-rasterisasi menjadi gambar (sehingga tidak ada skrip yang bisa berjalan),
 * dan SVG yang berisiko ditolak dulu supaya perenderan tidak membaca berkas atau jaringan.
 */
export function assertSafeSvg(text: string) {
  const bad = () => { throw new InvalidImageError("BAD_TYPE", "This SVG uses features that are not allowed. Export a plain SVG without scripts or external links."); };
  if (/<!doctype|<!entity|<script|<foreignobject|<iframe|<embed|<object|javascript:/i.test(text)) bad();
  if (/\son[a-z]+\s*=/i.test(text)) bad();
  for (const m of text.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    if (!/^(#|data:image\/(png|jpeg|webp);base64,)/i.test(m[1].trim())) bad();
  }
  for (const m of text.matchAll(/url\(\s*["']?([^)"']*)/gi)) {
    if (!/^(#|data:image\/(png|jpeg|webp);base64,)/i.test(m[1].trim())) bad();
  }
}
