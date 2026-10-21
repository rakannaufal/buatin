# Buatin

SaaS untuk mengubah brief website menjadi paket spesifikasi Markdown. Akun publik terverifikasi, paket Free serta tiga tingkat Pro, pembayaran QRIS Duitku. Seluruh interaksi melalui website: login, sembilan tipe website, impor teks, draft, rencana dokumen, klarifikasi, checklist, generasi persisten, pembatalan/resume, preview, unduhan ZIP, dan riwayat.

Editor menyediakan lampiran privat, teknologi otomatis/manual (40 kategori), palet
HEX 2–10 warna, gaya/typography/layout terperinci, preview desktop/mobile dan
katalog 27 skill. Preferensi mengikuti autosave, revisi, preset dan snapshot hasil.
Pengaturan tersebut mendeskripsikan website target; Buatin tetap menghasilkan
spesifikasi Markdown.

**Tanpa Docker, n8n, atau Telegram.** Stack: Next.js App Router + React + TypeScript, Tailwind CSS, komponen Radix, React Hook Form + Zod, TanStack Query, PostgreSQL + Prisma, Better Auth, dan pg-boss. Next.js melayani UI/API; worker Node.js menjalankan pekerjaan panjang. PostgreSQL menyimpan queue dan checkpoint sehingga Redis tidak diperlukan.

## Status dan batas

- Default **MOCK_LLM=true**. Mock hanya fixture berlabel; bukan spesifikasi AI final.
- Katalog tetap 42 Markdown + manifest otomatis, maksimum 43 entri ZIP.
- 42 template builtin terstruktur dengan checksum; kit original dapat dipakai bila sumber/haknya jelas. Hasil selalu perlu ditinjau manusia.
- Pendaftaran publik dengan verifikasi email. Admin/owner mengelola layanan; seluruh proyek tetap diisolasi per akun.
- Free sekali seumur hidup; Starter 3/minggu, Plus 10/minggu, Max 25/minggu. Harga belum ditentukan, checkout dinonaktifkan sampai dikonfigurasi.
- Satu proses worker dengan konkurensi konfigurabel (default 2 akun). Maksimal satu generasi berjalan per akun; Max dapat mengantrekan 10 proyek.
- Hosting, database produksi dan domain HTTPS disiapkan kemudian. Kesiapan aplikasi dan prioritas ada di `docs/PRODUCTION_READINESS.md`.

Panel admin menyediakan izin owner/admin, verifikasi ulang, pengguna/suspend/sesi,
harga terversi, voucher, refund berbukti, kredit/grant, audit, kontrol AI, konten,
privasi, bantuan dan laporan. Panduan penggunaan serta batas operasional:
[Panduan admin](docs/ADMIN_GUIDE.md). Rancangan awal tersimpan di
[Rencana panel admin](docs/ADMIN_PLAN.md).

## Paket dan fitur

Tabel berikut adalah default awal. Kebijakan aktif ditampilkan pada website;
publish admin dapat mengubah penawaran baru. Pembelian lama memakai snapshot.

| Fitur                                   | Free           | Pro Starter | Pro Plus     | Pro Max   |
| --------------------------------------- | -------------- | ----------- | ------------ | --------- |
| Generasi                                | 1 seumur hidup | 3/minggu    | 10/minggu    | 25/minggu |
| Retensi hasil                           | 14 hari        | 30 hari     | 90 hari      | 180 hari  |
| 9 tipe, checklist, preview, ZIP, resume | Ya             | Ya          | Ya           | Ya        |
| Revisi brief dan perbandingan hasil     | -              | -           | Ya           | Ya        |
| Regenerasi pilihan + dokumen terdampak  | -              | -           | Ya           | Ya        |
| Preset brief pribadi                    | -              | -           | 50           | 50        |
| Template Markdown pribadi               | -              | -           | -            | 42        |
| Antrean beberapa proyek                 | -              | -           | -            | 10 aktif  |
| Prioritas                               | Standar        | Standar     | Lebih tinggi | Tertinggi |

Semua batas fitur ditegakkan server. Regenerasi memakai satu kuota baru; resume tidak.
Reservasi kuota berada dalam transaksi dengan advisory lock per akun. Ledger tidak
hilang saat proyek dihapus. Kegagalan permanen mengembalikan kuota sekali ke periode
asal; proses yang dikembalikan ditutup. Gangguan sementara/worker dapat dilanjutkan,
atau ditutup dari halaman progres untuk mengembalikan kuota. Pembatalan sebelum AI
mulai mengembalikan kuota; sesudah AI mulai tetap dihitung.

