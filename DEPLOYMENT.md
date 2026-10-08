# Deployment

> **Status jujur**: Dockerfile, `docker-compose.yml`, Caddyfile, dan skrip deploy di sini **belum pernah dijalankan** (tidak ada Docker di lingkungan pembuatan). Yang sudah diuji: skrip uji asap (terhadap server tiruan), sintaks skrip shell, validitas YAML, dan pemeriksaan dokumentasi variabel. Sebelum menganggap ini siap, lakukan deploy percobaan di server kosong dan ikuti bagian "Uji asap".

## 1. Gambaran
```
Pengunjung -> Caddy (HTTPS, :80/:443) -> Next.js (:3000, di dalam jaringan Docker) -> PostgreSQL
                  \-> /uploads/*  (volume bersama, hanya bila STORAGE_DRIVER=local)
Berkas foto/denah/model -> storage S3 atau R2 (disarankan) atau volume lokal
```
Prasyarat: server Linux (2 vCPU / 2 GB RAM cukup untuk mulai; pemrosesan gambar dan build butuh memori), Docker 24+ dengan Compose v2, domain yang A recordnya mengarah ke server, port 80 dan 443 terbuka, `package-lock.json` dan `prisma/migrations/` sudah di-commit (lihat langkah 3).

## 2. Variabel environment
Dibaca dari `.env` (Compose) atau environment hosting Anda. Contoh lengkap: `.env.example` (aplikasi) dan `.env.docker.example` (Compose). Skrip `npm run check:env` memastikan tabel ini tidak ketinggalan dari kode.

| Variabel | Wajib? | Fungsi dan catatan |
|---|---|---|
| `DATABASE_URL` | Ya | URL PostgreSQL. Di Compose diisi otomatis. Di serverless pakai URL pooler |
| `AUTH_SECRET` | Ya | Kunci penandatangan sesi, acak minimal 32 karakter (`openssl rand -base64 32`). Server menolak start di produksi bila lemah. Mengganti nilainya mengeluarkan semua pengguna |
| `NEXT_PUBLIC_SITE_URL` | Ya | Alamat publik **https**. Dipakai sitemap, canonical, data terstruktur, Open Graph. Ikut tertanam saat build, jadi ubah lalu build ulang |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | Saat seed | Akun super admin pertama. Password minimal 10 karakter; ganti di Admin > My account setelah login pertama |
| `WHATSAPP_SEED_NUMBER` | Opsional | Nomor WhatsApp awal (mis. 081383137988) bila belum ada di database. Selanjutnya diatur di Admin > Settings |
| `STORAGE_DRIVER` | Ya | `local` (volume disk) atau `s3`. **Gunakan `s3` di hosting serverless**, dan disarankan di mana pun |
| `STORAGE_ENDPOINT` | s3 non-AWS | Endpoint S3 (Cloudflare R2, MinIO, dst.). Kosongkan untuk AWS S3 |
| `STORAGE_REGION` | s3 | Region; `auto` untuk R2 |
| `STORAGE_BUCKET` | s3 | Nama bucket |
| `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | s3 | Kredensial. Beri hak minimum (tulis dan hapus objek di bucket ini saja). Tidak pernah dikirim ke browser |
| `STORAGE_PUBLIC_HOST` | s3 | Nama host publik tempat objek dibaca browser (CDN atau domain bucket), tanpa `https://`. Masuk ke CSP dan konfigurasi gambar |
| `STORE_ORIGINALS` | Opsional | `true` menyimpan file asli di samping varian WebP. File asli **tidak dibersihkan metadatanya** (EXIF/GPS) |
| `TRUSTED_IP_HEADER` | Disarankan | Header berisi IP klien yang diisi proxy tepercaya (`cf-connecting-ip`, `x-real-ip`, `x-vercel-forwarded-for`) |
| `TRUSTED_PROXY_HOPS` | Disarankan | Alternatifnya: jumlah proxy yang menambah `X-Forwarded-For` (1 di belakang Caddy). Tanpa salah satunya, pembatas laju berbasis IP dan IP di audit log nonaktif |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Opsional | Pembatas laju bersama antar instance. Tanpa ini pembatas hanya di memori per instance |
| `DOMAIN` | Compose | Nama domain untuk Caddy (sertifikat HTTPS otomatis) |
| `POSTGRES_PASSWORD` | Compose | Kata sandi database di Compose |

Variabel untuk pengujian (`TEST_DATABASE_URL`, `E2E_*`) dijelaskan di `TESTING.md`.

## 3. Persiapan sekali (di komputer pengembangan)
1. `npm install` lalu **commit `package-lock.json`** (Docker dan CI memakai `npm ci`).
2. `npm run typecheck && npm run build && npm run test:unit` harus lulus lebih dulu. Proyek ini dikembangkan tanpa kompilasi penuh, jadi kemungkinan ada galat tipe kecil.
3. Buat **migrasi awal** dari skema (belum ada di repositori): jalankan PostgreSQL lokal, set `DATABASE_URL`, lalu `npx prisma migrate dev --name init` dan **commit folder `prisma/migrations/`**. Produksi hanya memakai `prisma migrate deploy`, tidak pernah `migrate dev` atau `db push`.
4. Opsional tetapi disarankan: `prisma/sql/search-indexes.sql` (indeks pencarian teks) dijalankan sekali pada database produksi.

