# Keamanan

Dokumen ini mencatat apa yang diperiksa pada Fase 13, apa yang diperbaiki, dan **batasan yang masih ada**. Peninjauan dilakukan lewat pembacaan kode dan pemeriksaan statis (`npm run check:security`). **Belum ada uji penetrasi, `npm audit`, atau pengujian di browser/server sungguhan**; semuanya perlu dijalankan sebelum produksi (lihat daftar di bawah).

## Melaporkan kerentanan
Kirim detail ke alamat kontak keamanan Anda sendiri (isi di sini sebelum publikasi) dan jangan membuat isu publik.

## Temuan dan perbaikan

| # | Temuan | Dampak | Status |
|---|---|---|---|
| 1 | `X-Forwarded-For` dibaca langsung untuk pembatas laju dan audit | Penyerang memalsukan header untuk melewati batas login/unggahan dan memalsukan IP di audit | Diperbaiki: hanya dipercaya lewat `TRUSTED_IP_HEADER` atau `TRUSTED_PROXY_HOPS` (`src/lib/client-ip.ts`). Tanpa konfigurasi, IP dianggap tidak diketahui dan batas berbasis IP dimatikan (batas per akun tetap aktif) |
| 2 | Pembatas laju hanya di memori per instance | Batas bisa dilewati dengan beberapa instance atau restart | Dikurangi: dukungan Redis bersama (Upstash) lewat env; tanpa itu tetap per instance |
| 3 | Tidak ada Content-Security-Policy | Tidak ada lapisan kedua terhadap XSS, framing, dan eksfiltrasi | Ditambahkan (`next.config.mjs`). **Masih memakai `'unsafe-inline'` untuk skrip** karena halaman di-cache (lihat batasan) |
| 4 | Cookie sesi `SameSite=Lax`, tanpa awalan `__Host-` | CSRF dan penimpaan cookie dari subdomain | Diperbaiki: `SameSite=Strict`, `__Host-` di produksi |
| 5 | Pemeriksaan asal hanya lewat `Origin` | Permintaan tanpa `Origin` lolos | Diperbaiki: `Sec-Fetch-Site` juga diperiksa; `X-Forwarded-Host` dipertimbangkan di belakang proxy |
| 6 | Hash password scrypt N=16384 | Kurang tahan terhadap serangan offline bila database bocor | Diperbaiki: N=32768, parameter disimpan dalam hash, hash lama otomatis di-upgrade saat login |
| 7 | Tidak ada cara mengganti password sendiri | Password awal dari seed bertahan lama | Diperbaiki: Admin > My account; mencabut sesi di perangkat lain |
| 8 | `AUTH_SECRET` contoh di `.env.example` lolos pemeriksaan panjang | Rahasia lemah bisa terpakai di produksi | Diperbaiki: nilai contoh ditolak; server menolak start di produksi dengan konfigurasi tidak aman (`src/lib/env-check.ts`) |
| 9 | `saveProperty` tidak memeriksa agen yang dipilih | Error 500 dan data tidak konsisten | Diperbaiki |
| 10 | Batas dimensi gambar ada, batas total piksel tidak | "Decompression bomb" memakan memori | Diperbaiki: maksimum 100 juta piksel di semua pemrosesan sharp |
| 11 | Audit log tidak mencatat IP kecuali login | Sulit menelusuri | Diperbaiki: IP diisi otomatis; penolakan izin (`auth.forbidden`) dan gagal ganti password juga dicatat |
| 12 | Respons API admin dapat di-cache | Data pribadi tersimpan di cache perantara | Diperbaiki: `Cache-Control: no-store` |
| 13 | Tautan sosial di footer tidak diperiksa saat tampil | Skema berbahaya bila database diubah | Diperbaiki: hanya `https://` |

