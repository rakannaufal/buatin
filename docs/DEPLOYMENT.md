# Deployment awal: Vercel + Supabase + Railway worker

Pilihan pengguna: Vercel untuk web, Supabase untuk PostgreSQL dan storage privat,
Railway khusus worker AI. Satu URL HTTPS melayani semua pengguna. Browser hanya
mengakses API Buatin; kredensial database, Google secret dan S3 tetap di server.
Tidak perlu menjalankan database di komputer pengguna.

Konfigurasi repository belum berarti layanan sudah live. Project, domain,
environment dan kredensial produksi masih harus dihubungkan. Staging dan
production wajib memakai database, bucket, OAuth client serta secret terpisah.

## 1. Supabase: database online

Project tujuan pengguna sudah tersedia: **buatin**, ref
`oeznehkxknbgvbtunebu`, URL `https://oeznehkxknbgvbtunebu.supabase.co`, region
`ap-south-1`. Pada 21 Oktober 2026, CLI mendeteksi `ACTIVE_HEALTHY` dan query
metadata berhasil sebagai `postgres` pada PostgreSQL 17.11; izin membuat tabel
dan schema terkonfirmasi melalui SELECT privilege. Schema `public`
masih memiliki nol tabel; migration aplikasi belum diterapkan di project ini.
Verifikasi tersebut membuktikan akses SQL operator, belum koneksi runtime hosting.

1. Buka project tujuan di dashboard Supabase. Simpan password database di secret
   manager. Jangan memakai project lain yang berisi data tanpa meninjau isinya.
2. Buka **Connect**. Salin Transaction pooler URL untuk query Vercel. Salin Direct
   connection URL untuk migration/backup; gunakan jaringan yang mendukung IPv6
   bila endpoint direct hanya IPv6. Worker dapat memakai Direct atau **Session
   pooler**; transaction pooler tidak mempertahankan advisory lock worker.
3. Di Vercel, isi `DATABASE_URL` dengan Transaction pooler (umumnya port 6543).
   Di Railway worker, isi `DATABASE_URL` dengan Direct/Session agar Prisma worker
   tidak menambah transaksi pendek pada pool aplikasi Vercel. Isi
   `DATABASE_WORKER_URL` dengan Direct/Session di kedua environment. Semua URL
   wajib menuju project/database yang sama. Gunakan string persis dari Connect;
   username pooler biasanya menyertakan project ref, bukan hanya `postgres`.
4. `DATABASE_DIRECT_URL` digunakan Prisma migration dan backup. Jalankan migration
   dari Railway/jaringan yang mendukung endpoint direct. Untuk masalah IPv4/IPv6,
   periksa mode koneksi yang didukung Supabase; jangan mengganti host sembarangan
   atau mematikan verifikasi TLS. Koneksi lintas provider memakai TLS dan password.
5. Pada **Data API settings**, nonaktifkan Data API bila tidak diperlukan dan
   matikan **Automatically expose new tables**. Aplikasi ini memakai Prisma,
   bukan Supabase Auth atau Data API browser. Jangan menambahkan kebijakan RLS
   publik untuk membuat login bekerja.

Publishable/anon key tidak diperlukan pada arsitektur ini. URL project juga bukan
connection string PostgreSQL. Masukkan URL koneksi lengkap dari **Connect** ke
secret environment Vercel/Railway; jangan mengirim password atau service role key
melalui chat. CLI operator yang terautentikasi dapat mengelola schema, tetapi
token CLI tersebut tidak boleh dijadikan kredensial runtime aplikasi.

Migration `20261021110000_server_only_data` mengaktifkan RLS tanpa policy pada
45 tabel aplikasi serta `_prisma_migrations`, mencabut akses PUBLIC dan role
Supabase `anon`/`authenticated` bila role tersedia. Koneksi server memakai role
pemilik migration atau role server yang memiliki izin/bypass RLS yang ditinjau.
Jangan menggunakan role anon/authenticated sebagai user koneksi Prisma.
Authorization per user tetap dilakukan oleh API Buatin, termasuk ownership dan
role admin; RLS ini melindungi akses Data API yang tidak disengaja.