## 4. Opsi A: satu server dengan Docker Compose
```bash
git clone <repo> estate && cd estate
cp .env.docker.example .env && chmod 600 .env    # isi semua nilai
./scripts/deploy.sh --seed                       # --seed hanya pada instalasi pertama
```
Yang dilakukan skrip: menyalakan database, mencadangkan bila sudah berisi, `prisma migrate deploy`, seed (opsional), build image aplikasi, menyalakan semua layanan, lalu menjalankan uji asap.

**Penting: build membaca database.** `next build` merender beranda dan halaman indeks ke HTML, sehingga image dibangun dengan akses ke database (Compose memakai `network: host` ke `127.0.0.1:5432`). Dua akibat:
- Database harus sudah dimigrasi dan berisi **data yang sama dengan produksi** saat build. Membangun image di CI terhadap database lain berarti HTML hasil build berisi data CI selama beberapa menit pertama (sampai cache disegarkan, maksimal 5 menit atau saat admin menyimpan sesuatu).
- Karena itu paling aman membangun di server tujuan, seperti yang dilakukan `deploy.sh`.

**Pembaruan**: `git pull && ./scripts/deploy.sh`. Migrasi berjalan maju saja. Cadangan otomatis dibuat sebelum migrasi (`backups/pre-deploy-*.dump`). **Rollback kode**: `git checkout <tag-lama> && ./scripts/deploy.sh`; **rollback skema** tidak otomatis, pulihkan cadangan (bagian 7) bila migrasi bermasalah.

**Unggahan lokal**: dengan `STORAGE_DRIVER=local`, file ditulis ke volume Docker `uploads` dan disajikan langsung oleh Caddy di `/uploads/*`. Next.js tidak menyajikan berkas yang ditambahkan setelah build, jadi **tanpa Caddy (atau proxy setara) unggahan lokal tidak akan tampil**. Untuk produksi sungguhan pindah ke S3/R2 (bagian 6).

## 5. Opsi B: hosting terkelola (Vercel, dsb.). Belum diuji
Bisa, dengan syarat dan risiko berikut:
- `STORAGE_DRIVER=s3` wajib (tidak ada disk yang bisa ditulis).
- **Batas ukuran body permintaan** (sekitar 4,5 MB di Vercel) membuat unggah foto besar, PDF, dan model 3D gagal lewat rute upload saat ini. Perlu alur presigned URL langsung ke S3 (belum dibuat).
- Build membutuhkan `DATABASE_URL` ke database yang dapat dijangkau dari server build dan sudah dimigrasi (lihat peringatan data build di atas). Gunakan database terkelola (Neon, Supabase, RDS) dengan URL pooler untuk runtime.
- Cache ISR dan `unstable_cache` bersifat per instance; perubahan admin mungkin tidak langsung terlihat di semua instance. Isi `UPSTASH_REDIS_REST_URL` untuk pembatas laju bersama.
- Isi `TRUSTED_IP_HEADER` (`x-vercel-forwarded-for` di Vercel).
- Folder `Dockerfile`, `docker-compose.yml`, dan `deploy/` tidak dipakai.