## Yang sudah benar saat ditinjau
- Setiap aksi server admin dan route handler `/api/admin/*` memeriksa izin sendiri (middleware hanya lapisan pertama). **Diverifikasi otomatis** oleh `npm run check:security`, yang juga gagal bila ada SQL mentah, `dangerouslySetInnerHTML` tanpa sanitasi, rahasia di `NEXT_PUBLIC_`, atau pembacaan `x-forwarded-for` langsung.
- Data lead dibatasi per agen untuk role AGENT (daftar, detail, ekspor, dashboard); agen tidak bisa memindahkan lead.
- Semua query lewat Prisma terparameter. Deskripsi properti disanitasi saat disimpan dan saat ditampilkan. Tautan CMS divalidasi dua kali. JSON-LD di-escape.
- Unggahan: jenis file dicek dari isi, ukuran dibatasi, SVG tidak pernah disimpan atau disajikan, GLB tidak boleh merujuk berkas luar, nama berkas disanitasi, penulisan storage lokal dijaga dari path traversal.
- Kegagalan login tidak membedakan akun yang ada atau tidak (waktu respons disamakan), dengan batas per email dan per IP.

## Batasan yang diketahui (belum diselesaikan)
1. **CSP masih mengizinkan skrip inline.** Halaman publik di-cache (ISR) sehingga tidak bisa memakai nonce. Opsi: jadikan halaman publik dinamis dan pakai CSP nonce, dengan mengorbankan cache.
2. **Dekoder Draco dimuat dari `gstatic.com`** (diizinkan di CSP). Host sendiri untuk menghilangkan ketergantungan ini.
3. **PDF denah dan unggahan lain disajikan dari origin yang sama** (driver lokal). Di produksi pakai storage di domain terpisah tanpa cookie (S3/R2 + CDN), sehingga berkas unggahan tidak bisa menyentuh sesi admin.
4. **Sesi berupa JWT tanpa daftar sesi di server.** Pencabutan bekerja lewat `sessionsValidAfter` (reset password) dan status akun, tetapi admin tidak bisa mencabut satu sesi tertentu. Tidak ada rotasi `AUTH_SECRET` tanpa memutus semua sesi.
5. **Tidak ada autentikasi dua faktor.** Sangat disarankan untuk super admin sebelum produksi.
6. **Tidak ada penguncian akun**, hanya pembatas laju per email dan IP.
7. **Pencegahan spam formulir publik** hanya honeypot dan batas laju. Tidak ada CAPTCHA.
8. **Audit log tidak kebal ubah di tingkat database.** Aplikasi tidak menyediakan ubah atau hapus, tetapi pengguna database dengan hak tulis bisa. Batasi hak itu atau kirim log ke penyimpanan terpisah.
9. **Pembatas laju per instance** bila Redis tidak dikonfigurasi.
10. **Kebijakan data pribadi belum ada.** Lead berisi nama, telepon, email. Tentukan masa retensi dan penghapusan sesuai hukum setempat (di Indonesia, UU PDP). Situs publik tidak memasang cookie pelacak; favorit dan banding memakai `localStorage` di perangkat.
11. **Dependensi belum diaudit** (`npm audit` tidak bisa dijalankan saat pembuatan). Dependabot dikonfigurasi di `.github/dependabot.yml`.

## Daftar periksa sebelum produksi
- [ ] `npm audit --omit=dev` bersih (atau temuan dinilai) dan `package-lock.json` di-commit
- [ ] `AUTH_SECRET` acak panjang; `ADMIN_SEED_PASSWORD` diganti lewat My account setelah login pertama
- [ ] `TRUSTED_IP_HEADER` atau `TRUSTED_PROXY_HOPS` diisi sesuai proxy; Redis untuk pembatas laju bila multi-instance
- [ ] `NEXT_PUBLIC_SITE_URL` berupa https; storage `s3` di domain terpisah; CORS bucket hanya untuk domain situs
- [ ] Database: pengguna aplikasi tanpa hak DDL, backup terenkripsi, akses jaringan dibatasi
- [ ] Uji manual: akses `/admin` tanpa login, role EDITOR dan AGENT mencoba membuka halaman dan aksi di luar izinnya, unggah file palsu (ekstensi .jpg berisi HTML, SVG berskrip, GLB merujuk berkas luar), CSV dengan sel berawalan `=`
- [ ] Pindai dengan alat dinamis (mis. OWASP ZAP) pada lingkungan staging
- [ ] 2FA untuk akun super admin (belum ada di aplikasi; pertimbangkan penyedia identitas)