Untuk memeriksa data, gunakan **Table Editor** atau **SQL Editor** privat Supabase.
Tabel `User`, `Account`, `Session`, `Project`, `Job`, `Payment`, dan `AuditEvent`
terisi melalui aplikasi. Gunakan panel Admin untuk role, saldo, voucher dan harga,
agar validasi serta audit tercatat. Hindari perubahan keuangan langsung melalui
SQL. Jangan membuka password DB/S3/service role pada browser atau Git.

## 2. Supabase Storage

1. Buat bucket privat, misalnya `buatin-references`; jangan aktifkan public bucket.
2. Pada S3 configuration, generate **S3 Access Key ID** dan **Secret Access Key**.
   Keduanya bukan anon/publishable key dan bukan Google OAuth credential.
3. Isi `REFERENCE_STORAGE=s3`, bucket, region project dan endpoint dari dashboard.
   Endpoint resmi berbentuk `https://PROJECT_REF.storage.supabase.co/storage/v1/s3`.
   Gunakan credential yang sama pada Vercel dan Railway worker.
4. Uji upload di Vercel, pemrosesan worker, download dengan ownership, dan penolakan
   pengguna lain. S3 key memiliki akses luas dan melewati Storage RLS; hanya
   simpan pada secret environment server. Browser tidak memakai SDK S3 langsung.

## 3. Vercel: web

1. Import repository `rakannaufal/buatin`, pilih branch yang lolos CI. Framework
   Next.js, Node **24.x**, root `/`. `vercel.json` menetapkan build/instalasi,
   region `sin1`, dan batas durasi fungsi API 300 detik. Aktifkan Fluid compute
   sesuai dukungan paket. Tidak ada proses worker di fungsi web.
2. Isi variable dari `deploy/hosted.env.example` pada environment tujuan. `APP_URL`
   dan `BETTER_AUTH_URL` harus sama dengan origin HTTPS final, tanpa trailing slash.
   Jangan menghubungkan preview acak ke database produksi atau OAuth produksi.
3. Deploy dengan build `npm run build:hosted`. Build hanya menghasilkan Prisma
   client, worker typecheck/build dan Next; tidak menjalankan migration atau
   membuat owner. Lakukan migration Railway sebelum membuka web kepada pengguna.
4. Runtime assets `templates`, `prompts`, `config` dan `skill-packs` disertakan
   melalui file tracing. Tidak ada data privat pada direktori `public`.

Vercel Functions memiliki batas request/response buffered **4.5 MB** pada
panduan yang diperiksa 21 Oktober 2026. Saat `VERCEL=1`, aplikasi otomatis
membatasi gambar/dokumen dan total konten ZIP menjadi **3 MiB**, serta pool Prisma
maksimum **3 koneksi per instance**. UI membaca batas unggahan server. Batas total
lampiran per proyek tetap terpisah. ZIP terlalu besar ditolak dengan petunjuk
unduh file individual; dokumen tidak dipotong diam-diam.

Tidak ada janji bahwa autoscaling Vercel menyediakan kapasitas DB tak terbatas.
Pantau jumlah instance, pool Supabase, throughput, egress dan limit paket. Pekerjaan
planner/generasi dijalankan worker; jangan memindahkannya ke callback OAuth,
Vercel Cron, atau proses background yang hilang sesudah respons fungsi berakhir.

## 4. Railway: worker tetap

1. Buat satu service dari repository yang sama. Gunakan Railpack; `railpack.json`
   memilih Node 24, instalasi lockfile, build dan start worker.
2. Set `RAILPACK_PRUNE_DEPS=false`, `NEXT_TELEMETRY_DISABLED=1`. Start command:
   `npm run start:hosted-worker`. Pre-deploy command: `npm run db:migrate`.
   Worker harus memakai commit/migration yang sama dengan web.
