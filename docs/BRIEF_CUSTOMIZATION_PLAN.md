# Plan pengembangan brief Buatin

Tanggal: 21 Oktober 2026. Status: implementasi tersedia; bukti pemeriksaan aktual
dan batas integrasi dicatat di `docs/VALIDATION.md`.

Tambahan 21 Oktober: strategi lazy/skeleton mengikuti jenis website, rendering,
posisi aset dan batas async. Implementasi mencakup policy snapshot, prompt writer,
template dan konfigurasi dokumen hasil; unit/integration memeriksa kontraknya.
Tidak menambah jumlah katalog/ZIP. Risiko utama: rekomendasi tipe bukan bukti
bahwa setiap halaman dinamis; metrik website target tetap perlu diukur sesudah
implementasi. Detail aturan berada di `docs/LOADING_STRATEGY.md`.

## 1. Tujuan dan kondisi saat ini

Pengguna dapat menyertakan referensi, memilih skill, menentukan teknologi, mengatur
warna, serta mengarahkan desain sebelum menyusun dokumen website. Pilihan harus
tersimpan dan benar-benar memengaruhi hasil, bukan sekadar menjadi kontrol di UI.

Temuan dari source saat penyusunan plan:

- Buatin menghasilkan spesifikasi Markdown dan ZIP, belum membangun atau men-deploy
  website target. Cakupan pengembangan ini tetap pada penyusunan spesifikasi.
- Editor baru menyimpan nama, sembilan jenis website, dan brief teks. Impor `.txt`
  atau `.md` menambahkan isi ke textarea; belum ada penyimpanan lampiran gambar.
- Planner dan writer menerima konten teks. Membaca gambar membutuhkan pemrosesan
  tambahan serta pemeriksaan kemampuan model/provider melalui 9router.
- Draft, versi brief, revisi, preset, snapshot job, kuota, worker, dan CI sudah ada.
  Konfigurasi baru harus mengikuti seluruh jalur tersebut.
- Katalog dibatasi 42 dokumen Markdown ditambah manifest. Template `AGENTS.md`,
  `specs/security.md`, dan `specs/testing.md` masih berupa kerangka fallback.
- UI memiliki identitas hijau, Manrope, dan Source Serif 4. Pertahankan pola ini
  saat memperluas editor; pilihan desain pengguna berlaku untuk website target.

## 2. Alur pengguna

Urutan bagian brief: **Proyek dan kebutuhan > Referensi > Teknologi > Warna dan
gaya > Skill > Tinjau pilihan > Buat rencana dokumen**.

Gunakan bagian bertahap yang dapat dibuka kembali. Desktop menampilkan ringkasan
di samping; mobile menampilkan ringkasan yang dapat dibuka. Pengguna tidak wajib
mengisi seluruh pengaturan lanjutan untuk melanjutkan.

- Teknologi, gaya, dan skill memiliki mode **Otomatis** atau **Manual** sendiri.
- Warna memiliki pilihan otomatis atau palet manual. Otomatis merupakan default
  bagi pengguna yang belum memiliki preferensi.
- Mode otomatis menampilkan rekomendasi, alasan, dan asumsi sebelum generasi.
  Tombol **Sesuaikan** menyalinnya ke mode manual.
- Manual dapat mengisi sebagian kategori; sisanya tetap otomatis. Penanda per
  pilihan membedakan keputusan pengguna dan rekomendasi sistem.
- Perpindahan mode mempertahankan pilihan manual sebelumnya. Rekomendasi ulang
  tidak menimpa nilai yang dikunci pengguna.
- Perubahan jenis website menawarkan penyesuaian rekomendasi serta menjelaskan
  konflik dengan pilihan yang sudah ada.
- Autosave, indikator perubahan belum tersimpan, pemulihan kegagalan, dan konflik
  versi antar-tab berlaku untuk teks maupun seluruh konfigurasi baru.

## 3. Referensi gambar dan file

Tambahkan area unggah dengan tombol pilih file, drag-and-drop, daftar lampiran,
thumbnail gambar, ukuran, status, catatan, serta tindakan hapus dan coba lagi.
Tombol unggah tetap dapat digunakan tanpa drag-and-drop melalui keyboard/mobile.

Jenis awal: PNG, JPG/JPEG, WebP, PDF, DOCX, TXT, dan MD. File Office bermakro,
executable, HTML aktif, arsip, serta SVG mentah tidak diterima pada tahap awal.
Impor teks lama tetap tersedia sebagai tindakan terpisah.

Default batas yang diusulkan: 10 lampiran per proyek, 5 MiB per gambar, 10 MiB per
dokumen, total 25 MiB. Batas harus dapat dikonfigurasi dan ditegakkan di server.
Sesuaikan lagi setelah pengukuran biaya penyimpanan dan pemrosesan, bukan melalui
angka batas yang tersembunyi di UI.

