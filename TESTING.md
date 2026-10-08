# Pengujian

## Apa yang sudah dijalankan, dan apa yang belum
Pada saat Fase 14 dibuat, lingkungan pembuatan tidak punya PostgreSQL, Next.js, Prisma, zod, atau sanitize-html, dan tidak ada akses jaringan. Jadi:

| Lapisan | Lokasi | Status |
|---|---|---|
| **Unit (logika murni)** | `test/unit/` | **Dijalankan: 58 tes lulus.** Termasuk pipeline gambar dengan sharp sungguhan, skrip uji asap terhadap server tiruan (lulus pada situs sehat, gagal pada empat kesalahan konfigurasi), dan pemeriksa dokumentasi env |
| Unit (butuh zod, sanitize-html) | `test/unit-deps/` | Ditulis dan diperiksa sintaksnya, **belum dijalankan** |
| Integrasi (PostgreSQL) | `test/integration/` | Ditulis, **belum dijalankan** (dilewati tanpa `TEST_DATABASE_URL`) |
| End-to-end (Playwright) | `e2e/` | Ditulis; konfigurasi dimuat dan 19 tes terdaftar, **belum dijalankan** terhadap aplikasi |
| Pemeriksaan keamanan statis | `scripts/check-security.mjs` | Dijalankan, lulus, dan sudah diuji menolak pelanggaran buatan |
| Cek tipe seluruh proyek | (sekali jalan) | Dijalankan dengan stub tipe; tidak ada galat nyata, tetapi lihat batasannya di bawah |
| CI | `.github/workflows/ci.yml` | Ditulis, **belum pernah berjalan** |

Tes yang belum dijalankan bisa saja berisi kesalahan (selektor, asumsi teks). Perlakukan kegagalan pertama di lingkungan Anda sebagai kemungkinan kesalahan tes sekaligus kesalahan kode.

## Menjalankan
```bash
npm install
npm run test:unit                      # unit, tanpa database
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/estate_test \
  npx prisma db push && npm run test:integration   # nama database harus memuat "test"
npm run build && npm run db:seed && npm run test:e2e
npm run typecheck && npm run typecheck:test && npm run check:security
```
Tes e2e memakai akun super admin dari seed (`E2E_ADMIN_EMAIL` dan `E2E_ADMIN_PASSWORD`, otomatis memakai `ADMIN_SEED_*` bila ada) dan membuat akun EDITOR dan AGENT sendiri. **Jalankan hanya pada database tes**: tes membuat properti, lead, pengguna, dan agen.

## Yang dicakup
- **Keamanan**: hash password dan upgrade-nya, izin per role (daftar tertutup untuk AGENT), IP klien tidak bisa dipalsukan, pembatas laju, tautan CMS, sel CSV berawalan rumus, validasi GLB (berkas luar, KTX2), SVG berbahaya, deteksi tipe dari isi file, EXIF dibuang, gambar rusak/terpotong/terlalu besar, validasi konfigurasi produksi, header CSP, 401/403 pada API admin, lingkup lead per agen di tingkat database.
- **Perilaku**: filter pencarian dan filter lead, format harga, nomor WhatsApp (termasuk 081383137988), slug, URL varian, tata letak beranda bawaan, alur menerbitkan properti sampai lead terlihat di admin, favorit dan perbandingan, halaman publik tanpa galat JavaScript, 404 yang ramah.
- **Regresi**: skrip keamanan statis diuji sendiri (mendeteksi aksi tanpa izin, route admin tanpa `apiAuth`, SQL mentah, `innerHTML` tanpa sanitasi, rahasia di `NEXT_PUBLIC_`, `x-forwarded-for` langsung).

## Yang tidak dicakup (celah yang diketahui)
- **Aksi server dan route handler** diuji secara tidak langsung (pemeriksaan statis memastikan izin dipanggil, e2e menguji beberapa jalurnya), tetapi tidak ada tes per aksi untuk setiap kombinasi role. Perlu tes integrasi dengan konteks Next.js (cookie, header) atau lebih banyak tes e2e.
- **Unggah lewat HTTP**: pipeline gambar diuji langsung; endpoint upload, denah PDF/SVG utuh, dan model GLB utuh melalui browser belum diuji. Rendering SVG ke gambar oleh sharp tidak diuji dengan SVG sungguhan.
- **Viewer 3D**: tidak ada tes. Perlu browser dengan WebGL dan model contoh; sebaiknya uji manual di perangkat kelas bawah.
- **Storage S3**: tidak diuji (hanya driver lokal secara tidak langsung).
- **Pembatas laju Redis (Upstash)**: tidak diuji; hanya jalur memori.
- **Aksesibilitas** otomatis (axe), pengujian visual, dan beban/stres belum ada. Lighthouse CI dikonfigurasi di `lighthouserc.json` tetapi belum dijalankan.
- **Cek tipe**: dilakukan dengan stub, sehingga hasil Prisma dan zod diperlakukan sebagai `any`. Kesalahan nama kolom atau bentuk data Prisma tidak akan tertangkap; `npm run typecheck` dengan paket asli adalah pemeriksaan yang sebenarnya dan **belum pernah dijalankan**.
- **Ketahanan**: tidak ada tes untuk kegagalan database/storage di tengah operasi (misalnya pembersihan objek bila penyimpanan metadata gagal).

## Temuan dari pengujian
- Gambar yang terpotong lolos pemeriksaan header lalu menyebabkan galat mentah (pengguna melihat "upload gagal" 500). Diperbaiki: sekarang 422 dengan pesan jelas. Tes: `process-image.test.ts`.