Planner dibatasi terpisah: Free 5 penyusunan rencana seumur hidup, Pro maksimal
`min(120, weeklyQuota * 4)` per minggu, ditambah batas per jam. Ini membatasi biaya
AI sebelum generasi. Satu task planner memiliki retry dan perbaikan JSON terbatas.

## Email dan akun publik

`EMAIL_PROVIDER=local` hanya bekerja pada APP_URL loopback. Email disiapkan di
antrean DB, worker menulisnya ke `.local/mail/*.txt` (0600); buka secara lokal
untuk verifikasi dan reset password. Tautan tidak pernah dikembalikan melalui API
publik. Folder tersebut privat dan dibersihkan setelah tujuh hari. Mode ini bukan
pengiriman email nyata.

Produksi: isi `EMAIL_PROVIDER=resend`, `EMAIL_FROM` dari domain terverifikasi,
`RESEND_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SUPPORT_EMAIL`,
dan APP_URL HTTPS. Pendaftaran/recovery di domain publik ditolak bila konfigurasi
belum lengkap. Verifikasi email wajib; reset password mencabut sesi lama. Kunci
Turnstile diverifikasi di server beserta hostname. Role tidak dapat dipilih pada signup.

## QRIS Duitku

Hanya kanal QRIS NQ/SQ yang dipilih operator dan aktif pada merchant. Tidak ada
kartu, VA, atau autodebit. Isi `DUITKU_ENV=sandbox`, `DUITKU_MERCHANT_CODE`,
`DUITKU_API_KEY`, `DUITKU_QRIS_METHOD`, `DUITKU_EXPIRY_MINUTES`. Kredensial sandbox
dan produksi berbeda. Di `/admin/plans`, susun draft, tinjau lalu publish harga berdasarkan biaya AI lalu aktifkan
paket. Default harga null sehingga aplikasi tidak membuat tagihan dengan angka usulan.

Callback publik HTTPS: `/api/billing/duitku/callback`, form-urlencoded dengan HMAC
SHA256 sesuai dokumentasi Duitku terbaru. Event valid disimpan sebelum HTTP 200;
worker mengonfirmasi status langsung ke Duitku sebelum mengaktifkan paket. Redirect
browser tidak mengubah pembayaran. Browser hanya membaca DB aplikasi; rekonsiliasi
provider memakai backoff dan batas percobaan. Order tidak pasti tidak digandakan.

Perpanjangan satu bulan kalender manual. Perpanjangan awal/tingkat baru dimulai
setelah masa sudah dibayar berakhir. Satu perpanjangan di muka; tidak ada prorata.
Pemakaian satu minggu tetap sama meski periode pembayaran berganti. Pengingat
berakhir dikirim tiga hari sebelumnya jika pengguna mengaktifkannya. Detail:
`docs/BILLING.md`. Tidak ada pembayaran nyata dilakukan oleh tes.

## Lokal: Node.js 24 + PostgreSQL native