Setiap lampiran memiliki peran: referensi visual, logo/aset brand, konten, atau
dokumen kebutuhan. Pengguna dapat mencatat bagian yang ingin diikuti: warna,
tipografi, komposisi, komponen, atau isi. Referensi tidak berarti izin menyalin
seluruh karya; sumber dan catatan hak penggunaan ikut dicatat.

Pemrosesan:

1. Simpan sementara sebagai file privat berstatus karantina; periksa MIME, magic
   bytes, ukuran, dimensi, jumlah halaman, dan batas dekompresi DOCX.
2. Sanitasi nama file; gunakan storage key acak. Gambar yang diterima di-decode,
   di-encode ulang, dan metadata EXIF dibuang. Pemindai malware menjadi syarat
   pelepasan dokumen biner di lingkungan publik; kegagalan pemindai menahan file.
3. Ekstrak teks PDF/DOCX/TXT/MD dalam worker dengan timeout, batas memori/CPU,
   batas panjang hasil, dan dependensi terkunci. File terenkripsi/rusak mendapat
   pesan yang jelas. OCR atau pembacaan visual digunakan hanya bila tersedia.
4. Periksa kemampuan vision model. Jika tersedia, hasil analisis visual mencatat
   sumber dan ketidakpastian. Jika tidak, tampilkan status bahwa gambar belum
   dianalisis; sediakan deskripsi manual. Jangan mengklaim gambar sudah dibaca.
5. Tampilkan ringkasan hasil ekstraksi untuk ditinjau pengguna. Teks referensi
   dibatasi sebagai data tidak tepercaya, bukan instruksi agent.
6. Kirim konteks relevan ke planner/writer setelah tindakan generasi pengguna.
   Jelaskan data lampiran yang diteruskan ke provider dan biaya jika ada.

File disimpan di luar direktori publik: storage privat lokal untuk development,
adapter S3-compatible privat untuk produksi. Akses selalu memeriksa kepemilikan;
URL sementara bukan pengganti otorisasi. Unduhan memakai header yang aman.

Lampiran mengikuti retensi proyek/job. Penghapusan dari brief menghapus relasi
draft; UI menjelaskan bila versi hasil lama masih mempertahankan referensinya.
Blob dibersihkan setelah tidak dirujuk draft/revisi/job yang masih berlaku.
Penghapusan proyek dan maintenance juga membersihkan blob serta ekstraksi yatim.

URL referensi dapat dicatat sebagai tautan. Fetch otomatis URL arbitrer ditunda
agar dukungan lampiran tidak sekaligus membuka jalur SSRF.

Kriteria penerimaan: referensi tampil setelah reload, kegagalan dapat dipulihkan,
akun lain tidak bisa membaca lampiran, dan fakta referensi memengaruhi dokumen
brief/desain/aset tanpa mengalahkan pilihan manual pengguna.

## 4. Katalog skill dari koleksi yang tersedia dan GitHub

Seluruh skill yang terinventarisasi masuk katalog dengan status yang jujur.
Hanya skill yang relevan, kompatibel, dan diizinkan yang menjadi konteks aktif.
Memasukkan semua instruksi sekaligus meningkatkan konflik dan biaya konteks.

Inventaris awal berdasarkan skill yang tersedia pada sesi ini:

| Kelompok                          | Skill/koleksi                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| UI, desain, dan interaksi         | `impeccable`, `ui-ux-pro-max`, `ui-craft`, `emil-design-eng`, dua varian `design-taste-frontend`, `antislop` |
| Gambar, visualisasi, dan video    | `imagegen`, `visualize`, `sparki-video-editor`                                                               |
| Dokumen                           | `documents`, `pdf`, `presentations`, `spreadsheets`, `excel-live-control`, `template-creator`                |
| Website dan integrasi             | `sites`, `plugin-management`                                                                                 |
| Dokumentasi dan pengelolaan skill | `openai-docs`, `skill-creator`, `skill-installer`                                                            |
| Companion khusus                  | `work-pets:create-pet`, `work-pets:pets`, `work-pets:update-pet`                                             |

Daftar ini membuktikan ketersediaan di lingkungan kerja, belum membuktikan hak
redistribusi atau bahwa tool eksternalnya dapat dijalankan dari server Buatin.
Skill khusus Excel/Pets tetap terlihat dengan batas dukungannya; tidak otomatis
diaktifkan untuk spesifikasi website biasa.

Setiap entri menyimpan ID unik, namespace sumber, nama, deskripsi, kategori,
trigger, cakupan, stack yang didukung, dependensi, konflik, lisensi, atribusi,
versi/commit, checksum, serta tanggal pemeriksaan. Dua skill bernama sama tetap
dibedakan berdasarkan sumber; duplikasi isi dapat digabung setelah pemeriksaan.

