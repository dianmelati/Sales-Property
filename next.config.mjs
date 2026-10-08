const isProd = process.env.NODE_ENV === "production";
const storage = process.env.STORAGE_PUBLIC_HOST ? `https://${process.env.STORAGE_PUBLIC_HOST}` : "";

/**
 * Content-Security-Policy.
 * Catatan jujur: 'unsafe-inline' pada script-src tetap diperlukan. Halaman publik di-cache (ISR), jadi tidak bisa memakai nonce per
 * permintaan, dan Next.js menyisipkan skrip inline untuk hidrasi. Perlindungan utama terhadap XSS ada di sanitasi input dan escaping
 * (lihat SECURITY.md); CSP ini membatasi ke mana data bisa dikirim, memblokir plugin dan framing, dan memaksa HTTPS.
 * Untuk CSP berbasis nonce, ubah halaman publik ke rendering dinamis (mengorbankan cache).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`.trim(),
  "font-src 'self' data:",
  // gstatic: dekoder Draco untuk model 3D berkompresi (drei memuatnya dari sana kecuali di-host sendiri).
  `connect-src 'self' https://www.gstatic.com ${storage}`.trim(),
  `media-src 'self' blob: ${storage}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const withAnalyzer = process.env.ANALYZE === "true" ? (await import("@next/bundle-analyzer")).default({ enabled: true }) : (c) => c;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: "standalone", // build mandiri untuk Docker (node server.js)
  transpilePackages: ["three"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: process.env.STORAGE_PUBLIC_HOST ? [{ protocol: "https", hostname: process.env.STORAGE_PUBLIC_HOST }] : [],
  },
  async headers() {
    return [
      // Semua halaman kecuali /uploads: CSP + X-Frame-Options. (CSP sengaja tidak dipasang pada berkas upload agar penampil PDF peramban tetap bekerja.)
      { source: "/((?!uploads/).*)", headers: [...baseHeaders, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: csp }] },
      // Berkas upload (driver lokal): nama memuat UUID unik, jadi aman di-cache selamanya.
      { source: "/uploads/:path*", headers: [...baseHeaders, { key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};
export default withAnalyzer(nextConfig);