Prasyarat: Node.js 24.x, npm, PostgreSQL 17 dengan `initdb`, `pg_ctl`, `psql`, `createdb`, `pg_dump`, dan `pg_restore` pada PATH. macOS dapat memasang `node@24` dan `postgresql@17` melalui Homebrew; tidak perlu Docker Desktop. Pada mesin ini Node.js 24 tersedia di `/opt/homebrew/opt/node@24/bin`.

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm ci
npm run db:generate
npm run db:local
npm run db:migrate
npm run owner:create -- --generate
```

`db:local` menginisialisasi cluster privat `.local/postgres`, port loopback 55432, user/database `speckit`. Bila `.env` belum ada, script membuat password DB dan auth secret acak, permission 0600. PostgreSQL berjalan di background, bisa dihentikan dengan `npm run db:stop`. Cluster tidak menimpa service PostgreSQL lain.

Password owner disimpan privat di `.local/owner-password`; baca hanya pada terminal lokal. Email default `owner@localhost.test`. `npm run owner:create` tanpa `--generate` meminta password tersembunyi. CLI hanya untuk bootstrap admin. Pengguna biasa mendaftar melalui `/signup` dan memverifikasi email. Reset: `npm run owner:reset -- --generate` (session lama dicabut). Jangan menaruh file password, `.env`, `.local/`, atau hasil privat dalam Git.

Sesudah setup awal, jalankan satu terminal dari direktori proyek:

```sh
npm run dev
```

Peluncur memilih Node.js 24 dari PATH atau Homebrew secara otomatis, menyalakan
PostgreSQL lokal bawaan, menyiapkan Prisma client dan migration lokal, lalu
menjalankan mock AI, worker, dan web. Mock hanya menyala bila `MOCK_LLM=true`
(default); mode AI nyata tetap memakai konfigurasi provider di `.env`. Port web
mengikuti `APP_URL`, port mock mengikuti `MOCK_LLM_BASE_URL`.

Ctrl+C menghentikan web, worker, dan mock beserta proses anaknya. PostgreSQL
tetap berjalan agar data dan koneksi lokal tidak terganggu; hentikan terpisah
dengan `npm run db:stop` bila perlu. Jika port sedang dipakai, hentikan layanan
lama terlebih dahulu. Peluncur tidak menghentikan proses yang sudah ada.

Database selain bawaan `localhost/127.0.0.1:55432/speckit` harus dijalankan dan
dimigrasi sendiri; peluncur tidak memulai atau memigrasinya. Peluncur ini untuk
development HTTP loopback. Gunakan `npm start` dan `npm run start:worker` untuk
produksi. Worker terpadu tanpa watch; restart `npm run dev` sesudah mengubah kode
worker. Untuk menjalankan komponen secara terpisah: `npm run dev:web`,
`npm run dev:worker`, dan `npm run mock`.

Buka http://localhost:3000. Halaman publik di `/`, paket di `/pricing`, workspace di `/dashboard`. `APP_URL` harus cocok dengan URL browser, termasuk skema dan hostname, agar pemeriksaan Origin/session benar. Admin membuka `/settings` untuk memeriksa AI dan `/admin` untuk pengelolaan. Verifikasi ulang berlaku lima menit sebelum mutasi. Harga diterbitkan di `/admin/plans`; grant/kredit berbeda dari pembayaran dan refund uang.

### PostgreSQL yang sudah tersedia

Gunakan `.env.example` sebagai acuan, isi `DATABASE_URL`, `BETTER_AUTH_SECRET` minimal 32 karakter acak, `OWNER_EMAIL`, `APP_URL`. Untuk DB managed atau service native lain, jalankan migration langsung; **jangan** menjalankan helper `db:local`. User DB membutuhkan hak membuat schema/tabel queue pg-boss. DB dan 9router tidak boleh dibuka publik.

## 9router nyata

1. Pasang dan jalankan 9router secara terpisah. Hubungkan provider sesuai ketentuan provider.
2. Isi `LLM_BASE_URL` (endpoint berakhiran `/v1`), `LLM_AUTH_MODE=header`, `NINEROUTER_API_KEY` (key klien milik 9router), serta model/combo planner dan writer dari endpoint `/models`. Key provider tetap dikelola 9router, bukan disisipkan ke brief atau browser.
3. Ubah `MOCK_LLM=false`, restart web dan worker. Jalankan pemeriksaan AI di Pengaturan. Setelah check lulus, pilih model yang tersedia.
4. Review plan sebelum konfirmasi generasi. Panggilan provider dapat menimbulkan biaya; alias combo tidak membuktikan model atau harga aktual.

Gunakan `npm run provider:check` untuk discovery tanpa inferensi;
`npm run provider:check -- --smoke` melakukan inferensi nyata terbatas yang tercatat.
Reservasi persisten membatasi request/token global dan per akun pada hari UTC.
Isi tarif konservatif seluruh model dan `LLM_DAILY_BUDGET_USD` sebelum produksi;
tarif/harga tidak ditebak aplikasi. Request gagal/usage hilang menahan cadangan.
Aktifkan batas pengeluaran di provider karena tagihan final dapat berbeda.

Akun menyediakan autentikator dua faktor, kode pemulihan privat dan pencabutan
sesi. Aktivasi mencabut sesi lain; operator wajib MFA pada domain publik.
Permintaan export/penghapusan data tercatat dari Akun dan ditinjau di Admin;
pemenuhannya mengikuti runbook privasi, bukan penghapusan otomatis.

`LLM_AUTH_MODE=none` hanya untuk instance internal yang memang dikonfigurasi tanpa autentikasi. Respons 401 tidak pernah menyebabkan fallback ke tanpa auth. Mock memakai URL/key fixture terpisah; key produksi tidak dikirim ke mock. Jangan arahkan URL mock ke provider sungguhan.

`LLM_SYSTEM_AS_USER=true` tersedia untuk provider yang memerlukannya. Timeout, interval, token, ukuran respons, total request, dan retry dibatasi. Pembatalan memutus fetch lokal dan menghentikan request berikutnya; provider mungkin masih menagih request yang sudah diterima.

## Template dan kualitas

### Kustomisasi brief

Unggah PNG/JPEG/WebP, PDF, DOCX, TXT atau MD di bagian Referensi. Default: 10 file,
5 MiB/gambar, 10 MiB/dokumen, total 25 MiB/proyek. Nama proyek wajib diisi agar
draft privat dapat dibuat. Teks diproses worker; gambar diubah menjadi WebP tanpa
EXIF. Beri peran, catatan, sumber dan hak penggunaan, lalu simpan catatannya.
Rencana menunggu file selesai diperiksa. PDF scan memerlukan OCR eksternal atau
catatan manual. URL sumber hanya dicatat, tidak di-fetch.

Gambar belum dipahami AI sampai pengguna menekan analisis. Tombol tersedia bila
admin mengatur `LLM_VISION_MODEL` ke ID model vision yang benar dan mock dimatikan.
Analisis mengirim gambar yang sudah disanitasi ke provider, maksimal 10/akun/jam,
satu request tanpa retry, usage tercatat; biaya mengikuti provider. Uji kemampuan
model di staging lebih dahulu. Mode manual tetap tersedia tanpa vision.

Teknologi, warna, gaya dan skill memiliki mode masing-masing. Manual boleh
sebagian, sisanya otomatis. Konflik stack ditampilkan dan ditolak server. Cari
teknologi di 40 kategori atau tulis arahan tambahan. Pilihan manual dipertahankan
saat mode berganti. Primary/Secondary tetap ada; tombol tambah membatasi palet
hingga 10 warna, menerima `#RGB` atau `#RRGGBB` lalu menormalkan menjadi HEX enam
digit. Indikator kontras membantu memilih pasangan teks.