Status katalog: **Siap**, **Perlu koneksi**, **Perlu adaptasi**, **Perlu tinjauan
lisensi**, atau **Tidak didukung**. Pencarian, filter kategori, detail sumber, dan
alasan rekomendasi membantu pengguna memahami pilihan.

Proses pemasukan skill:

1. Inventaris direktori skill dan manifest plugin yang memang tersedia; simpan
   sumber asli. Jangan membaca atau memindahkan token, cookie, atau konfigurasi
   akun pribadi ke aplikasi.
2. Periksa lisensi, isi, dependensi, serta tool yang diperlukan. Skill dengan hak
   penggunaan belum jelas hanya memiliki metadata/tautan sampai terselesaikan.
3. Impor instruksi dan resource yang boleh dipakai; adaptasi format ke kontrak
   konteks Buatin. Resource besar dimuat sesuai kebutuhan dokumen.
4. Skill yang belum ada dicari dari GitHub, diprioritaskan dari pemilik asli.
   Kandidat yang sudah ditinjau keberadaannya: koleksi
   [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) untuk React
   dan panduan UI; [Anthropic Skills](https://github.com/anthropics/skills) untuk
   kandidat tambahan desain/dokumen/testing. Periksa lisensi setiap entri saat
   impor; keberadaan repo bukan persetujuan menggunakan semua isinya.
5. Pin versi/commit serta checksum. Pembaruan melalui tinjauan admin dan pengujian;
   generation tidak mengunduh kode terbaru dari internet secara langsung.
6. Jangan menjalankan skrip skill hasil unduhan di proses aplikasi. Eksekusi tool
   memerlukan adapter yang terpisah dengan izin dan isolasi yang jelas.

Plugin desktop bukan otomatis plugin milik aplikasi web. Kemampuan yang bergantung
pada koneksi layanan memerlukan API/adapter, akun, dan konfigurasi server sendiri.
Pencarian saat penyusunan plan menemukan plugin GitHub tersedia untuk dipasang,
tetapi belum terpasang; pembacaan repo publik untuk plan menggunakan sumber web.

Mode otomatis memilih skill menurut jenis web, fitur, stack, dan pekerjaan setiap
dokumen. Mode manual menyediakan checklist serta penjelasan konflik/dependensi.
Skill keamanan dasar tetap wajib. Pilihan dan versi skill dicatat di snapshot,
ringkasan plan, `AGENTS.md` hasil, dan manifest.

Kriteria penerimaan: setiap entri memiliki sumber/status, skill aktif benar-benar
masuk konteks dokumen terkait, kebutuhan koneksi tidak disamarkan sebagai siap,
dan konten pihak ketiga tidak bisa mengubah otorisasi atau menjalankan perintah.

## 5. Teknologi otomatis dan manual

Pilihan ini mendeskripsikan teknologi **website target**, bukan mengganti stack
Buatin atau memasang semua paket ke aplikasi Buatin.

Otomatis menghasilkan satu rekomendasi utama dengan alasan, kompleksitas,
konsekuensi operasional, kebutuhan akun, dan alternatif yang relevan. Dasarnya
jenis web, fitur, SEO, kebutuhan data, login, pembayaran, integrasi, preferensi,
serta batas anggaran. Harga provider yang belum diverifikasi tidak diisi angka.

Manual menyediakan pencarian per kategori, pilihan **Tidak diperlukan**,
**Rekomendasikan**, serta isian teknologi lain dengan alasan. Pengguna boleh
menentukan sebagian pilihan. Satu frontend utama menjadi default; kombinasi
beberapa layanan harus dinyatakan dalam arsitektur, bukan dipilih tanpa aturan.

Katalog awal teknologi umum, dapat diperluas lewat data konfigurasi:

| Kategori                 | Opsi awal                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bahasa                   | TypeScript, JavaScript, Python, PHP, Go, Java, Kotlin, C#, Ruby, Rust                                                                                |
| Frontend/framework       | Next.js, React + Vite, Vue, Nuxt, Svelte, SvelteKit, Astro, Angular, HTML/CSS/JS                                                                     |
| Rendering                | SSG, SSR, CSR/SPA, ISR, hybrid, server components jika didukung                                                                                      |
| Styling                  | Tailwind CSS, CSS Modules, CSS/SCSS, Sass, styled-components, Emotion                                                                                |
| Komponen UI              | shadcn/ui, Radix, MUI, Chakra UI, Ant Design, Mantine, Bootstrap, DaisyUI, PrimeVue, Vuetify                                                         |
| Form dan validasi        | React Hook Form, Formik, VeeValidate, Zod, Valibot, Yup, validasi bawaan framework                                                                   |
| State dan data client    | TanStack Query, SWR, Redux Toolkit, Zustand, Pinia, NgRx, store bawaan framework                                                                     |
| Backend                  | Next.js route handlers, Express, Fastify, NestJS, Hono, FastAPI, Django, Flask, Laravel, Symfony, Gin, Fiber, Spring Boot, ASP.NET Core, Rails, Axum |
| Kontrak API              | REST/OpenAPI, tRPC, GraphQL, gRPC untuk komunikasi service yang relevan                                                                              |
| Database                 | PostgreSQL, MySQL/MariaDB, SQLite, MongoDB, Firestore, DynamoDB                                                                                      |
| ORM/data layer           | Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, Django ORM, Eloquent, GORM, Hibernate, Entity Framework Core, Active Record               |
| Backend terkelola        | Supabase, Firebase, Appwrite, PocketBase, Convex                                                                                                     |
| Auth                     | Better Auth, Auth.js, Clerk, Supabase Auth, Firebase Auth, Auth0, Keycloak, Laravel Sanctum/Fortify, OAuth/OIDC, session cookie                      |
| Akses                    | RBAC, permission per resource, organisasi/tenant bila diperlukan                                                                                     |
| CMS/konten               | MDX, WordPress, Payload, Strapi, Sanity, Directus, Contentful, Ghost                                                                                 |
| Commerce                 | Implementasi custom, Shopify, WooCommerce, Medusa, Saleor                                                                                            |
| Pembayaran               | Duitku, Midtrans, Xendit, Stripe, PayPal; kompatibilitas negara/merchant diperiksa                                                                   |
| Email/notifikasi         | Resend, Postmark, SendGrid, Amazon SES, SMTP, FCM, Web Push, WhatsApp Business API                                                                   |
| File/media               | S3-compatible, Cloudflare R2, Supabase Storage, Firebase Storage, Cloudinary, UploadThing                                                            |
| Cache dan queue          | Tanpa layanan tambahan, Redis/Valkey, pg-boss, BullMQ, Celery, RQ, Laravel Queue, RabbitMQ, SQS                                                      |
| Realtime                 | Polling, SSE, WebSocket, Socket.IO, Supabase Realtime, Firebase, Pusher, Ably                                                                        |
| Search                   | Pencarian database, PostgreSQL full-text, Meilisearch, Typesense, Algolia, Elasticsearch/OpenSearch                                                  |
| Tabel dan grafik         | TanStack Table, AG Grid, Recharts, Chart.js, Apache ECharts, D3                                                                                      |
| Peta                     | Leaflet, MapLibre, Mapbox, Google Maps                                                                                                               |
| Animasi dan grafis       | CSS/Web Animations, Motion, GSAP, Three.js, React Three Fiber, Lottie, Rive                                                                          |
| Internasionalisasi       | Intl, next-intl, i18next, vue-i18n, format tanggal/angka lokal                                                                                       |
| AI opsional              | API provider yang dikonfigurasi, AI SDK, pgvector, Qdrant; hanya bila fitur AI diperlukan                                                            |
| Analytics dan monitoring | Plausible, Umami, PostHog, GA4, Sentry, OpenTelemetry, Prometheus/Grafana                                                                            |
| Testing                  | Vitest, Jest, Testing Library, Playwright, Cypress, pytest, PHPUnit/Pest, Go test, JUnit, xUnit                                                      |
| Kualitas dan keamanan    | ESLint, Biome, Prettier, Ruff, PHPStan, audit dependency, Gitleaks, Semgrep, OWASP ZAP                                                               |
| Hosting dan operasi      | Vercel, Netlify, Cloudflare, Railway, Fly.io, Render, Supabase, Firebase, AWS, GCP, Azure, VPS, Nginx/Caddy, systemd                                 |
| Delivery                 | GitHub Actions, GitLab CI, native process, Docker opsional, Kubernetes hanya jika kebutuhan mendukung                                                |
| PWA/offline              | Service worker, Workbox, IndexedDB/Dexie jika diperlukan                                                                                             |

Katalog adalah pilihan terstruktur, bukan janji semua integrasi siap dijalankan.
Setiap opsi memiliki dependensi, konflik, cakupan, dan status dukungan. Validasi
menghalangi kombinasi yang jelas salah, misalnya Pinia untuk React atau Prisma
untuk Firestore; pilihan custom tetap ditandai perlu tinjauan.

Rekomendasi awal untuk sembilan jenis website:

| Jenis web          | Arah rekomendasi                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Landing page       | Next.js SSG atau Astro, TypeScript, styling ringan; database hanya jika ada fitur data       |
| Company profile    | SSG/SSR, SEO, konten terstruktur; CMS bila editor nonteknis memerlukannya                    |
| Portofolio         | Astro/Next.js SSG, media optimal; CMS dan motion sesuai kebutuhan                            |
| Blog/media         | Astro/Next.js, MDX atau CMS, SEO, pencarian sesuai volume konten                             |
| Toko online        | Platform commerce atau Next.js + PostgreSQL + ORM; pembayaran, stok, admin, notifikasi       |
| SaaS               | Next.js + TypeScript + PostgreSQL + Prisma/Drizzle + auth; billing/tenant/queue sesuai fitur |
| Dashboard internal | React/Next.js, PostgreSQL, auth/RBAC, tabel/grafik; audit aktivitas sesuai data              |
| Booking/reservasi  | Next.js, PostgreSQL, transaksi slot/jadwal, timezone, pengingat; payment bila diperlukan     |
| Custom             | Kebutuhan brief menentukan pilihan; tampilkan asumsi serta pertanyaan yang berdampak besar   |

Kriteria penerimaan: rekomendasi punya alasan, pilihan manual terkunci, konflik
ditampilkan sebelum generasi, dan keputusan konsisten di arsitektur/API/data/
deployment/testing tanpa menambahkan fitur yang tidak diminta.

## 6. Palet warna HEX sampai 10 warna

Mode manual dimulai dengan **Primary** dan **Secondary**. Tombol **+ Tambah warna**
menambah slot sampai total 10; delapan slot tambahan dapat dinamai dan dihapus.
Tombol tambah dinonaktifkan ketika batas tercapai. Dua slot utama tetap tersedia.

- Setiap slot menyediakan color picker, input HEX, swatch, label/peran, dan salin.
- Terima `#RGB` atau `#RRGGBB`, simpan sebagai `#RRGGBB`. Validasi client/server;
  nilai tidak valid tidak diteruskan ke hasil dan tidak menyebabkan kehilangan input.
- Gunakan peran seperti accent, background, surface, text, atau border untuk slot
  tambahan. Token status/focus dapat diturunkan otomatis, bukan menambah slot
  pengguna melewati batas 10.
- Tampilkan preview tombol, teks, kartu, serta status kontras. Target rasio teks
  normal 4.5:1, teks besar 3:1, dan komponen/fokus yang relevan 3:1.
- Bila warna brand kurang kontras, tampilkan perbaikan pasangan foreground/
  background. Jangan mengubah HEX yang dikunci secara diam-diam.
- Sediakan light, dark, atau mengikuti sistem. Gunakan palet yang sama sebagai
  input; pasangan token tiap tema ditinjau terpisah.
- Ekstraksi palet dari referensi hanya menghasilkan usulan yang bisa diterapkan
  pengguna. Hasil tersimpan sebagai token di `specs/design.md`.

Kriteria penerimaan: batas 10 berlaku juga lewat API, input/preview konsisten,
pilihan bertahan setelah reload dan pindah mode, kontras diperiksa berdasarkan
pasangan warna yang benar-benar dipakai.

## 7. Gaya otomatis dan manual

Gunakan data/panduan skill desain yang hak penggunaannya sudah diperiksa.
`ui-ux-pro-max` menjadi kandidat sumber pencarian gaya/font/palet, `impeccable`
serta `design-taste-frontend` untuk arah visual, `ui-craft` untuk struktur dan
aksesibilitas, `emil-design-eng` untuk interaksi dan motion. Aturan yang bertabrakan
diselesaikan melalui profil per proyek, bukan ditumpuk sebagai instruksi wajib.

Otomatis menyarankan satu profil sesuai audiens, brand, jenis website, dan
referensi. Manual membuka pengaturan berikut dengan preview:

| Bagian               | Pilihan/detail                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Arah visual          | Minimal, editorial, corporate, playful, luxury, brutalist, retro, utilitarian, soft, material, flat, glass; ringkasan karakter dan kesesuaian |
| Tipografi            | Font heading/body/mono, pasangan font, weight, ukuran, type scale, line-height, letter spacing, fallback, dukungan bahasa dan lisensi         |
| Layout               | Lebar kontainer, grid/kolom, alignment, simetri/asimetri, sidebar, single/multi-column, ritme section, kepadatan informasi                    |
| Struktur halaman     | Hero, navigasi, CTA, section, footer, pola landing/dasbor/editor sesuai kebutuhan                                                             |
| Spacing              | Skala jarak, padding, gap, margin, section spacing, compact/comfortable                                                                       |
| Bentuk dan surface   | Radius, border, shadow/elevation, divider, background, gradient/tekstur dengan batas keterbacaan                                              |
| Komponen             | Tombol, input, kartu, tabel, menu, tab, dialog; ukuran, varian, state hover/focus/disabled/loading/error                                      |
| Ikon dan media       | Library ikon yang kompatibel, stroke/filled, rasio gambar, crop, ilustrasi/fotografi, placeholder yang jelas                                  |
| Motion               | Tidak ada/ringan/ekspresif, durasi, easing, transisi halaman, reveal; penghormatan reduced motion                                             |
| Responsif            | Mobile-first, breakpoint, perubahan kolom, navigasi mobile, perilaku tabel dan overflow                                                       |
| Tema                 | Light/dark/system, hubungan warna dan surface, token komponen setiap tema                                                                     |
| UX dan aksesibilitas | Hierarki heading, focus, keyboard, touch target 44px, form, loading/empty/error/success, bahasa antarmuka                                     |

Pemilih font dapat dicari dan menampilkan contoh teks Indonesia. Font yang belum
tersedia dicatat sebagai permintaan dengan fallback; tidak mengunduh atau
memasukkan semua font sekaligus. Custom value memiliki batas tipe/rentang, bukan
kolom CSS/HTML bebas.

Preview menampilkan contoh heading, paragraf, tombol, form, kartu, serta navigasi
dalam ukuran desktop/mobile. Ini preview sistem desain, belum merupakan website
target yang dibangun. Style, warna, dan komponen menggunakan sumber token yang sama.

Prioritas penyelesaian: aturan keamanan aplikasi; pilihan pengguna yang eksplisit;
preferensi referensi yang telah ditinjau; rekomendasi skill/sistem. Konflik yang
memengaruhi hasil tampil di ringkasan sebelum generasi.

Kriteria penerimaan: pilihan manual tidak diganti writer, nilai otomatis dapat
ditelusuri alasannya, preview mengikuti token tersimpan, spesifikasi desain dan
komponen memiliki keputusan yang sama.

## 8. Markdown keamanan dan verifikasi setiap perubahan

Perkuat dokumen pada dua tingkat. Markdown memberi aturan dan bukti; kontrol
server, test, dan CI yang benar-benar menegakkannya.

Untuk repo Buatin:

- Tambahkan `SECURITY.md`: batas kepercayaan, akses data, upload, secrets, provider,
  dependency, pelaporan kerentanan, retensi, dan tindakan insiden.
- Tambahkan `TESTING.md`: prasyarat, perintah aktual, fixture aman, test matrix,
  bukti hasil, keterbatasan mock, dan cara menambah regression test.
- Tambahkan `docs/CHANGE_CHECKLIST.md`: perubahan, dampak, risiko, test relevan,
  hasil pengujian, aksesibilitas, migrasi/config, serta pemulihan.
- Perluas `AGENTS.md` tanpa menghapus aturan Next.js yang dihasilkan tooling.
  Tetapkan urutan baca, larangan secrets/produksi, dan verifikasi setelah edit.

Untuk dokumen website target:

- Lengkapi `templates/AGENTS.md` dengan aturan perubahan kecil, batas instruksi
  referensi/skill, larangan eksekusi konten pihak ketiga, dan bukti selesai.
- Lengkapi `templates/specs/security.md` dengan ancaman dan kontrol yang sesuai
  stack/fitur target: auth, access control, injection, XSS, CSRF, SSRF, upload,
  rate limit, webhook, secrets, privasi, serta uji negatif.
- Lengkapi `templates/specs/testing.md` dengan perintah sesuai stack target,
  unit/integration/E2E, regression test, unhappy path, serta bukti yang diperlukan.
- Selaraskan acceptance criteria, implementation plan, dan progress. Status test
  target tetap **belum dijalankan** sampai proyek target benar-benar diuji.

Pertahankan kontrak 42 dokumen + manifest dengan memperkuat dokumen yang sudah
ada. Penambahan file hasil generasi baru hanya dilakukan lewat perubahan katalog,
batas, dependency, manifest, dan test secara bersamaan.

Verifikasi otomatis repo Buatin:

1. Selama perubahan: test yang relevan dan regression test untuk bug yang diperbaiki.
2. Sebelum satu irisan dinyatakan selesai: format, lint, typecheck, unit test,
   integration test terkait, build web/worker, serta smoke test alur yang berubah.
3. Setiap push/PR: CI menjalankan pemeriksaan yang sudah ada, ditambah cakupan
   lampiran, konfigurasi, skill, dan secret scan. Temuan dependency high/critical
   atau kegagalan pemeriksaan wajib memblokir rilis; pengecualian perlu alasan,
   penanggung jawab, dan batas waktu yang tercatat.
4. Perubahan UI: uji desktop/mobile, keyboard, dan kontras. Perubahan keamanan:
   uji akses lintas akun, input berbahaya, batas resource, serta keluarnya secrets.
5. Sebelum rilis: seluruh alur penting, staging dengan provider yang dipakai,
   konfigurasi production, dan rencana rollback yang kompatibel dengan schema.

Perintah repo yang sudah tersedia: `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run test:integration`, `npm run test:e2e`,
`npm run build:worker`, `npm run build`, dan `npm audit --omit=dev`.

## 9. Data, API, dan generasi dokumen

Gunakan schema terstruktur dan terversi, bukan menyisipkan seluruh konfigurasi ke
textarea brief. Usulan awal:

- `Project.preferences`: JSON tervalidasi berisi `schemaVersion`, pilihan
  teknologi, palet, gaya, mode, nilai manual terkunci, dan pemilihan skill.
- `ProjectAttachment`: relasi ke proyek, pemilik melalui proyek, storage key,
  nama tampilan, MIME, ukuran, checksum, peran, catatan, status pemrosesan,
  ekstraksi terstruktur, versi pemroses, timestamps, dan expiry.
- `ProjectRevision`, `BriefPreset`, planning task, dan snapshot job membawa
  konfigurasi lengkap. Preset menyimpan preferensi tetapi tidak menyalin blob
  privat ke proyek lain; referensi perlu dipasang ulang secara eksplisit.
- Revisi mempertahankan ID/checksum versi lampiran yang masih tersedia. Restore
  menandai referensi yang sudah dihapus/kedaluwarsa, bukan memunculkan link rusak.
- Registry skill dan teknologi menggunakan file konfigurasi terversi pada tahap
  awal. Impor/pembaruan dijalankan admin melalui proses yang ditinjau; dashboard
  CRUD penuh dapat ditambahkan setelah pola katalog stabil.

Perluas endpoint create/update/detail proyek dan revisi/preset. Tambahkan kontrak
lampiran untuk upload/status/download/delete dan endpoint katalog/rekomendasi.
Semua input memakai validasi server; mode dan batas tidak hanya diperiksa browser.

Perubahan pengguna yang memengaruhi hasil menaikkan `briefVersion` melalui transaksi
yang sama, termasuk penambahan/penghapusan lampiran dan penerapan analisis AI.
Penyelesaian ekstraksi tidak menaikkan versi lagi: planner diblokir sampai semua
file selesai diperiksa, lalu mengambil teks/checksum yang stabil. PDF tanpa teks
yang lolos pemeriksaan dapat memakai catatan manual dengan peringatan OCR.
Callback worker ekstraksi harus memeriksa versi/checksum agar hasil lama tidak
menimpa file baru. Rencana dari versi sebelumnya ditandai kedaluwarsa.

Snapshot generasi mencatat konfigurasi resolved, pilihan asal user/sistem,
versi katalog/skill, referensi beserta checksum, dan profil kemampuan provider.
Resume memakai snapshot yang sama. Pembaruan skill tidak mengubah job berjalan.
Regenerasi memperhitungkan dependency closure pada snapshot hasil asal; resume
juga mempertahankan snapshot. Pilihan baru memerlukan penyusunan rencana baru.

Pemetaan ke hasil:

| Input                   | Dokumen hasil utama                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Referensi dan kebutuhan | `specs/brief.md`, `specs/prd.md`, `specs/assets.md`, `specs/design.md` sesuai relevansi |
| Teknologi               | `specs/architecture.md`, data/API/auth/integrations/deployment/testing sesuai fitur     |
| Warna dan gaya          | `specs/design.md`, `specs/components.md`, `specs/accessibility.md`                      |
| Skill aktif             | `AGENTS.md`, dokumen terkait skill, metadata versi/sumber pada manifest                 |
| Keamanan dan verifikasi | `specs/security.md`, `specs/testing.md`, acceptance, implementation plan, progress      |

Jangan membuat referensi Markdown ke dokumen yang tidak dipilih. Reference digest
memuat metadata dan deskripsi stabil; tidak mengekspor path storage, secrets,
URL privat sementara, atau file asli tanpa tindakan pengguna. Paket skill/aset
tambahan, bila dibutuhkan, menggunakan unduhan terpisah dengan manifest dan
allowlist sendiri agar batas ZIP dokumen tidak berubah diam-diam.

Kontrol biaya mencakup ukuran ekstraksi, jumlah gambar, resolusi, token, waktu,
retry, antrean, dan rate limit per akun. Gunakan mekanisme kuota/entitlement yang
sudah ada; jangan otomatis mengubah harga paket atau menambah layanan berbayar.

## 10. Urutan implementasi dan file terdampak

Setiap tahap harus berjalan dari input sampai hasil yang dapat diperiksa.

| Tahap               | Pekerjaan dan lokasi utama                                                                                                                              | Bukti selesai                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0. Baseline         | Jalankan pemeriksaan awal, catat hasil di `docs/VALIDATION.md`, baca panduan Next.js lokal yang relevan, tetapkan schema preference dan kontrak katalog | Kegagalan lama dipisahkan dari perubahan baru; contoh payload dan migrasi ditinjau                    |
| 1. Fondasi + warna  | `prisma/schema.prisma` dan migration, `src/domain/types.ts`, validator baru, `src/server/projects.ts`, API types/routes, bagian palet pada editor       | Simpan/reload 2-10 warna, version conflict, snapshot, preset/revisi bekerja                           |
| 2. Teknologi        | Katalog dan aturan rekomendasi di `config/` serta `src/domain/`, komponen teknologi di `src/features/projects/`, planner/writer/prompts                 | Sembilan jenis web punya rekomendasi; manual terkunci; hasil arsitektur konsisten                     |
| 3. Gaya             | Komponen pemilih font/layout/detail, preview token, aturan skill desain yang telah ditinjau, template desain/komponen                                   | Otomatis/manual berjalan, preview desktop/mobile, token sesuai hasil                                  |
| 4. Referensi        | Model lampiran, adapter storage privat, API upload/akses, worker ekstraksi/vision, editor, maintenance                                                  | Upload/analisis/preview/hapus end to end, penolakan file berbahaya, isolasi akun dan retensi terbukti |
| 5. Katalog skill    | Registry/importer admin, sumber/lisensi/dependensi, pemilih skill, pemuatan konteks relevan, snapshot/manifest                                          | Seluruh inventaris punya status; skill yang diaktifkan memengaruhi hasil dan bisa ditelusuri          |
| 6. Keamanan + rilis | Markdown keamanan/testing/checklist, template fallback, lint hasil, `.github/workflows/ci.yml`, test, README/API/env example                            | Pemeriksaan wajib lulus, main failure paths diuji, staging dan batas dukungan didokumentasikan        |

Keamanan dan pengujian diterapkan pada setiap tahap; tahap terakhir menggabungkan
verifikasi, dokumentasi, dan kesiapan rilis. Pecah editor menjadi komponen sesuai
fitur agar `editor.tsx` tidak menampung seluruh implementasi.

## 11. Pengujian penerimaan

| Area         | Kasus wajib                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Penyimpanan  | Reload, autosave gagal, offline, double submit, konflik antar-tab, migrasi draft lama                                                             |
| Lampiran     | File valid/rusak, ekstensi palsu, oversize, batas total, dekompresi berlebihan, parser timeout, scan gagal, pemrosesan stale, hapus saat diproses |
| Otorisasi    | Upload/status/download/delete milik akun lain ditolak; storage tidak dapat diakses publik                                                         |
| AI/referensi | Provider tanpa vision, ekstraksi tidak pasti, prompt injection dalam file, konteks/token melebihi budget, fallback yang diberi label              |
| Teknologi    | Sembilan jenis web, tidak perlu DB, kombinasi salah, custom value, perubahan jenis web, pilihan manual tetap terkunci                             |
| Warna        | HEX pendek/panjang, invalid, primary/secondary, slot ke-10, slot ke-11 lewat API, kontras, perubahan tema                                         |
| Gaya         | Font tidak tersedia, batas numeric, mode berganti, preview panjang, keyboard, mobile, reduced motion                                              |
| Skill        | Nama duplikat, checksum berbeda, lisensi belum jelas, dependensi putus, konflik, update katalog saat job berjalan, instruksi berbahaya            |
| Pipeline     | Planner menerima pilihan; writer mematuhinya; snapshot/resume/regenerasi/revisi/preset konsisten; batas ZIP dan secret blocker terjaga            |
| Regresi SaaS | Login/verifikasi, akses proyek, kuota, job cancellation/resume, pembayaran mock/sandbox, retensi tetap sesuai aturan server                       |

Unit test memeriksa aturan domain; integration test membuktikan API/DB/akses;
Playwright membuktikan alur brief sampai plan dan unduhan. Gunakan fixture sintetis
dan database lokal/test. Hasil mock tidak dijadikan bukti kemampuan vision atau
integrasi nyata. Uji staging eksternal dicatat terpisah sesuai provider/adapter.

## 12. Batas dan tindak lanjut

Semua enam permintaan masuk cakupan. Pencarian GitHub untuk skill yang kurang
menjadi bagian pemasukan katalog, dengan pemeriksaan sumber dan lisensi per item.
Tidak ada impor massal, instalasi plugin, perubahan runtime, atau panggilan AI
berbayar yang dilakukan pada tahap penyusunan plan ini.

Rincian yang perlu diverifikasi saat implementasi: hak penggunaan setiap skill,
API layanan plugin yang tersedia untuk web, kemampuan vision model 9router,
adapter penyimpanan produksi, pemindai dokumen, serta biaya operasional aktual.
Mode manual dan teks tetap menyediakan jalur penggunaan ketika integrasi belum siap.

Implementasi menambahkan dua migrasi additive, editor terstruktur, worker
referensi privat, katalog 40 kategori teknologi/27 skill, output konfigurasi
tersimpan, kebijakan keamanan/testing dan CI. Lima pack berlisensi diadaptasi;
20 entri inventaris lain tetap memiliki status dukungan yang jujur. GitHub
`webapp-testing` dipin pada commit yang ditinjau; bukan instalasi tool desktop.
Integrasi vision/provider, scanner nyata, S3 serta deployment publik tetap
memerlukan konfigurasi dan smoke test staging yang tercatat terpisah.