3. Isi environment yang sama untuk origin web, auth, S3, email, model dan budget.
   Sesuaikan URL database menurut langkah Supabase. `LLM_BASE_URL` harus HTTPS
   dan dapat dijangkau **Vercel serta Railway**; `localhost` atau jaringan privat
   Railway tidak dapat dipakai Vercel. Kunci 9router hanya di server.
4. Gunakan satu replica, sleep/serverless dimatikan. Drain minimal 45 detik.
   Singleton database lock mencegah dua worker aktif; saat upgrade, hentikan
   worker lama sebelum memulai yang baru. Kapasitas awal memakai
   `WORKER_CONCURRENCY=2`; ukur sebelum menaikkannya.
5. Pasang scanner ClamAV-compatible dengan signature yang diperbarui pada runtime
   worker. Isi `REFERENCE_SCANNER_PATH`. PDF/DOCX ditolak tanpa scanner. Railpack
   awal tidak otomatis memasang scanner atau PostgreSQL CLI.
6. Siapkan backup job/volume persisten terpisah, PostgreSQL CLI versi 17 atau lebih
   baru, key backup terpisah, dan salinan terenkripsi di luar host. Snapshot volume
   DB tidak mencakup lampiran. Jalankan rehearsal restore database dan blob.

Worker tidak membutuhkan domain HTTP publik. Pantau heartbeat lewat
`/api/health/ready` pada web; 503 berarti DB/migration/worker belum siap. Endpoint
`/api/health/live` hanya membuktikan proses web. Monitoring harus berjalan di luar
host. Scanner dibaca dari heartbeat worker yang masih segar, bukan path filesystem
Vercel. Backup job mencatat waktu bundle terenkripsi selesai ke database bersama;
panel web tidak perlu membaca volume Railway. Receipt ini tidak membuktikan
volume masih tersedia, salinan di luar host, kesehatan signature scanner atau
keberhasilan restore. Bukti tersebut tetap harus diperiksa operator.

## 5. Google login publik

1. Pada Google Cloud Console, buat/pilih project. Pada **Google Auth Platform**,
   lengkapi branding, kontak, homepage, privacy dan terms dari domain web final.
2. Pilih audience **External** untuk akun Google umum. Selama Testing hanya test
   users diizinkan; ubah ke **In production** sebelum digunakan publik. Ikuti
   verification jika Google mewajibkannya untuk konfigurasi project tersebut.
3. Buat OAuth client **Web application**. Authorized JavaScript origin adalah
   origin Vercel/domain final. Authorized redirect URI harus tepat:
   `https://DOMAIN_WEB/api/auth/callback/google`.
4. Simpan `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di environment server,
   lalu redeploy. Tidak ada prefix `NEXT_PUBLIC_`, wildcard domain atau kredensial
   lokal pada produksi. Staging memakai client/redirect terpisah.
5. Tombol **Lanjutkan dengan Google** muncul jika credential dan Turnstile lengkap.
   Uji akun baru/lama, cancel, suspend, dan signup pause pada domain tujuan.

Scope hanya `openid`, `email`, `profile`. Token Google tidak dipertahankan.
Email provider wajib terverifikasi. Email yang sudah ada hanya ditautkan bila
akun lokal juga terverifikasi. Akun baru ber-role `user`; identitas provider unik.
Callback memakai state cookie/database sekali pakai dan PKCE dari Better Auth.

Better Auth 1.7.11 menantang MFA aplikasi hanya pada login credential. Pengguna
ber-MFA serta owner/admin harus memakai email/password/autentikator; Google
mereka ditolak dengan petunjuk yang jelas. Pengguna Google dapat membuat password
melalui **Lupa password**, lalu mengaktifkan MFA. Jangan menonaktifkan MFA untuk
mengatasi penolakan ini. Supabase Auth tidak digunakan untuk login, sehingga
provider Google tidak dikonfigurasi pada dashboard Supabase Auth.

## 6. Environment dan aktivasi

Template: `deploy/hosted.env.example`. Variable berikut wajib dipenuhi:

| Kelompok         | Variable/kebutuhan                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| URL dan database | `APP_URL`, `BETTER_AUTH_URL`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, `DATABASE_WORKER_URL`                         |
| Auth             | `BETTER_AUTH_SECRET` acak minimal 32 karakter, kedua Google credential, `ADMIN_REQUIRE_2FA=true`                   |
| Email            | `EMAIL_PROVIDER=resend`, `EMAIL_FROM` domain terverifikasi, `RESEND_API_KEY`, `OWNER_EMAIL`, `SUPPORT_EMAIL` nyata |
| Anti-abuse       | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` untuk domain web                                                      |
| AI               | `MOCK_LLM=false`, endpoint HTTPS 9router, header auth, key baru, ID model planner/writer                           |
| Biaya            | `LLM_DAILY_BUDGET_USD`, tarif input/output konservatif yang diverifikasi; cap tagihan provider                     |
| Storage          | S3 private bucket, endpoint HTTPS, region, access/secret key bersama                                               |
| Operasi          | Scanner worker, backup persisten/key terpisah, monitoring dan alert eksternal                                      |