Gaya mencakup arah visual, font heading/body/mono, layout, density, bentuk,
surface, navigasi, hero, ikon, media, motion, tema, ukuran, spacing dan breakpoint.
Preview memakai font lokal Manrope/Source Serif 4; font lain dicatat untuk target
dan memakai fallback dalam preview. Font custom perlu nama dan lisensi yang sah.

Skill aktif masuk konteks dokumen yang relevan. Katalog memuat seluruh inventaris
sesi: 5 panduan pihak ketiga yang diadaptasi, 2 panduan wajib Buatin, 20 entri
yang masih memerlukan koneksi/tinjauan atau tidak didukung. Plugin desktop tidak
otomatis menjadi layanan web. Skill yang belum siap tidak dapat diaktifkan.
Sumber, lisensi, commit/checksum tercatat; tidak ada script pihak ketiga dijalankan.
Detail pengelolaan: `skill-packs/README.md`.

Revisi menyimpan preferensi serta metadata/catatan referensi; preset hanya
menyimpan preferensi, tidak menyalin file privat. Resume dan regenerasi memakai
snapshot hasil asal, termasuk versi skill dan referensinya. Susun rencana baru
untuk memakai perubahan brief terbaru. Dokumen utama memiliki bagian konfigurasi
tersimpan agar pilihan manual tetap dapat ditinjau setelah perbaikan AI.

Panduan lazy loading dan skeleton loading disesuaikan jenis website/rendering,
bukan diwajibkan pada setiap halaman. Hero/LCP langsung tersedia; skeleton hanya
untuk batas async yang benar-benar menunggu, tanpa delay buatan. Proses panjang
memakai status/progres nyata. Aturan aksesibilitas, SEO dan pengukuran masuk
dokumen yang relevan. Detail: `docs/LOADING_STRATEGY.md`.

### Penyimpanan referensi

Development: `REFERENCE_STORAGE=local`, direktori `.local/references` di luar
`public/`, permission 0700/0600. Server dan worker harus mengakses lokasi yang
sama. Produksi: direktori privat persisten atau bucket S3-compatible privat,
atur `REFERENCE_S3_*`; enkripsi at rest, backup dan lifecycle diatur operator.
Untuk systemd dengan storage lokal gunakan path privat dalam direktori writable
service. Jangan menaruh bucket/keys di client atau menjadikan objek publik.

