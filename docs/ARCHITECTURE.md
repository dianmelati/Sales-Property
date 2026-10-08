# Arsitektur

Aplikasi Next.js 15 (App Router) tunggal: situs publik, panel admin, dan API berada di satu proyek dan satu database PostgreSQL. Diagram relasi tabel: [ERD.md](ERD.md) (dibuat otomatis dari skema).

## Struktur folder
```
src/app/                  rute: halaman publik, /admin, /api, sitemap, robots
  admin/(panel)/          panel admin (layout memeriksa login; setiap halaman memeriksa izin)
  api/                    route handler (admin: unggah, ekspor; publik: tampilan, banding, vitals, health)
src/components/           komponen UI bersama (kartu, galeri, viewer 3D, editor, bagan SVG)
src/lib/                  logika murni tanpa database: auth (password, token, RBAC), media (gambar, SVG, URL), CMS, filter, format
src/server/               logika server dengan database: aksi admin per domain, query publik, SEO, lead, audit
prisma/                   skema, seed dasar, seed demo, SQL indeks pencarian
test/ e2e/                tes unit/integrasi dan end-to-end;  scripts/  pemeriksaan keamanan, env, uji asap, ERD, backup
deploy/ Dockerfile docker-compose.yml   deployment satu server
```
Aturan: `src/lib` tidak mengimpor Prisma (supaya bisa diuji tanpa database). `src/server` yang berbicara dengan database. Komponen klien tidak mengimpor `src/server` kecuali memanggil aksi server.

## Alur permintaan
- **Publik**: halaman beranda, detail properti, lokasi, agen, About, Contact di-cache (ISR, 5 menit) dan dibuang saat admin menyimpan (`revalidatePublic()`). `/properties` dinamis dengan cache data 2 menit per kombinasi filter. Jumlah tampilan dihitung terpisah lewat `POST /api/properties/view`.
- **Admin**: middleware menolak permintaan tanpa sesi ke `/admin/*` (lapisan pertama). Setiap aksi server dan route handler memanggil `requirePermission()` atau `apiAuth()` sendiri (lapisan sebenarnya), dan `npm run check:security` memverifikasinya.
- **Mutasi**: aksi server (formulir, validasi Zod, Prisma, audit, revalidasi). Unggahan besar lewat route handler (`/api/admin/media`, `/floor-plans`, `/models`) agar ada progres.

## Autentikasi dan otorisasi
Sesi: JWT HS256 di cookie `httpOnly`, `SameSite=Strict`, `__Host-` di produksi, 8 jam. Setiap permintaan memvalidasi ulang ke database (akun aktif, role terbaru, `sessionsValidAfter`). Password: scrypt N=32768, di-upgrade saat login. RBAC: peta role ke izin di `src/lib/auth/permissions.ts` (SUPER_ADMIN, ADMIN, EDITOR, AGENT), disalin ke tabel oleh seed. Role AGENT dibatasi ke lead yang ditugaskan padanya (`src/server/leads/scope.ts`).

## Media
`StorageDriver` (`src/lib/media/storage.ts`): `local` atau `s3`. Gambar: `processImage()` memvalidasi isi file (bukan ekstensi), mengonversi HEIC, memutar sesuai EXIF, membuang metadata, dan membuat empat varian WebP plus blur placeholder; dibatasi ukuran dan total piksel. Denah: PNG/JPG lewat pipeline yang sama, SVG ditolak bila berbahaya lalu di-rasterisasi (tidak pernah disimpan), PDF disimpan apa adanya. Model 3D: `inspectModel()` memvalidasi GLB/glTF mandiri. Semua pintu masuk berakhir di `src/server/media/ingest.ts`.

## CMS
Beranda tersusun dari `PageSection` (tipe: hero, properti, lokasi, why us, services, agen, testimoni, FAQ, insights, CTA) dengan isi JSON yang divalidasi Zod per tipe (`src/lib/cms/schemas.ts`). Pengaturan situs (WhatsApp, kontak, sosial, menu, footer, teks About/Contact) di tabel `SiteSetting`. Menambah tipe seksi baru: tambah di `types.ts`, `schemas.ts`, form admin, dan renderer.

## API
| Rute | Metode | Akses | Fungsi |
|---|---|---|---|
| `/api/admin/media` | GET, POST | media:read / media:write | daftar dan unggah foto |
| `/api/admin/media/[id]` | PATCH, DELETE | media:write / media:delete | ganti nama, alt, hapus |
| `/api/admin/floor-plans` | POST | property:write | unggah atau ganti denah |
| `/api/admin/models` | POST | property:write | unggah atau ganti model 3D |
| `/api/admin/leads/export` | GET | lead:read (lingkup agen) | CSV lead |
| `/api/properties/by-slug` | GET | publik, dibatasi laju | kartu untuk favorit |
| `/api/properties/compare` | GET | publik, dibatasi laju | data banding (maks. 3) |
| `/api/properties/view` | POST | publik, dibatasi laju | hitung tampilan |
| `/api/vitals` | POST | publik, dibatasi laju | sampel Core Web Vitals ke log |
| `/api/health` | GET | publik | kesehatan aplikasi dan database |

Respons JSON seragam: `{ ok: true, data }` atau `{ ok: false, error: { code, message } }`, selalu `no-store`. Operasi CRUD lain (properti, agen, lokasi, CMS, lead, pengguna) memakai aksi server, bukan REST.

## Titik perluasan (fitur masa depan)
| Fitur | Di mana disambungkan |
|---|---|
| Model 3D otomatis dari denah, AI | `ingestModel()` adalah satu-satunya pintu masuk model; hasil generator cukup memanggilnya |
| Deskripsi properti dengan AI | tombol di langkah Description pada `property-form.tsx` memanggil aksi server baru; simpan lewat `sanitizeDescription` |
| Peningkatan gambar | langkah tambahan sebelum `processImage()` di `ingestImage()` |
| Notifikasi email/WhatsApp untuk lead | setelah `prisma.lead.create` di `src/server/leads/actions.ts` |
| Akun pelanggan dan alert properti | tabel baru dan `getCurrentUser`/middleware terpisah; favorit sudah memakai `createListStore` yang bisa dipindah ke server |
| Multi-bahasa, multi-mata uang | `Property.currency` sudah ada; teks UI masih di komponen (perlu ekstraksi), filter harga belum memperhatikan mata uang |
| Pembatas laju bersama | sudah mendukung Redis (Upstash) lewat env |
| Kalkulator KPR/investasi, penilaian properti | komponen klien baru di halaman detail |
