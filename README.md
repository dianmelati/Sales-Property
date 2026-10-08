# Estate: platform agen properti (Fase 1-2)

## Status
| Fase | Isi | Status |
|---|---|---|
| 1 | Design system + beranda | Selesai (beranda, token warna/tipografi) |
| 2 | Database + auth | Selesai: login admin, sesi, RBAC, rate limit, audit log, dashboard dasar |
| 4 | Pipeline gambar | `src/lib/media/process-image.ts` selesai. Driver S3 dan endpoint upload belum |
| 3 | Manajemen properti | Selesai: daftar (cari/filter/urut/halaman), form 6 langkah, rich text, SEO, hapus lunak, publish |
| 4 | Media upload + WebP | Selesai: upload (progres), pipeline WebP 4 ukuran, Media Library, foto properti |
| 5 | Listing publik | Selesai: /properties dengan filter URL, grid/list, urutan, paginasi; /favorites |
| 6 | Detail properti | Selesai: galeri + lightbox, spesifikasi, deskripsi, fitur, lokasi, agen, form inquiry, WhatsApp, serupa, metadata + JSON-LD |
| 7 | CMS | Selesai: seksi beranda yang bisa diedit/diurutkan/disembunyikan, testimoni, FAQ, pengaturan situs (WhatsApp, kontak, sosial, menu, footer) |
| 8 | Lead + agen + dashboard | Selesai: daftar lead (filter, CSV), detail + catatan + riwayat, penugasan, tambah lead manual, CRUD agen, dashboard dengan grafik |
| 8b | Users + Audit logs | Selesai: kelola pengguna dan role, pencabutan sesi, log audit dengan filter |
| 9 | Denah | Selesai: upload PNG/JPG/SVG/PDF, banyak denah per properti, viewer publik |
| 10 | Viewer 3D | Selesai: upload GLB/GLTF, kamera dan cahaya default, viewer React Three Fiber yang dimuat lazy, fallback perangkat lemah |
| 11 | SEO + halaman publik | Selesai: sitemap, robots, metadata, data terstruktur, admin SEO, /locations, /agents, /about, /contact, /compare |
| 12 | Performa | Selesai: ISR dengan revalidasi saat admin menyimpan, cache pencarian, pelacakan tampilan terpisah, indeks, Web Vitals, bundle analyzer |
| 13 | Keamanan | Selesai: tinjauan kode, CSP, IP klien tepercaya, rate limit Redis, scrypt kuat, ganti password sendiri, pemeriksaan statis. Lihat SECURITY.md |
| 14 | Pengujian | Selesai sebagian: 50 tes unit dijalankan dan lulus; integrasi, e2e, dan CI ditulis tetapi belum dijalankan. Lihat TESTING.md |
| 15 | Deployment | Selesai: Dockerfile, Compose + Caddy, health, backup/restore, uji asap, dokumentasi. **Belum pernah dijalankan** (lihat DEPLOYMENT.md) | Admin, listing, detail, CMS, lead, denah, 3D, SEO, dst. | Belum |

Tautan navigasi ke /properties, /locations, /agents, /about, /contact, /favorites akan 404 sampai fase tersebut dibangun. Data beranda masih dari `src/lib/sample-data.ts`, gambar masih placeholder SVG.
Proyek ini belum pernah dijalankan (tanpa akses npm saat dibuat). Jalankan langkah di bawah dan laporkan error apa pun.