Pada domain publik, PDF/DOCX wajib lolos pemindai ClamAV-compatible melalui
`REFERENCE_SCANNER_PATH`. Tanpa scanner dokumen ditolak; gambar/teks tetap tersedia.
Parser berjalan di proses terpisah dengan heap/timeout/batas halaman dan ekspansi
arsip. Menghapus referensi melepasnya dari brief; blob tetap dipertahankan selama
dibutuhkan revisi/job. Maintenance membersihkan lampiran lepas dan blob yatim
setelah satu jam. Hapus proyek juga menjadwalkan cleanup melalui maintenance.
`db:backup` mencakup database dan blob dalam satu bundle terenkripsi yang diverifikasi.

Default `TEMPLATE_SOURCE=builtin` memakai 42 template terstruktur sesuai katalog.
`templates:verify` memeriksa kelengkapan/checksum; perubahan ditinjau sebelum
`templates:verify -- --update`. Kit original dapat dipasang ke path katalog dengan
`TEMPLATES_DIR` dan `TEMPLATE_SOURCE=original` setelah hak/isinya diverifikasi.
Mode `fallback` lama tetap diberi warning. Template builtin/original yang hilang
tidak diam-diam diganti kerangka kosong. Snapshot job lama tetap dipertahankan.

Planner memilih minimum + wajib tipe + fitur dengan bukti; server menegakkan dependency closure, urutan, kuota, dan batas. Edit plan membuat versi baru. Konflik antar-tab menghasilkan 409. `CLARIFY_MODE=auto` memberi maksimal satu putaran klarifikasi; `off` melewati pertanyaan.

Lint mendeteksi Markdown buruk, placeholder, potongan respons, tautan internal putus, path/secret, serta pemetaan REQ/AC/TEST/task. Satu pass perbaikan struktural dijalankan dengan budget yang sama; temuan tersisa tetap terlihat. Isi dokumen tidak pernah membuktikan proyek target sudah dibangun atau diuji. Preview menonaktifkan raw HTML dan gambar remote.

ZIP lengkap memuat tepat file pilihan + manifest. ZIP parsial berlabel `-partial`, mencatat file hilang, dan hanya tersedia bila rujukan aman. Rujukan ke file yang belum tersedia memblokir ZIP parsial; individual file aman tetap dapat diunduh. Secret selalu memblokir unduhan terkait. Job cancelled tidak diekspor.

## Verifikasi

Dengan DB, mock, worker, dan web aktif:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run security:scan
npm run skills:verify
npm run templates:verify
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build:worker
npm run build
npm audit --omit=dev
```

Integration wajib mock, memakai akun fixture terpisah lalu membersihkan data miliknya. Jangan arahkan tes ke DB produksi. E2E hanya berjalan pada aplikasi/database loopback dengan mock aktif; setiap tes membuat akun fixture sementara dan membersihkan akun, proyek, serta kuotanya setelah selesai. Password dan kuota owner tidak digunakan. Screenshot/ZIP disimpan di `test-results/` (diabaikan Git).

CI memakai PostgreSQL native Ubuntu, tanpa service container. Lihat `docs/VALIDATION.md` untuk hasil pengujian aktual dan batas cakupan. Kontrak REST tersedia di `docs/API.md`; keputusan arsitektur di `DECISIONS.md`.

Uji crash proses nyata: hentikan worker normal, lalu jalankan `npm run test:recovery` dengan DB lokal dan mock aktif. Script membuat worker anak khusus, menghentikannya dengan SIGKILL setelah checkpoint, menunggu lease uji 30 detik, lalu menguji restart/resume. Script hanya menghentikan proses anak buatannya dan membersihkan akun fixture. Jalankan kembali worker normal sesudahnya.

Kontrak SaaS lengkap tersedia di `docs/PROMPT_WEB.md`; aturan pembayaran serta pengoperasian di `docs/BILLING.md`; keputusan implementasi di `docs/BUATIN_IMPLEMENTATION.md`.

## Build dan deploy native

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run build:worker
npm run build
npm start
```

Worker: `npm run start:worker`. Runtime worker memakai `tsx` dari dependency terkunci; `build:worker` memvalidasi emit TypeScript, bukan entrypoint Node ESM mandiri. Jangan menghapus devDependencies dengan `npm prune --omit=dev` pada host worker.

Jalankan `npm run check:production` untuk pemeriksaan konfigurasi (read-only, tidak menagih). Perintah sengaja gagal pada konfigurasi mock/lokal.

Contoh Linux: checkout release ke `/opt/buatin/releases/<version>`, symlink `current`, user non-root `buatin`, environment privat `/etc/buatin.env` (0600). Pasang Node.js 24, PostgreSQL, Caddy dan scanner ClamAV-compatible. Sesuaikan path Node di `deploy/systemd/*.service`; worker membaca template/source secara read-only. Siapkan `.next` writable oleh user service. Pasang unit melalui administrator, arahkan DNS/domain dalam `deploy/Caddyfile`, set `APP_URL=https://domain-anda`, lalu aktifkan service web/worker/Caddy. Template dan `.env` tidak dilayani sebagai file publik.