Set pool kecil pada awal: Vercel maksimal 3 per instance; Railway dapat memakai
`DATABASE_POOL_MAX=5`, `DATABASE_WORKER_POOL_MAX=3`. Tambahkan satu koneksi lock,
readiness, migration dan backup, lalu sisakan cadangan kapasitas Supabase.
`DATABASE_DIRECT_URL`/worker tidak boleh diarahkan ke project berbeda.

Pada environment hosting tujuan, jalankan:

```sh
npm run check:hosted
npm run db:migrate
npm run owner:create
npm run provider:check
npm run check:production -- --provider
```

`check:hosted` memeriksa bentuk konfigurasi tanpa menghubungi provider; bukan
bukti credential/domain/DB benar. Bootstrap owner melalui terminal privat Railway
memakai `OWNER_EMAIL` nyata dan password tersembunyi. Aktifkan MFA melalui Akun,
simpan recovery codes. Owner tidak otomatis diberikan berdasarkan email Google.

Database produksi baru dimulai kosong; akun/fixture laptop tidak ikut dipindah.
Data lama yang memang dibutuhkan perlu snapshot terenkripsi, rehearsal restore
serta cutover terencana. Migration identity menolak duplikasi; jangan menggabungkan
atau menghapus akun otomatis untuk meloloskan migration.

Lakukan smoke staging untuk Google nyata, email sampai diterima, storage bersama,
scanner, generation, reboot worker dan restore. Uji beban memakai mock di staging.
Integration/E2E repository sengaja menolak database/domain produksi. Jangan
menganggap fixture membuktikan koneksi Google, Supabase, Vercel atau Railway.
Paket berbayar tetap nonaktif sampai merchant/harga/callback produksi diuji.

## Biaya dan perpindahan berikutnya

Periksa ketentuan Vercel Hobby untuk penggunaan komersial sebelum melayani klien
berbayar; gunakan paket yang sesuai. Supabase Free memiliki kuota/pause/backup
berbeda dari paket berbayar; Railway worker tetap memakai resource berbayar
sesuai usage. Biaya AI/email/egress terpisah. Aktifkan cap dan alert pada dashboard;
konfigurasi ini tidak menjanjikan layanan gratis atau kapasitas jumlah user tertentu.

Arsitektur tetap portabel: PostgreSQL + Prisma migration, S3-compatible storage,
Next.js web dan worker Node. Saat pindah, lakukan backup/restore rehearsal,
sinkronisasi bucket, maintenance/cutover singkat, ubah environment, lalu smoke.
Jangan mengubah schema atau autentikasi hanya karena provider hosting berubah.

## Referensi resmi

- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/functions/configuring-functions/duration
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/hardening-data-api
- https://supabase.com/docs/guides/storage/s3/authentication
- https://docs.railway.com/builds/railpack
- https://railpack.com/config/file
- https://railpack.com/languages/node
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://www.better-auth.com/docs/authentication/google