## 6. Storage S3 / R2
1. Buat bucket; izinkan baca publik objek (atau layani lewat CDN). Objek bernama `media/<uuid>/...`.
2. Buat kredensial dengan izin `PutObject` dan `DeleteObject` pada bucket itu saja.
3. **CORS** (wajib agar viewer 3D bisa mengambil model dari domain berbeda):
```json
[{ "AllowedOrigins": ["https://contoh.id"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
```
4. Isi `STORAGE_DRIVER=s3`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT` (R2/MinIO), `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_HOST`.
5. Sajikan dari **domain terpisah tanpa cookie** (mis. `media.contoh.id`) supaya berkas unggahan (termasuk PDF) tidak pernah berbagi origin dengan sesi admin.
6. Memindahkan unggahan lokal yang sudah ada ke S3 tidak otomatis: salin `public/uploads/media/...` ke bucket dengan kunci yang sama (`media/...`); kunci yang tersimpan di database tidak berubah.

## 7. Database: cadangan dan pemulihan
- **Cadangan harian** (cron): `docker compose exec -T db pg_dump -U estate -Fc estate > backups/db-$(date -u +%F).dump`, atau `scripts/backup.sh` (juga mengarsipkan `public/uploads` bila lokal dan menyimpan 14 terakhir). **Salin hasilnya ke luar server** (S3, rclone, dsb.); cadangan di disk yang sama tidak melindungi dari kegagalan disk.
- Bila memakai S3, aktifkan versioning/replikasi di sisi penyedia untuk media.
- **Pemulihan**: `scripts/restore.sh backups/db-XXXX.dump` (meminta konfirmasi, menimpa data). **Uji pemulihan di database kosong sebelum go-live** dan jadwalkan ulang berkala; cadangan yang belum pernah dipulihkan belum bisa diandalkan.
- Penyedia database terkelola biasanya menyediakan point-in-time recovery; aktifkan.
- Lead berisi data pribadi: enkripsi cadangan, batasi aksesnya, dan tetapkan masa retensi (lihat `SECURITY.md`).

## 8. Setelah deploy pertama
1. Buka `/admin/login`, masuk dengan akun seed, **ganti password** di My account.
2. Admin > Settings: nomor WhatsApp, kontak, media sosial, menu, teks footer.
3. Admin > Homepage: ganti teks bawaan (terutama klaim di "Why choose us" dan "Services"), unggah gambar hero. Admin > Pages: tulis About dan Contact. Admin > SEO: judul, deskripsi, dan gambar berbagi beranda.
4. Admin > Locations: isi deskripsi dan foto sampul. Admin > Agents: tambah agen dan foto. Admin > Users: buat akun editor/agen, tautkan akun agen di profil agen.
5. Tambah properti pertama dan unggah foto. **Kategori properti belum punya halaman admin**: ubah daftar di `prisma/seed.ts` lalu jalankan ulang seed (aman diulang), atau tambah langsung di database.
6. Untuk pengembangan saja: `npm run db:seed:demo` mengisi 8 properti, 3 agen, lead, dan FAQ fiktif (menolak berjalan di produksi).

## 9. Uji asap
Segera setelah deploy: `npm run smoke -- https://contoh.id` (otomatis dijalankan oleh `deploy.sh`). Memeriksa health dan database, 8 halaman publik, header keamanan dan CSP, robots dan sitemap memakai domain yang benar, `/admin` mengarah ke login, API admin menolak tamu dan permintaan lintas situs, 404 yang ramah, dan HTTP ke HTTPS.

Uji manual yang tidak bisa diotomatisasi:
- [ ] Login admin, buat properti, unggah foto (JPG, PNG, HEIC) dan lihat versi WebP di halaman publik
- [ ] Unggah satu PDF denah, satu SVG denah, dan satu model .glb; buka viewer 3D di ponsel dan laptop
- [ ] Kirim inquiry dari halaman properti dan dari /contact; lead muncul di admin
- [ ] Klik tombol WhatsApp; nomor dan pesan benar
- [ ] Akun EDITOR dan AGENT: coba buka halaman di luar izin; agen hanya melihat lead miliknya
- [ ] Ekspor CSV lead dan buka di Excel
- [ ] Bagikan satu URL properti ke WhatsApp/Facebook dan lihat pratinjaunya
- [ ] Jalankan Lighthouse (`lighthouserc.json`) dan cek Search Console setelah mengirim sitemap
- [ ] Pulihkan cadangan ke database kosong dan jalankan uji asap terhadapnya

## 10. Operasional
- **Log**: `docker compose logs -f app`. Baris `{"type":"web-vital",...}` adalah sampel Core Web Vitals pengunjung; kirim log ke layanan log Anda untuk dianalisis. Kesalahan upload dan audit juga tercatat di sana.
- **Pantau**: arahkan pemantau uptime ke `/api/health` (200 bila aplikasi dan database sehat, 503 bila database gagal).
- **Rotasi rahasia**: mengganti `AUTH_SECRET` mengeluarkan semua pengguna (aman, tinggal login lagi). Mengganti kredensial S3: buat yang baru, ubah env, restart, hapus yang lama.
- **Pembaruan dependensi**: Dependabot membuat PR mingguan; jalankan CI sebelum menggabungkan.
- **Sumber daya**: pemrosesan gambar (sharp, HEIC) memakai CPU dan memori sesaat; jangan pakai instance di bawah 1 GB RAM.

## 11. Daftar periksa go-live
Gabungan dari `SECURITY.md` dan `TESTING.md`:
- [ ] `npm run typecheck`, `npm run build`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run check:security`, dan `npm run check:env` lulus
- [ ] `npm audit --omit=dev` ditinjau
- [ ] `AUTH_SECRET` acak panjang, `NEXT_PUBLIC_SITE_URL` https, `TRUSTED_IP_HEADER` atau `TRUSTED_PROXY_HOPS` terisi sesuai proxy
- [ ] `STORAGE_DRIVER=s3` di domain terpisah dengan CORS; atau Caddy menyajikan `/uploads`
- [ ] Migrasi di-commit dan diterapkan dengan `migrate deploy`; indeks pencarian dijalankan
- [ ] Cadangan terjadwal, tersalin ke luar server, dan **pemulihan sudah diuji**
- [ ] Password seed diganti; akun super admin tidak dibagi; pertimbangkan 2FA lewat penyedia identitas (belum ada di aplikasi)
- [ ] Teks bawaan CMS diganti dengan konten dan klaim yang benar; kebijakan privasi dan retensi data lead ditetapkan
- [ ] Uji asap lulus dan daftar uji manual di atas selesai
- [ ] Pemantau uptime aktif, log tersimpan