Unit web, worker, backup dan monitoring tersedia di `deploy/systemd`. Buat
direktori privat serta key backup milik service user sebelum mengaktifkan timer.
Timer backup harian dan monitor tiap menit hanya contoh, belum dipasang ke host.
Hubungkan salinan off-site, retensi dan alert operator. Detail: `docs/OPERATIONS.md`.

Biaya tergantung VPS, backup, email, gateway, dan provider AI. Pilih satu VPS kecil terlebih dahulu, ukur penggunaan RAM/disk sebelum naik kelas. Tidak ada deployment atau perubahan DNS yang dilakukan oleh script proyek. Untuk rollback: hentikan worker, pindahkan symlink ke release sebelumnya yang kompatibel, restart web/worker. Jangan rollback schema secara destruktif otomatis.

## Backup, retensi, dan pemulihan

```sh
npm run backup:key
npm run db:backup
npm run backup:verify -- .local/backups/<direktori-backup> --restore
```

Bundle memakai AES-256-GCM, manifest/checksum, snapshot PostgreSQL dan blob privat.
Key disimpan 0600 di BACKUP_KEY_FILE, terpisah dari bundle. Restore membuat database
`buatin_restore_*` dan folder inspeksi privat; sumber tidak ditimpa. Inspeksi
dipertahankan untuk ditinjau dan dibersihkan manual. `db:check-restore` lama hanya
memverifikasi `.dump` lama tanpa lampiran. Lihat runbook untuk backup incomplete,
salinan off-site, rotasi key dan cutover terkontrol.

Jadwalkan backup harian lewat timer OS; enkripsi backup off-site, batasi akses, retensi backup maksimal 14 hari atau sesuai kebijakan pemilik. Backup membawa brief, session, dan snapshot privat. Cadangkan environment secara terenkripsi secara terpisah. Penghapusan proyek di aplikasi tidak menghapus backup lama; data bertahan sampai backup kedaluwarsa.

Maintenance tiap 10 menit menghapus hasil berdasarkan `Job.expiresAt`, dihitung dari retensi paket saat proses dibuat: 14/30/90/180 hari. Draft tanpa hasil kedaluwarsa setelah `DRAFT_TTL_HOURS` (24 jam). Ledger kredit Free, periode pemakaian, pembayaran, dan event verifikasi tidak ikut dihapus bersama proyek. Proses sehat aktif dikecualikan. Queue hanya memuat ID, tanpa brief. Penghapusan manual menolak proyek yang masih memproses.

Worker terhenti: checkpoint berhasil tetap tersimpan. Sesudah lease 15 menit kedaluwarsa (ditambah interval maintenance), job ditandai `WORKER_INTERRUPTED`; buka progres lalu pilih lanjutkan file tersisa. Operator dapat memperpendek TTL pada lingkungan uji. Jangan mengubah status job sehat langsung di database. Index unik dan fencing mencegah worker lama menulis setelah lease berubah.

## Troubleshooting

- **DB belum terhubung:** periksa PATH PostgreSQL, port 55432, jalankan `npm run db:local`, lalu migration.
- **Admin belum ada:** bootstrap melalui CLI. Pengguna umum memakai `/signup` dan verifikasi email.
- **403 Origin:** samakan URL browser dan `APP_URL`; restart web/worker setelah ubah env.
- **Worker belum siap:** jalankan worker; hanya satu worker dapat memegang advisory lock. Jangan menjalankan dev watcher dan service worker bersamaan.
- **Model hilang/401:** periksa URL `/v1`, key klien, auth mode, dan `/models`; tidak ada downgrade auth otomatis.
- **ZIP diblokir:** lihat laporan kualitas. Selesaikan file yang hilang atau perbaiki konten berbahaya; jangan menyembunyikan temuan.
- **Versi konflik:** muat ulang draft/plan sebelum menyimpan perubahan dari tab lain.
- **Kuota habis:** resume job yang sama tidak memakai kuota baru. Free tidak reset; Pro reset Senin 00.00 WIB. Pembayaran/perubahan paket tidak mereset pemakaian minggu berjalan.

Source tidak diberi lisensi publik otomatis. Pastikan hak penggunaan template/provider sebelum redistribusi.