## Menjalankan
```bash
npm install
cp .env.example .env        # isi DATABASE_URL, ADMIN_SEED_*
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Arsitektur singkat
- **Struktur**: `src/app` (rute), `src/components` (UI), `src/lib` (bisnis: prisma, media, whatsapp), `prisma` (skema + seed). Fitur admin nanti di `src/features/*`, logika server di `src/server/*`.
- **Media**: upload -> validasi magic bytes (bukan ekstensi) -> auto-rotate -> metadata dibuang -> 4 varian WebP (thumbnail 320, small 640, medium 1280, large 2200) + blur placeholder. Kunci varian disimpan di `Media.variants`; storage lewat antarmuka `StorageDriver`.
- **3D**: `ThreeDModel` menyimpan referensi GLB, kamera, dan preset cahaya. Viewer dimuat dengan `next/dynamic` hanya di halaman detail agar Three.js tidak masuk bundle lain.
- **CMS**: `Page` + `PageSection` (konten JSON divalidasi Zod per tipe) + `SiteSetting` (nomor WhatsApp, kontak, sosial, navigasi).
- **RBAC**: `Role` -> `Permission` (kunci seperti `property:write`), dicek di server action dan route handler.
- **Keamanan**: header di `next.config.mjs`; rate limiting, CSRF, sanitasi HTML deskripsi, dan audit log dibangun di fase 2-3 dan 13.

## Fase berikutnya (disarankan)
Fase 2: auth (Auth.js atau sesi sendiri + argon2) dan middleware /admin. Lalu Fase 3-4: CRUD properti dan upload media end-to-end.

## Autentikasi (Fase 2)
- **Sesi**: JWT HS256 (`jose`) di cookie `httpOnly`, `sameSite=lax`, `secure` di produksi, masa berlaku 8 jam. `AUTH_SECRET` wajib minimal 32 karakter.
- **Password**: scrypt bawaan Node dengan salt acak, pembanding `timingSafeEqual`. Login selalu menjalankan verifikasi (hash tiruan bila email tidak ada) agar waktu respons tidak membocorkan akun.
- **Dua lapis proteksi**: `src/middleware.ts` menolak permintaan tanpa sesi ke `/admin/*`; `requireUser()` / `requirePermission()` di server mengecek ulang ke database (akun aktif, role terbaru). Pakai `requirePermission()` di setiap server action dan route handler admin.
- **RBAC**: peta role ke izin ada di `src/lib/auth/permissions.ts` (SUPER_ADMIN, ADMIN, EDITOR, AGENT). Seed menyalinnya ke tabel `Permission` dan `RolePermission`. Ubah di kode, lalu jalankan ulang `npm run db:seed`.
- **Rate limit login**: 5 percobaan per 15 menit per email, 20 per IP. Penyimpanan di memori; ganti ke Redis bila deploy lebih dari satu instance (`src/lib/rate-limit.ts`).
- **Audit**: login berhasil dan gagal tercatat di `AuditLog`.
- **CSRF**: server action Next.js memeriksa Origin, ditambah cookie `sameSite=lax`.

Masuk di `/admin/login` dengan `ADMIN_SEED_EMAIL` dan `ADMIN_SEED_PASSWORD`. Menu Properties, Leads, Media, Audit, dan Users muncul sesuai role tetapi halamannya belum dibuat.

Setelah `npm install` ulang (ada tambahan `jose` dan `server-only`), jalankan `npx prisma migrate dev` dan `npm run db:seed`.

## Manajemen properti (Fase 3)
- **Daftar** `/admin/properties`: pencarian (judul, ID, alamat), filter status/transaksi/tipe, 6 urutan, 20 per halaman. Semua lewat URL.
- **Form** `/admin/properties/new` dan `/[id]/edit`: 6 langkah dalam satu `<form>` (Basics, Location, Specifications, Description, SEO, Preview and publish). Langkah Images, Floor plans, Video, 3D ditambahkan di fase 4, 9, 10.
- **Server action** `saveProperty`: validasi Zod, pengecekan kategori/lokasi, slug unik otomatis, kode `EST-0001` berurutan, simpan dalam satu transaksi (properti, fitur, SEO), catat audit. Mengubah ke PUBLISHED butuh izin `property:publish`.
- **Deskripsi**: editor Tiptap menghasilkan HTML, disanitasi di server (`sanitize-html`, hanya tag aman).
- **Hapus**: soft delete (`deletedAt`), slug dilepas, tercatat di audit.
- **Belum ada**: autosave. Saat ini simpan manual lewat tombol Save. Autosave draft akan lebih masuk akal setelah upload gambar (fase 4).
- Kode properti dihitung dari kode terakhir; dua pembuatan bersamaan bisa bentrok pada kolom unik. Cukup untuk tim kecil, ganti dengan sequence database bila perlu.

Jalankan `npm install` ulang (tambahan Tiptap dan sanitize-html).

## Media (Fase 4)
- **Upload**: `POST /api/admin/media`, satu file per permintaan (klien mengunggah 2 paralel dengan progres per file). Diperiksa: izin `media:write`, Origin, batas 60 file per 10 menit per pengguna, ukuran, isi file (magic bytes), dimensi 800 sampai 12000 px.
- **Pipeline** (`src/lib/media/process-image.ts`): HEIC dikonversi ke JPEG dengan `heic-convert` (sharp bawaan npm tidak bisa membaca HEIC), auto-rotate, metadata EXIF/GPS dibuang, 4 varian WebP (320, 640, 1280, 2200 px) dan blur placeholder. Asli hanya disimpan bila `STORE_ORIGINALS=true` (tidak dibersihkan metadatanya).
- **Storage**: `STORAGE_DRIVER=local` menulis ke `public/uploads` (pengembangan). `s3` memakai S3/R2/MinIO lewat `STORAGE_*`. Objek diberi cache `immutable`. Jika DB gagal setelah upload, objek dibersihkan.
- **Media Library** `/admin/media`: drag and drop, banyak file, cari nama, filter dipakai/tidak dipakai, ganti nama, alt text, dimensi, ukuran, status WebP, salin URL, hapus. File yang masih dipakai tidak bisa dihapus (balasan 409 dengan penjelasan).
- **Foto properti**: bagian Photos di halaman edit (pilih dari library atau unggah baru, urutkan, jadikan cover, lepas). Tersimpan langsung, terpisah dari tombol Save form. Foto hanya bisa ditambahkan setelah properti dibuat.
- **API**: semua balasan `{ ok, data }` atau `{ ok: false, error: { code, message } }`.

Batasan yang perlu diketahui:
- Platform serverless membatasi ukuran body permintaan (mis. sekitar 4,5 MB di Vercel). Untuk foto besar di sana, ganti alur menjadi presigned URL langsung ke S3, lalu proses varian di server. Antarmuka `StorageDriver` dan `ingestImage` sudah memisahkan bagian ini.
- Pemrosesan gambar berjalan di dalam permintaan. Untuk volume besar, pindahkan ke antrean kerja.
- Hanya gambar yang didukung di library. Denah (PDF/SVG) dan GLB masuk di fase 9 dan 10.

Jalankan `npm install` ulang (tambahan @aws-sdk/client-s3 dan heic-convert). Tidak ada migrasi baru.

## Listing publik (Fase 5)
- **`/properties`**: hanya properti `PUBLISHED` dan belum dihapus. Filter berbasis URL (`?location=bali&type=villa&maxPrice=10000000000&beds=3&pool=1`), jadi bisa dibagikan, tahan refresh, dan bekerja tanpa JavaScript. Query ada di `src/server/properties/public.ts` dan memakai indeks yang sudah ada di skema.
- **Filter**: kata kunci, lokasi (slug atau teks bebas, sehingga pencarian beranda ikut bekerja), tipe, jual/sewa, harga min dan maks, kamar tidur, kamar mandi, luas tanah dan bangunan minimum, sertifikat, furnished, kolam renang, garasi, taman, featured. Filter aktif tampil sebagai chip yang bisa dilepas satu per satu.
- **Tampilan**: grid atau list (`?view=list`), 5 urutan, 12 per halaman. Halaman melewati batas dialihkan ke halaman terakhir.
- **SEO**: kanonik ke `/properties`; halaman dengan filter atau halaman 2 dan seterusnya diberi `noindex, follow` agar tidak menggandakan konten.
- **Gambar**: `<img srcset>` dari varian WebP (640/1280/2200), lazy loading, blur placeholder, dua kartu pertama dimuat eager. Tidak memakai `next/image` karena varian sudah dioptimalkan oleh pipeline.
- **Favorit**: tersimpan di `localStorage` perangkat (maks. 30), sinkron antar tab; `/favorites` memuat kartunya lewat `GET /api/properties/by-slug` (dibatasi 60 permintaan per menit per IP). Belum ada akun pelanggan, jadi tidak ikut berpindah perangkat.
- **Header dan footer** dipindah ke komponen bersama `site-header.tsx`.

Batasan:
- Filter harga membandingkan angka tanpa memperhatikan mata uang. Cukup selama semua properti IDR; konversi mata uang masuk fitur multi-currency.
- Harga sewa tampil tanpa periode (bulan/tahun) karena skema belum punya kolom periode sewa. Sebaiknya ditambahkan sebelum data sewa asli dimasukkan.
- Halaman dirender dinamis setiap permintaan. Strategi cache ada di Fase 12.
- Halaman detail `/properties/[slug]` baru dibuat di Fase 6, jadi tautan kartu menghasilkan 404 sampai saat itu.

Tidak ada dependensi atau migrasi baru.

## Detail properti (Fase 6)
- **`/properties/[slug]`**: terbuka untuk properti PUBLISHED, RESERVED, SOLD, RENTED (URL lama tidak mati; ada lencana status dan form diganti ajakan menghubungi). DRAFT dan ARCHIVED menghasilkan halaman 404 yang ramah.
- **Galeri**: kluster foto (satu besar, dua kecil di desktop), lightbox layar penuh dengan panah keyboard, geser di layar sentuh, dan pramuat foto tetangga. Foto sisanya tampil di bagian Photo gallery dan membuka lightbox yang sama.
- **Inquiry** (`src/server/leads/actions.ts`): "Request a viewing" atau "Ask a question". Divalidasi Zod, honeypot, batas 5 pesan per jam per IP, tersimpan sebagai `Lead` berstatus NEW dengan agen properti sebagai penerima. Tanggal viewing harus dalam setahun ke depan. Notifikasi email belum ada (fitur lanjutan); admin akan melihat lead di Fase 8.
- **WhatsApp**: pesan otomatis menyebut nama properti. Nomor dari `SiteSetting` "whatsapp.number". **Selama kosong, tombol disembunyikan.** Pengisiannya lewat Admin > Settings (belum dibuat); sementara itu isi langsung di database.
- **SEO halaman detail**: judul/deskripsi dari kolom SEO (cadangan: dibuat dari data), canonical, Open Graph dan Twitter dengan foto besar, JSON-LD `RealEstateListing` (penawaran, kamar, luas, alamat, koordinat). Sitemap dan robots.txt di Fase 11.
- **Serupa**: lokasi dan jenis transaksi sama dulu, lalu tipe yang sama.
- **Peta**: saat ini tautan "Open in maps" bila ada koordinat. Peta tertanam dengan lapisan abstraksi Mapbox/Google dikerjakan setelah ada kunci API.

Belum ada di halaman ini (tempatnya sudah disiapkan): denah (Fase 9), viewer 3D (Fase 10), video, dan fasilitas terdekat (skema belum punya data fasilitas).
Jumlah tampilan (`viewCount`) dihitung di setiap render halaman dan bot ikut terhitung; Fase 12 memindahkannya ke pelacakan terpisah agar halaman bisa di-cache.
Tidak ada dependensi atau migrasi baru.

## CMS (Fase 7)
- **Admin > Homepage** (`/admin/cms/homepage`): beranda tersusun dari seksi: Hero, Property showcase (featured/premium/latest), Popular locations, Why choose us, Services, Testimonials, FAQ, Market insights, Call to action. Tiap seksi bisa diedit (teks, tombol, tautan, gambar hero), diurutkan, disembunyikan, dihapus, dan ditambah. Perubahan langsung tampil.
- **Tata letak bawaan**: seed membuatnya bila belum ada seksi. Bila Page "home" kosong, beranda memakai tata letak bawaan di kode; tombol "Create default layout" memindahkannya ke database agar bisa diedit. **Teks bawaan hanyalah contoh. Ganti klaim di Why choose us dan Services dengan fakta bisnis yang benar sebelum publikasi.**
- **Seksi otomatis tersembunyi** bila tidak ada isinya (belum ada properti yang cocok, belum ada testimoni/FAQ yang terlihat, belum ada area dengan listing).
- **Testimoni dan FAQ**: CRUD, urutan, tampil/sembunyi. FAQ menambahkan data terstruktur `FAQPage` di beranda.
- **Admin > Settings** (`/admin/settings`, izin `settings:write`): nomor WhatsApp, kontak, media sosial, menu navigasi (maks. 8), teks footer. Header dan footer membacanya.
- **Nomor WhatsApp**: boleh format lokal (`081383137988`); otomatis diubah ke format internasional (`6281383137988`) untuk tautan chat. Untuk mengisinya pertama kali: buka Admin > Settings, atau tambahkan `WHATSAPP_SEED_NUMBER` ke `.env` lalu `npm run db:seed` (hanya mengisi bila masih kosong).
- **Keamanan tautan**: semua tautan dari CMS divalidasi (hanya `/`, `http(s)`, `mailto`, `tel`, `#`) saat disimpan dan sekali lagi saat ditampilkan. Tautan sosial wajib `https://`.
- **Pemilih gambar**: hero memakai Media Library yang sama dengan foto properti.

Batasan:
- Daftar item (Why choose us, Services, Insights, menu) diedit sebagai baris dengan tombol Up/Down, bukan drag and drop.
- Seksi "Featured agents" belum ada karena admin agen belum dibuat (Fase 3 mencakup properti saja; CRUD agen perlu ditambahkan). Halaman About, Contact, serta konten halaman lain belum bisa diedit di CMS.
- Tidak ada pratinjau draf: seksi disembunyikan lewat Hide, bukan versi draf terpisah.
- Pengaturan dibaca dari database di setiap permintaan (per-request cache saja). Cache lintas permintaan masuk Fase 12.

Tidak ada dependensi baru. Tidak ada migrasi. Jalankan ulang `npm run db:seed` (aman diulang) untuk membuat tata letak beranda bawaan.

## Lead, agen, dashboard (Fase 8)
- **Leads** (`/admin/leads`): cari nama/telepon/email, filter status (NEW sampai LOST), sumber, agen (termasuk "unassigned"), dan periode. 25 per halaman. **Export CSV** mengikuti filter aktif (maks. 5.000 baris, sel yang diawali `= + - @` diberi tanda kutip agar tidak dieksekusi sebagai rumus; pengunduhan dicatat di audit).
- **Detail lead**: kontak (telepon, tautan WhatsApp ke nomor lead), properti, pesan, status, agen, tanggal viewing, dan catatan. Setiap perubahan status, penugasan, atau tanggal viewing otomatis masuk riwayat.
- **Tambah lead manual** (`/admin/leads/new`) untuk telepon, walk-in, referral.
- **Pembatasan data untuk role AGENT**: hanya melihat lead yang ditugaskan ke profil agennya, tidak bisa memindahkan lead ke agen lain, dan lead yang ia buat otomatis menjadi miliknya. Berlaku juga di daftar, detail, export, dan statistik dashboard. Profil agen harus ditautkan ke akun login (lihat bawah).
- **Agen** (`/admin/agents`): CRUD dengan foto, kontak, bio, aktif, featured. Hapus = soft delete: properti dilepas dari agen, riwayat lead tetap mencatat namanya. Hanya agen aktif yang tampil di halaman properti publik. Tautan akun login hanya bisa diubah oleh yang punya izin `user:manage` karena menentukan data apa yang boleh dilihat.
- **Dashboard**: total/terbit/draf/featured properti, total lead, lead baru, permintaan viewing, grafik lead 30 hari (SVG, tanpa pustaka), pipeline per status, inquiry terbaru, properti paling banyak dilihat dan paling banyak dihubungi. Tiap blok hanya tampil sesuai izin role.
- **Seksi beranda baru "Featured agents"**: menampilkan agen aktif berstatus featured; tersembunyi otomatis bila belum ada. Seksi ini baru muncul di database baru atau lewat Admin > Homepage > Add section (database lama tidak diubah).
- **Tanggal viewing** disimpan sebagai tengah hari UTC agar tidak bergeser hari antar zona waktu.

Belum ada / perlu diketahui:
- **Halaman Users dan Audit logs belum dibuat** (menu sudah ada di sidebar dan akan 404). Akibatnya akun role AGENT belum bisa dibuat dari antarmuka; sementara itu buat lewat seed atau langsung di database, lalu tautkan di Admin > Agents. Ini perlu dikerjakan sebelum produksi.
- Notifikasi email/WhatsApp untuk lead baru belum ada (fitur lanjutan).
- Halaman publik /agents dan /agents/[slug] belum dibuat; kartu agen di beranda belum berupa tautan.
- Statistik "paling banyak dilihat" memakai `viewCount` yang kasar (bot ikut terhitung).
- Grafik harian dihitung dari data lead 30 hari (maks. 10.000 baris) dalam zona UTC.

Tidak ada dependensi baru. Tidak ada migrasi.

## Pengguna dan audit (Fase 8b)
- **Users** (`/admin/users`, hanya `user:manage` = super admin): tambah pengguna, ubah nama/email/role, reset password, aktif/nonaktif. Tidak ada hapus permanen supaya nama tetap muncul di audit. Password minimal 10 karakter dan tidak boleh sama dengan nama atau email.
- **Pengaman**: tidak bisa menurunkan role atau menonaktifkan diri sendiri, dan harus selalu tersisa satu super admin aktif.
- **Pencabutan sesi**: mengganti password menandai `User.sessionsValidAfter`; sesi yang terbit sebelumnya langsung ditolak. Menonaktifkan pengguna juga langsung mengeluarkannya (akun dicek ke database di setiap permintaan). **Ini butuh migrasi**: `npx prisma migrate dev --name user_sessions`.
- **Audit logs** (`/admin/audit`, izin `audit:read`): filter aksi, tipe data, pengguna, dan periode; 50 per halaman; rincian perubahan bisa dibuka. Tidak ada fitur ubah atau hapus entri dari admin.
- Belum ada: pengguna mengganti password sendiri (saat ini lewat super admin) dan undangan lewat email.

## Denah (Fase 9)
- **Admin**: di halaman edit properti, bagian Floor plans: tambah (dengan label seperti Ground Floor, Second Floor, Roof Plan), ganti nama, urutkan, ganti file, hapus, dengan progres unggah. Ringkasan semua denah di `/admin/floor-plans`.
- **Format**: PNG dan JPG diproses lewat pipeline gambar dengan kualitas lebih tinggi dan varian besar 3000 px (teks kecil tetap terbaca). **SVG tidak pernah disimpan atau disajikan**: ditolak bila memuat skrip, event handler, `foreignObject`, entity/doctype, atau tautan eksternal, lalu di-rasterisasi menjadi gambar. Ini mencegah XSS tersimpan dan pembacaan berkas lewat perenderan. **PDF** disimpan apa adanya (maks. 20 MB, dicek dari isi file) dan dibuka di tab baru.
- **Publik**: bagian Floor plan di halaman properti dengan tab per lantai, zoom yang bisa digulir, dan tautan PDF. Bagian hanya tampil bila ada denah.
- Mengganti file menghapus file lama beserta objeknya di storage.

Batasan:
- PDF tidak punya pratinjau halaman pertama karena prebuilt sharp tidak bisa merender PDF. Menambahkannya butuh poppler atau pustaka PDF di server.
- Denah SVG menjadi gambar raster, jadi tidak bisa diperbesar tanpa batas seperti vektor (3000 px).
- Denah dari PDF tidak tampil inline di halaman properti.

Tidak ada dependensi baru. **Satu migrasi baru** (kolom `sessionsValidAfter`).

## 3D (Fase 10)
- **Admin**: di halaman edit properti, bagian 3D models: unggah .glb (maks. 50 MB), beri label, pilih preset cahaya (studio, daylight, sunset), tentukan model yang tampil pertama, ganti file, hapus. **Preview and set camera** membuka viewer yang sama dengan pengunjung; atur sudut pandang lalu simpan sebagai kamera awal, atau kembali ke framing otomatis. Ringkasan di `/admin/models`.
- **Validasi file** (`src/server/media/glb.ts`): header GLB dan panjang file dicek, JSON model diparse, hanya glTF 2.0, tekstur KTX2 ditolak, dan **model yang merujuk berkas luar ditolak** (hanya berkas mandiri). `.gltf` diterima bila semua datanya tertanam. Mengganti file mereset kamera karena geometrinya berubah.
- **Viewer** (`src/components/model-viewer/viewer.tsx`): orbit, zoom (scroll, cubit, tombol +/−), pan, layar penuh (dengan cadangan CSS untuk iOS Safari), reset, indikator memuat, framing kamera otomatis dari ukuran model, model diletakkan di lantai, batas zoom dan sudut agar tidak masuk ke bawah lantai. Pencahayaan dibuat prosedural (tanpa mengunduh HDR dari luar).
- **Performa dan perangkat lemah**: Three.js baru dimuat setelah pengunjung menekan **View in 3D** (halaman tanpa 3D tidak memuatnya sama sekali). Render hanya saat ada interaksi (`frameloop="demand"`), bayangan dirender sekali, resolusi turun otomatis saat FPS jatuh, dan perangkat dengan CPU/RAM kecil memakai resolusi rendah tanpa antialias serta menampilkan peringatan. Mode hemat data menampilkan ukuran file sebelum memuat. Tanpa WebGL, konteks hilang, atau model gagal dimuat, pengunjung melihat pesan yang ramah dan foto serta denah tetap tersedia. Memori GPU dibebaskan saat viewer ditutup.
- **Alur Blender**: denah 2D -> Blender -> ekspor glTF 2.0 (.glb), centang Apply Modifiers, sumbu +Y Up, tekstur PNG/JPG di dalam berkas, sasaran di bawah 15 MB (gltf-transform atau gltfpack bisa mengompres) -> unggah di properti. Kompresi Draco dan Meshopt didukung.

Catatan produksi:
- Dekoder Draco dimuat oleh drei dari CDN publik Google secara bawaan. Jika memakai model berkompresi Draco dan menerapkan Content-Security-Policy ketat, host dekoder sendiri.
- Bila storage memakai domain berbeda (S3/R2 + CDN), aktifkan CORS untuk domain situs agar model bisa diambil oleh viewer.
- Platform serverless membatasi ukuran body permintaan (sekitar 4,5 MB di Vercel), jadi unggahan model besar di sana perlu presigned URL langsung ke S3. Hosting sendiri (Node, VPS, container) tidak terkena batas ini.
- Fase 10 belum menyentuh pembuatan model otomatis dari denah. Titik masuk tunggalnya adalah `ingestModel()` di `src/server/media/ingest.ts`.

Dependensi baru: `three`, `@react-three/fiber`, `@react-three/drei` (dan `@types/three`). Tidak ada migrasi baru. Jalankan `npm install` ulang.

## SEO dan halaman publik (Fase 11)
- **`/sitemap.xml`** (`src/app/sitemap.ts`): halaman utama, properti PUBLISHED (dengan `lastModified`), lokasi yang punya properti, agen aktif. Halaman yang diberi "hide from search engines" di Admin > SEO tidak dimasukkan. **`/robots.txt`**: izinkan semua kecuali `/admin`, `/api/`, `/favorites`, `/compare`; menunjuk ke sitemap.
- **Metadata** (`src/server/seo/meta.ts`): setiap halaman publik memakai teks dari Admin > SEO bila diisi, selain itu cadangan yang dibuat dari data. Termasuk canonical, Open Graph, Twitter, dan robots. Judul mendapat akhiran nama situs otomatis.
- **Data terstruktur**: beranda (`RealEstateAgent` + `WebSite` dengan SearchAction), properti (`RealEstateListing` + `BreadcrumbList`), lokasi dan agen (`BreadcrumbList`, agen juga `Person`), FAQ (`FAQPage`), About dan Contact (`RealEstateAgent`).
- **Admin > SEO**: ringkasan kelengkapan SEO halaman, lokasi, dan jumlah properti terbit yang belum punya judul/deskripsi SEO. Form tiap halaman punya pratinjau hasil pencarian, penghitung panjang, canonical, gambar berbagi, dan noindex. SEO properti tetap di langkah SEO pada form properti.
- **Halaman baru**: `/locations` dan `/locations/[slug]` (deskripsi, foto sampul, properti di area itu; area tanpa properti otomatis noindex), `/agents` dan `/agents/[slug]` (profil, kontak, WhatsApp, properti agen), `/about`, `/contact` (formulir menyimpan lead dengan sumber "contact_page"; data kontak dari Settings), `/compare` (hingga 3 properti berdampingan, opsi hanya tampilkan perbedaan; pilihan disimpan di perangkat). Header menampilkan jumlah Saved dan Compare.
- **Admin baru**: **Locations** (CRUD, foto sampul, deskripsi, koordinat; tidak bisa dihapus bila masih ada properti) dan **Pages** (teks About dan Contact).

Perlu diketahui:
- Teks bawaan About dan Contact sengaja netral. Tulis sendiri di Admin > Pages.
- **Admin kategori properti belum ada** (kategori datang dari seed).
- Set `NEXT_PUBLIC_SITE_URL` ke domain produksi; sitemap, canonical, dan data terstruktur memakainya.
- Sitemap dihitung pada setiap permintaan; Fase 12 menambahkan cache.
- Tidak ada gambar berbagi bawaan; tanpa foto, tautan dibagikan tanpa gambar. Isi gambar berbagi di Admin > SEO untuk beranda.
- Tidak ada dependensi baru dan tidak ada migrasi.

## Performa (Fase 12)
**Tidak ada angka Lighthouse atau Core Web Vitals yang diukur di sini** (tidak ada browser atau database di lingkungan pembuatan). Yang di bawah adalah perubahan yang dikerjakan dan cara mengukurnya sendiri.

Perubahan:
- **Cache halaman (ISR)**: beranda, detail properti, lokasi, agen, About, Contact, dan sitemap tidak lagi dirender di setiap permintaan. HTML di-cache dan disegarkan tiap 5 menit (sitemap tiap jam). **Setiap kali admin menyimpan sesuatu yang tampil di situs publik** (properti, foto, denah, 3D, agen, lokasi, CMS, pengaturan, SEO, alt foto), `revalidatePublic()` (`src/server/revalidate.ts`) langsung membuang cache, jadi perubahan terlihat segera. Halaman admin dan `/properties` (bergantung pada query URL) tetap dinamis.
- **Cache data pencarian**: hasil `/properties` per kombinasi filter di-cache 2 menit dan opsi filter 5 menit, dibuang oleh tag yang sama. Pencarian teks bebas sengaja tidak di-cache agar cache tidak membengkak.
- **Jumlah tampilan dipisah dari render**: `POST /api/properties/view` dipanggil browser (`ViewBeacon`) sekali per sesi, ditunda 1,5 detik, dengan batas satu hitungan per pengunjung per properti per 30 menit dan penyaringan bot sederhana. Karena itu halaman bisa di-cache, dan bot tanpa JavaScript tidak lagi terhitung.
- **Indeks database** (migrasi baru): `Property(status, deletedAt, publishedAt)`, `Property(agentId, status)`, `Lead(createdAt)`, `AuditLog(createdAt)`. Opsional tetapi disarankan: `prisma/sql/search-indexes.sql` membuat indeks trigram (pg_trgm) agar pencarian "contains" di properti, media, dan lead tidak memindai seluruh tabel.
- **Rendering**: seksi beranda di bawah lipatan memakai `content-visibility: auto`; animasi pembuka hero dipercepat dan dimulai dengan sebagian besar gambar sudah terlihat supaya LCP tidak tertunda.
- **Cache aset**: berkas di `/uploads` (driver lokal) diberi `immutable` satu tahun (nama berkas memuat UUID); objek S3 sudah diberi header yang sama sejak Fase 4.
- **Dependensi**: `framer-motion` dihapus karena tidak dipakai (semua animasi memakai CSS dan menghormati `prefers-reduced-motion`). Three.js, Tiptap, dan Media Library hanya dimuat di tempat yang memerlukannya.
- **Core Web Vitals nyata**: `WebVitals` mengirim sampel 25% pengunjung (LCP, CLS, INP, FCP, TTFB, tanpa data pribadi) ke `/api/vitals`, yang menulis satu baris JSON `type: "web-vital"` ke log server. Kirim log itu ke layanan log Anda untuk melihat angka lapangan per halaman dan perangkat.

Cara mengukur:
- `npm run analyze` membuka peta ukuran bundle. `lighthouserc.json` berisi anggaran (LCP maks. 2,5 detik, CLS maks. 0,1, TBT maks. 200 ms, skor performa 0,9); ganti slug contoh lalu jalankan `npx @lhci/cli autorun` terhadap build produksi.

Yang perlu diketahui:
- **`next build` sekarang membaca database** karena beranda, About, Contact, daftar lokasi/agen, dan sitemap dirender saat build. Jalankan migrasi dan sediakan `DATABASE_URL` sebelum build (di CI juga). Halaman detail, lokasi, dan agen dirender saat diminta pertama kali.
- Cache `unstable_cache` dan ISR tersimpan per instance di hosting sendiri. Dengan beberapa instance, revalidasi on-demand hanya mengenai instance yang menerima aksi admin; instance lain mengikuti masa berlaku 2 sampai 5 menit. Untuk konsistensi penuh pakai penyimpanan cache bersama (mis. handler cache Redis) atau hosting yang menyediakannya.
- Koneksi Prisma ke Postgres di lingkungan serverless perlu pooler (PgBouncer atau pooler bawaan penyedia).
- Pembatas laju (`hit`) tetap di memori per instance.
- Foto asli yang diunggah sudah diperkecil dan dikonversi ke WebP sejak Fase 4; tidak ada gambar yang disajikan lewat `next/image`, jadi tidak ada biaya optimasi gambar per permintaan.

**Satu migrasi baru**: `npx prisma migrate dev --name perf_indexes`. Jalankan `npm install` ulang (framer-motion keluar, `@next/bundle-analyzer` masuk).

## Keamanan (Fase 13)
Ringkasan ada di tabel status di atas; **rincian temuan, perbaikan, dan batasan yang belum selesai ada di `SECURITY.md`** (baca bagian batasannya). Yang praktis untuk Anda:
- `npm run check:security` memeriksa bahwa setiap aksi server dan route admin memeriksa izin, tidak ada SQL mentah, tidak ada `dangerouslySetInnerHTML` tanpa sanitasi, dan tidak ada rahasia di `NEXT_PUBLIC_`. Sudah diuji menolak pelanggaran buatan. Jalankan di CI.
- **Wajib diisi di produksi** (lihat `.env.example`): `AUTH_SECRET` acak, `NEXT_PUBLIC_SITE_URL` https, serta `TRUSTED_IP_HEADER` atau `TRUSTED_PROXY_HOPS` agar pembatas laju dan audit tahu IP asli. Server menolak start di produksi bila konfigurasi tidak aman (`src/lib/env-check.ts`) dan menulis peringatan untuk sisanya.
- Admin > My account: ganti password sendiri (mencabut sesi di perangkat lain). Ganti password seed setelah login pertama.
- Cookie sesi sekarang `SameSite=Strict` dan memakai awalan `__Host-` di produksi; sesi lama akan tidak berlaku, jadi semua admin perlu login ulang setelah pembaruan ini. Hash password lama otomatis di-upgrade saat login berikutnya.
- **Belum ada**: 2FA, kebijakan retensi data lead, CAPTCHA, uji penetrasi. Semuanya tercantum di SECURITY.md.

Tidak ada dependensi baru dan tidak ada migrasi baru.

## Pengujian (Fase 14)
Ringkasan jujur ada di `TESTING.md` (apa yang dijalankan, apa yang belum, dan celahnya). Singkatnya: `npm run test:unit` (58 tes lulus di lingkungan pembuatan, tanpa database), `npm run test:integration` (butuh `TEST_DATABASE_URL`), `npm run test:e2e` (butuh build dan database yang di-seed), plus `npm run check:security` dan `npm run typecheck`. **`npm run typecheck` dengan paket asli belum pernah dijalankan**; jalankan itu dan `npm run build` lebih dulu karena seluruh proyek dikembangkan tanpa kompilasi penuh. Satu bug nyata ditemukan dan diperbaiki oleh tes (gambar terpotong).

Dependensi baru: `@playwright/test` (dev). Tidak ada migrasi baru.

## Deployment dan status akhir (Fase 15)
Panduan lengkap: **`DEPLOYMENT.md`** (variabel environment, Docker Compose di satu server, hosting terkelola, S3/R2, cadangan dan pemulihan, uji asap, daftar go-live). Arsitektur: `docs/ARCHITECTURE.md`. ERD: `docs/ERD.md` (dibuat otomatis dan sudah divalidasi dirender oleh Mermaid). Data contoh pengembangan: `npm run db:seed:demo`.

### Yang dikerjakan vs spesifikasi
Dikerjakan: seluruh 15 fase kecuali butir di bawah; 20 dokumen/deliverable spek tersedia (arsitektur, struktur UX, ERD, skema, folder, API, autentikasi, media, WebP, 3D, CMS, lead, SEO, keamanan, performa, implementasi, seed, env, deployment).

**Tidak dikerjakan atau sebagian** (jujur):
- **Video properti**: tabel `Video` ada, tetapi belum ada admin maupun tampilan publik.
- **Fasilitas terdekat** pada halaman detail: tidak ada (tidak ada model datanya).
- **Peta tertanam dan lapisan abstraksi Google Maps/Mapbox**: hanya tautan "Open in maps".
- **Admin kategori properti**: tidak ada (kategori dari seed).
- **Autosave** form properti, status **offline**, dan 2FA: tidak ada.
- **shadcn/ui dan Framer Motion** (disebut di spek): tidak dipakai. Komponen dan animasi dibuat sendiri dengan Tailwind dan CSS (Framer Motion dihapus karena tidak terpakai).
- **Notifikasi email/WhatsApp**, akun pelanggan, multi-bahasa, filter harga lintas mata uang, harga sewa dengan periode: tidak ada (sebagian tercatat sebagai fitur masa depan).
- Halaman **Pages** di admin hanya mencakup About dan Contact.
- Unggah besar (>4,5 MB) di hosting serverless membutuhkan alur presigned URL yang belum dibuat.

**Kualitas yang belum terverifikasi**: proyek belum pernah dikompilasi, dibangun, atau dijalankan dengan paket asli; belum ada pengujian visual atau responsif di perangkat nyata, audit aksesibilitas, atau pengukuran Lighthouse; tes integrasi, e2e, CI, dan Docker belum dijalankan. Urutan pertama yang disarankan: `npm install`, `npm run typecheck`, `npm run build`, `npm run test:unit`, lalu deploy percobaan dengan uji asap.

Tidak ada dependensi baru. Tidak ada migrasi baru (tetapi Anda perlu membuat migrasi awal dari skema: lihat DEPLOYMENT.md bagian 3).
