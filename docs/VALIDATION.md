# Hasil verifikasi Buatin

## Perbaikan audit produksi - 23 Oktober 2026

Bagian ini memperbarui status terdahulu. Lingkungan pengujian: Node 24,
PostgreSQL 17 khusus fixture, web port 3100, worker dan storage/outbox/backup
terpisah. Tidak ada data atau kredensial produksi pada integration/E2E.

| Perintah / pemeriksaan                                                         | Hasil aktual                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck`                    | Lulus                                                                                                   |
| `npm test`                                                                     | 129 tes, 17 file, lulus                                                                                 |
| `npm run test:integration`                                                     | 57 tes, 9 file, lulus                                                                                   |
| `npm run test:e2e`                                                             | 19 tes Chromium desktop/mobile, lulus                                                                   |
| `npm run test:migrations`                                                      | Upgrade mempertahankan invoice/manfaat/ledger, lulus                                                    |
| `npm run build:hosted`                                                         | Build Next.js dan worker lulus                                                                          |
| Instalasi/build bersih di `/private/tmp/buatin-production-build-1792721293966` | `npm ci --include=dev --no-audit` lalu `npm run build:hosted`, tanpa `.env` atau cache workspace, lulus |
| `npm run test:recovery`                                                        | SIGKILL nyata, lease kedaluwarsa, worker baru, resume 42/42 dokumen; checkpoint tidak berubah           |
| `npm run backup:key`, `npm run db:backup`, `npm run test:backup`               | Backup terenkripsi, restore database baru dan checksum lampiran lulus                                   |
| `npm audit --omit=dev --audit-level=high`                                      | Nol vulnerability dilaporkan                                                                            |
| `npm run security:scan`                                                        | 346 file source/config/docs, lulus; nilai secret tidak dicetak                                          |
| `npm run security:history`                                                     | 468 blob ditinjau sebelum commit; 2 kecocokan legacy yang dicabut, nol temuan belum ditinjau            |
| `npm run skills:verify`, `npm run templates:verify`                            | 5 skill pack ditinjau, 42 template lulus                                                                |
| HTTP metadata build lokal                                                      | Canonical/Open Graph empat halaman publik, sitemap empat URL, robots dan login noindex lulus            |

Regresi yang ditemukan selama verifikasi: batas template 32.000 byte memblokir
ekspor seluruh katalog; refund pembatalan menganggap nol request AI berarti belum
ada hasil; gate worker sempat memblokir penyimpanan draft; restore dump schema
aplikasi berbenturan dengan schema public bawaan. Semuanya diperbaiki dan
diverifikasi. Restore membersihkan objek hanya dalam database UUID baru yang
dibuat script, tidak menimpa sumber. Ekspektasi tes lama tentang mock AI diganti
dengan pemeriksaan dokumen template sebenarnya; cakupan kegagalan worker,
partial checkpoint, pembatalan dan ownership tetap diuji.

Tindakan cloud terbatas yang diminta pengguna: tiga credential lama yang
terekspos dicabut, sesi terkait dicabut, owner dipulihkan dengan password acak
privat dan MFA dipertahankan; bucket Supabase privat `buatin-references` dibuat.
Recovery tidak mempromosikan akun dan tidak mengaktifkan MFA tanpa operator.
Tidak ada password, hash, email akun nyata, atau token pemulihan dalam Git.

Query agregat Supabase terakhir: 12 migration selesai, satu owner aktif, dua
operator belum MFA, dua credential account tanpa password, satu bucket privat,
tidak ada heartbeat worker segar atau receipt backup aplikasi/luar host.
Tidak adanya receipt aplikasi tidak menyimpulkan status backup managed Supabase.

HTTP deployment aktif sebelum push: pricing 500, auth session 500, readiness
503, liveness 200; mode mock aktif, signup dan Google belum siap. Detail log
runtime Vercel dan environment hosting belum dapat diakses dari sesi ini;
akar error DB/auth belum dibuktikan. Guard konfigurasi/error aman, pipeline
deploy dan smoke sudah disiapkan di kode, belum menjadi bukti runtime pulih.

Gate terbuka: koneksi runtime Vercel, worker persisten/scanner, Google/Resend/
Turnstile, MFA operator, secret/environment GitHub produksi serta branch rules,
S3 web/worker, backup luar host dan restore cloud. Pembayaran nyata, inference
9router, load/soak, Safari/Firefox dan CWV produksi belum diuji. Rilis publik
atau pembayaran belum diterima. Runbook: `docs/PRODUCTION_RELEASE.md`.

## Database dan perbaikan build Vercel - 21 Oktober 2026

Screenshot pengguna menunjukkan deployment Vercel project `buatin`, team
`rakannaufals-projects`, dari branch `main` commit `2adb968`. Commit itu belum
memuat implementasi admin dan konfigurasi hosted pada `codex/admin-management`.
Push berikutnya harus memperbarui `main` secara fast-forward, bukan sekadar
redeploy commit lama. Provider worker pengganti ditunda sesuai arahan pengguna.

Reproduksi pada instalasi `npm ci --include=dev` tanpa Prisma Client menghasilkan
TS2305 (`PrismaClient`/`Prisma` tidak diekspor) dan TS18046 yang sama dengan
screenshot pada `workflow.test.ts` baris 458/461. Reproduksi akhir dijalankan di
`/private/tmp/buatin-vercel-build-0xkaygjp/source`, terpisah dari node_modules
workspace. Percobaan build yang masih berada di bawah `.local` mendeteksi parent
workspace/client dan tidak dipakai sebagai bukti reproduksi bersih.

`npm run build` sekarang menghasilkan Prisma Client sebelum Next.js. Jalur hosted
memanggil build tersebut, lalu kompilasi worker. Typecheck tetap ketat, semua test
tetap diperiksa; tidak ada migration, pembuatan owner atau akses Supabase saat
build. Salinan candidate menggunakan lockfile identik dan instalasi bersih yang
sudah selesai, tanpa `.env` sumber atau client hasil development. Satu percobaan
instalasi tambahan terhenti ENOSPC; hanya artefak test yang dibuat tugas ini
dibersihkan sebelum pemeriksaan berhasil dilanjutkan.

| Pemeriksaan                                  | Hasil aktual                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run build:hosted` pada candidate bersih | Lulus: Prisma Client 7.10.1, Next.js 16.4.2 termasuk TypeScript/prerender, dan build worker                      |
| `npm run lint`                               | Lulus tanpa warning                                                                                              |
| `npm run typecheck`                          | Lulus                                                                                                            |
| `npm test`                                   | 70 tes unit, 11 file, lulus                                                                                      |
| `npm audit --audit-level=high`               | 0 vulnerabilities, termasuk dependency development                                                               |
| `npm run format:check`                       | Semua file cocok dengan Prettier                                                                                 |
| `npm run security:scan`                      | Lulus; 316 file source/config/dokumen diperiksa tanpa mencetak secret                                            |
| `git diff --check`                           | Lulus                                                                                                            |
| Smoke server hasil build                     | `/api/health/live` HTTP 200; `/api/health/ready` HTTP 503 saat DB fixture sengaja tidak tersedia                 |
| Verifikasi ulang Supabase                    | 46 tabel public, 13 tabel queue; metadata dan checksum 12 migration tetap cocok                                  |
| Izin schema/fungsi cloud                     | Nol EXECUTE fungsi queue untuk anon/authenticated; tanpa USAGE/CREATE pgboss atau CREATE public untuk kedua role |

`supabase db advisors --linked --project-ref oeznehkxknbgvbtunebu --type security
--level warn --fail-on error --output-format json` selesai dengan exit 0. Hasilnya
enam warning `function_search_path_mutable` pada fungsi pg-boss bawaan, tanpa
temuan error. Warning dicatat, tidak dianggap nol temuan. Schema antrean privat
dan hak browser dicabut; fungsi belum dimodifikasi dari library. Tinjau ulang
saat upgrade library atau pemberian role baru. Hasil read-only cloud tersimpan
privat pada `.local/supabase-bootstrap-20261021/release-security-result.json`.

Build memakai variable fixture dengan database sengaja tidak terjangkau; hasilnya
membuktikan build tidak memerlukan query database. Ini belum membuktikan koneksi
runtime Vercel, Google OAuth atau worker cloud. Integration/E2E tidak diulang
secara lokal untuk perubahan script build/dokumentasi; CI GitHub terbaru
menjalankan suite lengkap seperti dicatat berikut. Tidak ada test dijalankan ke
Supabase produksi.

Push commit `a76426e` berhasil secara fast-forward ke `main` dan
`codex/admin-management`; kedua ref remote diverifikasi menunjuk SHA yang sama.
Workflow GitHub `Native validation` main, run `39578199291`, selesai dengan
status **success**, diverifikasi melalui API jobs. Seluruh langkah wajib lulus:
instalasi bersih, migration/upgrade, format, lint, typecheck, secret/skill/template
scan, unit, build web/worker, integration, Chromium E2E, backup/restore dan audit.
Fixture CI tetap terpisah dari Supabase produksi. Status integrasi
Vercel untuk deployment `DKH1HDJV7qGwscNE6V27SrXgtzm9` adalah failure. Pengguna
memberikan error pertama dari Build Logs:

```text
PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
Command "npm run build:hosted" exited with 1
```

Kegagalan cloud ini berasal dari environment hosting yang belum diisi. Database
Supabase tetap sudah diterapkan. Operator perlu menyimpan Transaction pooler URI
project tersebut sebagai `DATABASE_URL` pada environment Production Vercel,
melengkapi `BETTER_AUTH_SECRET` acak minimal 32 karakter dan origin `APP_URL`,
lalu redeploy. Password/URI tidak dikirim melalui chat atau dimasukkan ke Git.
Connection string runtime belum tersedia pada tugas ini; deployment publik belum
dinyatakan berhasil. Credential dummy tidak disimpan pada hosting.

## Penerapan schema Supabase - 21 Oktober 2026

Atas instruksi pengguna, schema diterapkan ke project **buatin**, ref
`oeznehkxknbgvbtunebu`. Preflight Supabase CLI memverifikasi database `postgres`,
role operator `postgres`, nol tabel `public`, nol tabel `pgboss` dan belum ada
riwayat Prisma. Tidak ada data aplikasi cloud untuk dicadangkan sebelum bootstrap.
Project lain tidak disentuh. Database dan `.env` sumber lokal dipertahankan.

Rehearsal memakai database lokal baru
`buatin_supabase_rehearsal_2fc958bd1df7`, dibuat melalui environment fixture mock
terpisah. Tidak ada test suite, akun fixture atau inferensi AI yang dijalankan
pada Supabase produksi. Verifikasi cloud hanya membaca metadata schema, konfigurasi
paket/antrean dan jumlah row akun/proyek/pembayaran.

| Pemeriksaan                      | Hasil aktual                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Bootstrap rehearsal              | 12 SQL migration berhasil dalam transaksi; guard menolak schema berisi tabel                       |
| Kesetaraan rehearsal             | Tabel, RLS, kolom, constraint dan index sama dengan database fixture yang dimigrasikan Prisma      |
| Prisma pada rehearsal            | `prisma migrate status`: up to date; `prisma migrate deploy`: no pending migrations                |
| Kompatibilitas pg-boss rehearsal | Startup library 12.38.0 berhasil; empat antrean terbaca                                            |
| Bootstrap Supabase nyata         | 45 tabel aplikasi dan `_prisma_migrations` dibuat; 12 migration selesai                            |
| Checksum cloud                   | Seluruh 12 nama/checksum sama dengan file repository; finished, tanpa rollback, applied steps satu |
| Kesetaraan cloud                 | Seluruh tabel, RLS, kolom, constraint dan index cocok dengan rehearsal                             |
| Privasi tabel cloud              | RLS aktif pada 46 tabel public; nol hak tabel untuk PUBLIC/anon/authenticated                      |
| Antrean cloud                    | 13 tabel schema `pgboss`, versi 46; `plan`, `generate`, `reference`, `maintenance` tersedia        |
| Konfigurasi antrean              | Policy short, retry nol, expiry 28.800 detik dan retention 86.400 detik sesuai worker              |
| Privasi antrean cloud            | Role anon dan authenticated tidak memiliki USAGE schema `pgboss`                                   |
| Data awal                        | Empat paket, features/planner limit terisi; harga null dan checkout nonaktif                       |
| Data pengguna                    | Nol akun, proyek dan pembayaran; tidak menyalin data laptop                                        |

Penerapan memakai `supabase db query --linked --project-ref
oeznehkxknbgvbtunebu --file ... --output-format json` melalui Management API yang
terautentikasi. Seluruh SQL migration repository dijalankan sesuai urutan dalam
satu transaksi. Dua wrapper BEGIN/COMMIT migration digabung ke transaksi luar;
isi migration dan checksum file sumber tidak diubah. Struktur ledger mengikuti
Prisma terpasang; riwayat dicatat setelah seluruh SQL berhasil. Pengujian engine
Prisma pada rehearsal mengonfirmasi deployment berikutnya tidak mengulang migration.
Cloud diverifikasi melalui metadata dan checksum, bukan koneksi langsung Prisma.

Schema antrean berasal dari `getConstructionPlans('pgboss')` library terkunci,
bukan salinan DDL buatan. Pembuatan antrean memakai opsi worker yang ada. Hak
schema/table/function untuk browser dicabut; tidak ada worker, panggilan AI,
pengiriman email atau heartbeat worker yang dijalankan pada cloud.

Artefak privat SQL, manifest checksum dan hasil inspeksi berada di
`.local/supabase-bootstrap-20261021/`, tidak disertakan ke Git. Jangan menjalankan
ulang bootstrap pada schema terisi. Migration selanjutnya memakai
`npm run db:migrate` dengan `DATABASE_DIRECT_URL` pada environment hosting.

Koneksi runtime Vercel/worker belum dikonfigurasi pada checkout; project Vercel
`buatin` sudah diketahui melalui screenshot berikutnya, origin final belum
diverifikasi. Aplikasi tetap memerlukan connection string
server pada secret environment hosting, bucket/S3, Google OAuth, email, Turnstile,
scanner dan konfigurasi anggaran AI sesuai `DEPLOYMENT.md`. Schema sudah ada;
hal ini belum membuktikan web publik, Google login atau worker cloud berfungsi.
Pemeriksaan build dan unit terbaru dicatat pada bagian perbaikan Vercel; suite
integration/E2E sebelumnya tetap tercatat pada bagian berikut.

## Hosting bersama dan Google login - 21 Oktober 2026

Target: Vercel web, Supabase PostgreSQL/storage privat dan Railway worker Node 24.
Pengujian aplikasi memakai PostgreSQL 17 lokal dengan database
`buatin_admin_fixture_20261021`, web port 3108 dan mock port 4118, build terpisah
`.local/admin-next`. Semua credential AI, pembayaran, email dan S3 nyata dihapus
dari environment fixture. `.env`, database dan layanan sumber tidak dimigrasikan
atau ditimpa oleh tugas ini. Integration/E2E/restore dijalankan bergantian.

| Pemeriksaan                    | Hasil aktual                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                     | 70 tes unit, 11 file, lulus                                                                                                                                                                   |
| `npm run test:integration`     | 50 tes, tujuh file, lulus dalam 218,93 detik                                                                                                                                                  |
| `npm run test:e2e`             | 18 skenario Chromium lulus dalam 2,6 menit                                                                                                                                                    |
| `npm run build:hosted`         | Prisma generate, build worker dan Next.js 16.4.2 lulus                                                                                                                                        |
| Prisma migrate status          | 12 migration terpasang dan up to date pada fixture                                                                                                                                            |
| `npm run test:migrations`      | Upgrade invoice historis, subscription, manfaat dan ledger lulus pada database inspeksi baru                                                                                                  |
| `npm run test:backup`          | Backup database/blob terenkripsi, restore baru, checksum dan isi lampiran lulus; receipt terbaca tanpa filesystem host backup                                                                 |
| `npm run test:recovery`        | SIGKILL, lease kedaluwarsa, worker baru dan resume 20/20 dokumen lulus; checksum serta attempts checkpoint sukses tetap                                                                       |
| `npm audit --audit-level=high` | 0 vulnerabilities                                                                                                                                                                             |
| Katalog reviewed               | Lima skill pack dan 42 template lolos checksum                                                                                                                                                |
| Konfigurasi provider           | `vercel.json` dan `railpack.json` lolos validasi constraints schema resmi menggunakan Ajv; deployment nyata belum dijalankan                                                                  |
| Runtime assets                 | Trace build API menyertakan 43 file template, dua prompt, sepuluh config dan 16 file skill pack                                                                                               |
| Akses Supabase operator        | Project `oeznehkxknbgvbtunebu` bernama `buatin`, `ACTIVE_HEALTHY`, region `ap-south-1`; SELECT metadata berhasil sebagai `postgres`, PostgreSQL 17.11; izin CREATE tabel/schema terkonfirmasi |

Pemeriksaan akhir `npm run format:check`, `npm run lint`, `npm run typecheck`
dan `git diff --check` lulus; lint tanpa warning. `npm run security:scan` lulus,
316 file source/config/dokumen diperiksa tanpa mencetak nilai secret. Format check
sempat menemukan cache yang dibuat Supabase CLI; `supabase/.temp/` sekarang
dikecualikan dari Git dan formatter, lalu pemeriksaan diulang hingga lulus.

Cakupan Google memakai callback Better Auth sebenarnya dengan respons provider
yang diganti lewat fetch fixture, RSA/JWKS dan credential test. Cakupan: state cookie/database sekali pakai,
PKCE S256, cancel, replay, signature/issuer/audience/expiry token, email terverifikasi,
linking aman, signup pause, suspend, unique provider identity, penolakan login
Google untuk staf/MFA dan pembuangan token provider. Direct idToken, callback
override, Origin salah serta body lebih dari 16 KiB ditolak. Browser memeriksa
keyboard, error yang dapat dicoba ulang dan pesan callback yang aman. Screenshot
Google login desktop/mobile diperiksa secara visual; mobile tidak overflow.
Tidak ada akun Google nyata atau credential produksi dipakai oleh fixture.

Temuan yang direproduksi dan diperbaiki:

- Callback code pada versi Better Auth terpasang semula hanya men-decode ID token.
  Token fixture dengan audience salah berhasil masuk. Callback sekarang memanggil
  verifier Google resmi library secara eksplisit; regression audience/issuer/expiry
  salah ditolak. Tidak ada implementasi kriptografi buatan sendiri.
- Pembatas body yang membaca clone request dapat menunggu selamanya saat cancel
  stream bercabang. Handler kini membaca body asli secara terbatas, melepas reader
  dan membentuk request baru. Regression oversized request menghasilkan HTTP 413.
- Locator browser `getByRole('alert')` semula juga memilih route announcer Next.
  Dua tes Google gagal strict mode, sementara UI menampilkan pesan yang benar.
  Locator dibatasi ke `main`; seluruh 18 skenario kemudian lulus.
- Kesiapan scanner dan waktu backup tidak dapat dibaca dari filesystem Vercel
  karena worker/backup berada di host lain. Scanner sekarang dibaca dari heartbeat
  worker segar, backup dari receipt DB setelah bundle selesai. Regression
  memeriksa heartbeat hilang/stale/legacy dan pembacaan receipt lintas host.

Uji backup memakai bundle privat
`.local/admin-fixture-backups/buatin-2026-10-21T08-26-45-561Z-40d8fc77-fec8-44b9-89d6-b934152d67be`,
database restore `buatin_restore_1df0f7ebfe69487ab3436801da9e5c24` dan inspeksi
`.local/restore-check-18df4264-d414-4b2b-8df7-dff6902b003e`.
Dua file diverifikasi, `attachmentVerified:true`. Uji upgrade menggunakan
`buatin_admin_upgrade_718f1a9a98ad4c0b94abb09c2b85cd40`. Semua artefak tersebut
privat dan tidak disertakan ke Git atau hosting.

Pada pemeriksaan awal sebelum bootstrap yang dicatat terpisah di atas,
query Supabase hanya memeriksa metadata: schema `public` memiliki nol tabel dan
`_prisma_migrations` belum ada. Belum ada migration, seed, akun, perubahan data
pengguna atau deployment cloud pada project itu saat pemeriksaan awal. Akses SQL operator bukan bukti
connection string runtime Vercel/Railway sudah tersedia. Publishable/anon key
tidak diperlukan untuk Prisma + Better Auth. Konfigurasi server database, S3,
domain web, Google OAuth, email, Turnstile, scanner, backup luar host dan batas
AI nyata tetap diperlukan. RLS sudah diuji pada fixture; smoke role Supabase,
OAuth publik, upload lintas host, reboot Railway dan kapasitas belum diverifikasi.
Receipt backup bukan bukti volume/offsite/restore produksi. Panduan dan prioritas
ada di `DEPLOYMENT.md` serta `PRODUCTION_READINESS.md`.

## Implementasi admin - 21 Oktober 2026

Implementasi dan batas operasional ada di `ADMIN_GUIDE.md`. Pengujian pada macOS
arm64, Node.js 24.22.0, PostgreSQL 17 lokal, database/storage/email fixture terpisah.
Server dan worker fixture memakai mock dengan seluruh kredensial layanan nyata
dikosongkan. Suite dijalankan bergantian. Konfigurasi `.env` sumber dipertahankan.

| Pemeriksaan                               | Hasil aktual                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Migration admin                           | Dua migration baru diterapkan setelah backup/rehearsal; total sepuluh migration                                        |
| Kesetaraan data lama                      | Invoice/status/manfaat, masa subscription, ledger dan usage sama dengan salinan rehearsal; subtotal backfill valid     |
| Prisma validate/status/diff               | Schema valid, seluruh migration terpasang; tidak ada drift setelah normalisasi ekspresi default PostgreSQL yang setara |
| `npm test`                                | 62 tes unit dalam sembilan file lulus                                                                                  |
| Format/lint/typecheck                     | Lulus; lint tanpa warning                                                                                              |
| Build web/worker                          | Keduanya lulus; web mencakup admin dinamis dan bantuan pengguna                                                        |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities                                                                                                      |
| Verifikasi katalog                        | Lima skill pack reviewed dan 42 template lolos checksum; upstream tidak dieksekusi                                     |
| `npm run security:scan`                   | Lulus, 297 file source/config/dokumen; secret tidak dicetak                                                            |
| `npm run test:backup`                     | Database dan blob fixture terenkripsi, restore ke database baru, checksum/isi lampiran lulus                           |
| `npm run test:recovery`                   | SIGKILL, lease kedaluwarsa, worker baru, resume 20/20 dokumen; checkpoint sukses tidak berubah                         |

Suite integrasi akhir: 44 tes dalam enam file lulus, 149,84 detik, pada build
produksi. Audit dependency lengkap maupun produksi: 0 vulnerabilities.
Suite browser akhir: 16 skenario Chromium lulus dalam 2,7 menit, mencakup
desktop/mobile, keyboard, riwayat bantuan serta balasan dari halaman pesan lama.
Screenshot voucher desktop dan audit mobile diperiksa secara visual.
`test:migrations` lulus pada database inspeksi baru berisi dua invoice historis;
nominal/manfaat/periode/ledger/usage dipertahankan, subtotal diisi dan default
sementara dilepas. Migration sudah selaras pada sumber lokal dan fixture.

Cakupan mencakup permission owner/admin, password/TOTP reauth, owner terakhir
concurrent, undangan single-use, suspend, pencabutan sesi, grant/kredit kumulatif,
versi harga/manfaat, reservasi voucher concurrent, quote expired/berubah, callback
duplikat/ambigu/terlambat, rekonsiliasi tanpa penurunan paid, refund uang dengan
approval/bukti dan revokasi akses idempotent. Bantuan memeriksa ownership, catatan
internal, retry dan pagination; privasi memeriksa bukti/notifikasi; CSV memeriksa
izin, batas dan formula. Konten reviewed/checksum dibekukan dalam snapshot job.

Temuan selama validasi:

- Fixture voucher awal mencari kode lowercase sementara produk menormalisasi
  uppercase; fixture diperbaiki. Navigasi browser kemudian masih mengisi form
  lama sebelum detail siap; fixture sekarang menunggu heading detail.
- Riwayat tiket semula hanya mengambil 100 pesan pertama. Regression dengan 105
  pesan publik membuktikan balasan terbaru hilang. API/UI kini memakai 20 pesan
  per halaman, halaman terbaru dahulu, count publik tanpa catatan internal;
  balasan dari halaman lama kembali ke halaman terbaru.
- Cache detail tidak mempertahankan data target lain saat ID berubah; daftar
  dengan filter pada target yang sama tetap mempertahankan data selama fetch.
- Model AI kini membutuhkan alasan dan versi aktif, memakai key retry stabil;
  audit mencatat reauth sukses/gagal tanpa payload autentikasi. Laporan AI
  menampilkan versi/tarif yang tersimpan dan model provider.
- Bootstrap owner dikeluarkan dari CI fixture. Suite admin menolak database
  yang sudah berisi owner, sehingga tes owner terakhir tidak mengubah akun nyata.
- Percobaan backup fixture pertama gagal karena kunci khusus fixture belum ada.
  Kunci privat baru dibuat; pengulangan backup/restore lulus. Kunci sumber tidak
  dipakai ulang atau dicetak.
- Tinjauan SQL menemukan `subtotal NOT NULL` tanpa default sementara invoice
  historis belum terisi. Uji upgrade berisi dua invoice mereproduksi `23502`.
  Migration admin baru yang belum dipush/dirilis dikoreksi memakai default nol
  sementara; backfill mengisi nominal asal, lalu default dihapus. Uji ulang lulus,
  termasuk subscription, fitur, masa bayar, ledger dan usage lama. Checksum tiga
  database lokal diselaraskan setelah metadata dibackup; tabel aplikasi tidak
  diubah oleh penyelarasan. Migration lama yang sudah dipublikasikan tidak diubah.
  Regression permanen `npm run test:migrations` ditambahkan ke CI.

Backup sebelum migration sumber dipertahankan privat di
`.local/backups/buatin-2026-10-21T03-51-02-090Z-3172d129-2e8e-4d45-85d6-2f5af5509035`.
Bundle admin yang diuji:
`.local/admin-fixture-backups/buatin-2026-10-21T05-12-12-395Z-8f0e1e5d-2e0f-4059-b66e-9983d4182caa`.
Database restore: `buatin_restore_b1abffcbe75a4c51b5ed81201d625bd6`.
Hasil inspeksi: `.local/restore-check-a3ba48a1-e092-4d19-b271-208e74c8f1f1`.
Database sumber tidak ditimpa oleh restore. Path build fixture otomatis di
next-env/tsconfig telah dikembalikan ke `.next` sebelum verifikasi akhir.

Web/worker sumber kembali memakai konfigurasi privat non-mock. Pemulihan worker
awalnya ditolak tinjauan otomatis karena potensi inferensi berbayar. Pembacaan
read-only membuktikan nol job/task/lampiran/outbox/antrean AI; pemulihan kemudian
diizinkan. Tidak ada inferensi tambahan. Halaman publik dan health HTTP 200,
admin anonim 401, bantuan anonim redirect login. `ops:check` exit 0: DB/worker
sehat, antrean kosong, tanpa alert. `check:production` exit 1 sesuai tujuan:
tujuh konfigurasi P0 belum siap dan empat tindak lanjut P1 manual.

Hosting/domain/database produksi tetap ditunda. Merchant/refund uang, email,
challenge, MFA owner sebenarnya, scanner, storage produksi, backup luar host,
alert dan CI pada runner GitHub memerlukan bukti staging. Tarif AI tetap perlu
ditetapkan berdasarkan provider; mock tidak membuktikan mutu/biaya inference.
Refund uang dan pemenuhan privasi tetap membutuhkan tindakan operator yang
diverifikasi. Tidak ada klaim peluncuran publik dari pengujian lokal ini.

## Rencana pengembangan admin - 21 Oktober 2026

Catatan historis sebelum implementasi. Perubahan hanya dokumentasi: kondisi admin saat itu, matriks izin, manajemen
pengguna/paket/voucher, integritas pembayaran, perubahan data/API, tahapan dan
kriteria penerimaan dicatat di `ADMIN_PLAN.md` serta ditautkan dari README.
Tidak ada implementasi fitur admin baru atau perubahan schema/runtime.

Pemeriksaan dokumentasi dengan Node.js 24:

- Prettier pada README dan rencana admin lulus.
- `npm run security:scan`: lulus, 261 file source/config/dokumen diperiksa;
  nilai secret tidak dicetak.
- `git diff --check` pada perubahan dokumentasi lulus. Snapshot skill upstream
  yang dikunci checksum tetap dipertahankan.

Build, lint, typecheck dan suite aplikasi tidak diulang karena perilaku aplikasi
tidak berubah. Hasil pengujian implementasi sebelumnya tercatat terpisah di bawah;
hasil tersebut tidak membuktikan fitur yang masih berupa rencana.

## Persiapan produksi dan 9router nyata - 21 Oktober 2026

Dijalankan pada macOS arm64, Node.js 24 dan PostgreSQL 17 lokal port 55432.
Integration/E2E memakai build produksi, worker persisten dan mock loopback;
keduanya dijalankan bergantian. Setelah fixture selesai, web/worker direstart
dengan `MOCK_LLM=false`. Kredensial tetap di environment privat mode 0600.

| Pemeriksaan                                        | Hasil aktual                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Prisma migration                                   | Delapan migration diterapkan, termasuk reservasi AI, MFA dan permintaan data                                    |
| `npm test`                                         | 55 tes unit, delapan file, lulus                                                                                |
| `npm run test:integration`                         | 27 tes, lima file, lulus dalam 138,77 detik                                                                     |
| `npm run test:e2e`                                 | 14 skenario Chromium, empat file, lulus dalam 1,3 menit                                                         |
| E2E keamanan akun/operasi ulang                    | Dua skenario lulus dalam 6,4 detik; screenshot desktop/mobile stabil dan tanpa overflow halaman                 |
| `npm run build`, `npm run build:worker`            | Build produksi web dan pemeriksaan emit worker lulus                                                            |
| Format, lint, typecheck                            | Pemeriksaan akhir lulus; lint tanpa warning                                                                     |
| `npm audit --audit-level=high`, audit `--omit=dev` | Keduanya 0 vulnerabilities                                                                                      |
| `npm run templates:verify`                         | Tepat 42 template terstruktur lolos checksum                                                                    |
| `npm run skills:verify`                            | Lima pack yang ditinjau lulus; kode upstream tidak dijalankan                                                   |
| `npm run security:scan`                            | 260 file source/config/dokumen diperiksa tanpa mencetak secrets                                                 |
| `npm run test:backup`                              | Backup database beserta blob fixture, dekripsi, restore terpisah dan pemeriksaan isi/checksum lulus             |
| 9router discovery dan smoke terbatas               | Daftar model HTTP 200; satu inferensi nyata menghasilkan JSON yang diminta                                      |
| Probe akhir dengan AI nyata                        | `/api/public-config` menunjukkan `mock:false`; liveness/readiness HTTP 200                                      |
| `npm run ops:check`                                | Exit 0; database/worker sehat, antrean kosong, tanpa alert                                                      |
| `npm run check:production -- --provider`           | Exit 1 sesuai tujuan: tujuh konfigurasi P0 belum siap, empat tindak lanjut P1 manual; runtime sehat tanpa alert |

Cakupan baru: batas request/token/estimasi USD lintas proses, reservasi concurrent
atomik dan settlement idempotent; backup AES-256-GCM menolak manipulasi/context
salah; MFA aktivasi, pencabutan sesi lama, login dua faktor dan recovery code
sekali pakai; sesi tanpa token; konfirmasi email pada permintaan data; panel
prioritas operasional serta readiness database/migration/worker.

Suite integrasi awal 25/27. Readiness membaca timestamp PostgreSQL tanpa zona
sebagai waktu lokal, sehingga worker sehat terlihat tertinggal tujuh jam.
Query kini menetapkan UTC secara eksplisit. Tes MFA awal mengirim secret URI
Base32 langsung ke helper yang meminta teks mentah; fixture dikoreksi sesuai
format autentikator. Pengulangan MFA lalu seluruh suite lulus. Tidak ada
pelemahan verifikasi atau limiter aplikasi.

Screenshot akun/operasi desktop dan mobile benar-benar diamati dalam dua ronde.
Ronde awal menangkap transisi sidebar dan posisi scroll; pengambilan gambar
diulang dari atas dengan animasi screenshot dinonaktifkan. Kode QR/recovery
fixture ditutup pada screenshot. Tidak ada delay pemuatan buatan pada aplikasi.

Model planner/writer awal `kr/claude-haiku-4.5`; router melaporkan
`claude-haiku-4.5`. Smoke satu request melaporkan 6.568 token input dan lima
output. Overhead router dicadangkan melalui `LLM_INPUT_TOKEN_OVERHEAD=8192`.
Angka ini bukan harga atau bukti kualitas seluruh 42 dokumen. Tarif/batas USD
tetap belum diisi, bukan biaya nol; batas request/token persisten sudah aktif.

Bundle lengkap yang diuji:
`.local/backups/buatin-2026-10-21T02-40-42-462Z-f44d1f30-0d19-42fc-ac65-c327d63b0b44`.
Database inspeksi: `buatin_restore_fc828b203fdf4f1e8622e7d8329a7868`.
File inspeksi: `.local/restore-check-292747a1-0bc9-4c9a-9f90-b2842fde5272`.
Hasil dua file terenkripsi, `attachmentVerified:true`; sumber fixture dibersihkan.
Bundle/database inspeksi dipertahankan privat untuk tinjauan, bukan untuk dilayani
web atau menyalakan worker. Database sumber tidak ditimpa.

Batas: hosting/domain/database produksi ditunda. Email internet, Turnstile nyata,
MFA owner sebenarnya, scanner ClamAV, S3/volume produksi, salinan backup di luar
host, alert eksternal dan CI GitHub belum diverifikasi. Caddy tidak terpasang
lokal; validasi config serta batas upload melalui proxy perlu staging. Pemenuhan
export/penghapusan tetap prosedur manual. Satu warning deprecation pg mengenai
query paralel muncul saat suite; semua tes tetap lulus, perlu tinjauan sebelum
upgrade pg 9. Prioritas lengkap ada di `PRODUCTION_READINESS.md`.

## Peluncur development terpadu — 21 Oktober 2026

`npm run dev` kini memilih Node.js 24, menyiapkan database lokal bawaan dan
Prisma, lalu menjalankan web, worker, serta mock sesuai konfigurasi. Pengujian
perubahan ini dijalankan pada macOS arm64, Node.js 24.22.0:

- `npm test`: 51 tes unit dalam enam file lulus. Enam tes baru memeriksa
  konfigurasi lokal/eksternal, port, penolakan URL publik, penghentian proses,
  SIGKILL setelah timeout, dan proses turunan yang induknya sudah berhenti.
- `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm run build:worker`, `npm run security:scan`, dan `sh -n scripts/dev.sh`:
  lulus. Secret scan terakhir memeriksa 232 file tanpa mencetak nilai secrets.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. Percobaan awal
  terhalang DNS sandbox; pengulangan dengan akses jaringan lulus.
- `npm run dev` pada layanan lama yang masih aktif: exit 1 dengan pesan port
  3000 sedang dipakai; proses lama tidak dihentikan.
- Smoke test memakai skrip sementara dengan database fixture terpisah yang
  dimigrasi sebelum startup, `APP_URL=http://localhost:3107`, dan
  `MOCK_LLM_BASE_URL=http://127.0.0.1:4107/v1`. `npm run dev` otomatis memilih
  Node.js 24 dari PATH awal yang memakai Node.js 26; worker mencetak ready,
  `/api/health`, halaman `/`, dan health mock memberi HTTP 200. Port mock
  mengikuti URL meskipun `MOCK_PORT` awal berbeda.
- SIGINT pada peluncur: exit 0, port 3107/4107 tertutup. PostgreSQL, web lama
  port 3000, dan mock lama port 4010 tetap sehat. Database fixture dan skrip
  sementara dibersihkan. Percobaan smoke awal gagal karena path npm dalam
  skrip pengujian salah; sesudah diperbaiki, seluruh smoke test lulus.

Batas perubahan: tidak menambah dependency atau mengubah UI/API/schema.
Build web produksi serta suite integration/E2E tidak diulang untuk perubahan
peluncur ini; hasil sebelumnya tetap tercatat terpisah. Bootstrap PostgreSQL
dari cluster kosong dan provider AI nyata tidak diuji ulang. Worker terpadu
tanpa watch; perubahan kode worker memerlukan restart peluncur.

## Pembaruan 21 Oktober 2026

Sesudah pengembangan kustomisasi brief dan panduan loading, dijalankan pada
macOS arm64, Node.js 24, PostgreSQL lokal port 55432. Web memakai build produksi
`next start`, worker tanpa watch, dan provider mock loopback. Integration dan
E2E dijalankan bergantian agar kontrol mock tidak saling memengaruhi.

| Pemeriksaan                               | Hasil aktual                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx prisma migrate status`               | Lima migration diterapkan; schema up to date, termasuk preferensi dan state referensi revisi                                                      |
| `npm test`                                | 45 tes unit, lima file, lulus                                                                                                                     |
| `npm run test:integration`                | 24 tes, tiga file, lulus dalam 127,40 detik                                                                                                       |
| `npm run test:e2e`                        | 12 skenario Chromium, tiga file, lulus dalam 2,3 menit pada pengulangan terakhir                                                                  |
| `npm run build:worker`                    | Lulus                                                                                                                                             |
| `npm run build`                           | Build Next.js produksi lulus; route publik/workspace/admin terdaftar                                                                              |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities dependency produksi                                                                                                             |
| `npm audit --audit-level=high`            | 0 vulnerabilities seluruh dependency, termasuk tooling worker                                                                                     |
| `npm run skills:verify`                   | Lima pack yang ditinjau lolos checksum sumber/lisensi/adaptasi; tanpa menjalankan kode upstream                                                   |
| `npm run security:scan`                   | 229 file source/config/dokumen diperiksa; lulus, tanpa mencetak nilai secrets                                                                     |
| `npm run check:production`                | Gagal sesuai tujuan: lokal/mock, HTTPS/domain/email/Turnstile/merchant/harga/model/template asli/scanner/storage persisten produksi belum lengkap |

Pemeriksaan akhir `npm run format:check`, `npm run lint`, dan
`npm run typecheck` lulus setelah pembaruan source, dokumentasi dan fixture
browser. Lint tidak melaporkan warning.

Cakupan baru yang benar-benar dijalankan:

- Preferensi auto/manual: sembilan tipe, 40 kategori teknologi, konflik stack,
  pilihan `none`, typography/layout/numeric/custom font, 2-10 warna HEX,
  normalisasi dan kontras. Palet serta pilihan manual bertahan setelah reload
  dan pergantian mode. Unit memeriksa penolakan konfigurasi/HEX yang tidak valid.
- Katalog 27 skill: dua panduan wajib, lima adaptasi pihak ketiga siap, 20 entri
  berstatus koneksi/tinjauan/tidak didukung. Skill belum siap tidak dapat dipilih.
  Sumber, lisensi dan versi dibawa ke snapshot/dokumen; skrip upstream tidak
  dieksekusi. Satu pack tambahan berasal dari GitHub `anthropics/skills` pada
  commit yang dikunci, dengan lisensi Apache-2.0 di tingkat skill.
- Lampiran MD, gambar JPEG yang dinormalisasi WebP tanpa EXIF, PDF dan DOCX:
  upload, ekstraksi, unduhan privat, signature/ukuran, Origin, ownership akun lain,
  konflik versi, batas 10 file, retensi yang mempertahankan revisi/job. Unit
  parser juga menolak UTF-8 rusak, binary/control characters, PDF rusak/>100
  halaman, DOCX entity serta ekspansi berlebihan.
- Pemrosesan dokumen di konteks URL publik tanpa scanner menolak file; executable
  scanner yang gagal juga menolak. Planner menolak referensi rejected; download
  ditahan. Retry loopback berhasil. PDF scan tanpa teks menjadi ready dengan
  peringatan OCR, catatan manual ikut snapshot. Ini bukan uji ClamAV nyata.
- Revisi memulihkan preferensi/catatan referensi; preset menyimpan preferensi.
  Writer menghasilkan warna/font/skill/catatan tersimpan. Regenerasi tetap memakai
  snapshot asal setelah draft diubah, lalu unduhan hasil berhasil.
- Policy loading membedakan konten dan aplikasi serta rendering SSG/Hybrid.
  Template/prompt/konfigurasi hasil mengharuskan hero/LCP segera tersedia,
  skeleton kondisional, tanpa delay buatan, layout stabil, reduced motion,
  aksesibilitas, status/progres nyata dan bukti pengukuran. Unit serta integration
  memeriksa isi Markdown hasil. Belum ada pengukuran website target.
- E2E baru melewati editor, unggahan/catatan, stack manual, 10 warna, tipografi,
  skill, reload, planner, generasi dan pembacaan dokumen hasil. Mobile 390px
  memeriksa keyboard, pilihan tersimpan, validasi format, skill belum tersedia
  dan tidak ada overflow. Screenshot gaya desktop serta palet mobile diamati.
- Suite lama kembali lulus untuk registrasi, akses paket, preset/revisi,
  regenerasi, batch, invoice fixture, admin, preview aman, ZIP dan hapus proyek.
  Katalog tetap 42 Markdown; ZIP maksimum 43 entri termasuk manifest.

Suite browser awal 9/12: test kustomisasi membaca file saat proses baru 3/21
selesai, sedangkan dua login beruntun mendapat HTTP 429. Fixture kini menunggu
judul selesai dan menghormati `Retry-After`/`X-Retry-After`. Tidak ada pelemahan
rate limit aplikasi. Pengulangan seluruh suite lulus 12/12.

Batas tambahan: belum memakai S3 sungguhan, scanner malware nyata, OCR eksternal,
model vision atau provider AI berbayar. Konfigurasi publik, staging/deployment,
CI pada host GitHub, enkripsi/lifecycle bucket, dan performance/load test tetap
perlu diverifikasi operator. Test lokal ini membuktikan pipeline mock dan
perilaku aplikasi, bukan kualitas inference atau implementasi website target.

## Arsip verifikasi 20 Oktober 2026

Dijalankan 20 Oktober 2026 pada macOS arm64, Node.js 24.22.0 dan PostgreSQL 17.11
native. Web memakai build produksi `next start`, worker persisten, dan AI mock
loopback. Docker tidak digunakan. Seluruh akun pengujian terpisah dari owner.

## Pemeriksaan

| Pemeriksaan                    | Hasil yang diamati                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma migrate status          | Ketiga migration sudah diterapkan; schema up to date                                                                                  |
| `npm run format:check`         | Lulus                                                                                                                                 |
| `npm run lint`                 | Lulus tanpa warning                                                                                                                   |
| `npm run typecheck`            | Lulus                                                                                                                                 |
| `npm test`                     | 32 tes unit lulus                                                                                                                     |
| `npm run test:integration`     | 20 tes lulus, dua file, 97,70 detik pada pengulangan terakhir                                                                         |
| Playwright Chromium            | 10 skenario lulus: suite sembilan tes 1,6 menit, tes admin tambahan 5,1 detik; invoice diuji ulang langsung pada viewport mobile      |
| `npm run build:worker`         | Emit TypeScript worker lulus                                                                                                          |
| `npm run build`                | Build produksi Next.js lulus, seluruh route publik/workspace/admin terdaftar                                                          |
| `npm audit --audit-level=high` | 0 vulnerabilities pada seluruh dependency                                                                                             |
| Backup database                | Backup custom-format pascamigrasi berhasil, permission 0600                                                                           |
| Restore database               | Berhasil ke DB inspeksi terpisah; query Project berhasil; DB sumber tidak diubah                                                      |
| Recovery proses nyata          | SIGKILL worker anak sesudah checkpoint, lease uji kedaluwarsa, worker baru, resume 20/20 dokumen, checksum/attempts file sukses tetap |
| HTTP/security headers          | Login HTTP 200; CSP produksi tanpa unsafe-eval; nosniff, frame deny, referrer dan permissions policy diamati                          |
| `npm run check:production`     | Gagal sesuai tujuan pada konfigurasi lokal/mock; layanan dan harga nyata belum dikonfigurasi                                          |

Backup terbaru yang diverifikasi:
`.local/backups/buatin-2026-10-20T12-03-08-056Z.dump`.
DB inspeksi: `speckit_restore_1792497815463`, dipertahankan untuk inspeksi.

## Akun, paket dan transaksi

- Registrasi melalui UI publik, role awal user, verifikasi email wajib, login,
  recovery password, serta token reset sekali pakai diuji. Email memakai outbox
  privat lokal; bukan pengiriman internet.
- Free satu generasi seumur hidup: request bersamaan hanya memperoleh satu
  reservasi. Menghapus proyek/hasil tidak menambah kesempatan baru.
- Planner Free berhenti pada lima penyusunan rencana tanpa menghabiskan kredit
  generasi. Kuota planner Pro terpisah dari generasi.
- Reset tepat Senin 00.00 WIB, batas tahun, pergantian bulan, clamp akhir bulan,
  expiry Pro kembali ke sisa Free, dan tanpa rollover diuji.
- Refund idempotent ke periode asal, termasuk cancellation sebelum AI dan worker
  yang terhenti. Pengembalian minggu lalu tidak menambah minggu baru.
- Batch yang melebihi sisa kuota dibatalkan seluruh transaksinya: tidak ada job,
  ledger, atau idempotency key tersisa. Max dua proyek berjalan bergantian dengan
  paling banyak satu generasi executing per akun.
- User Free ditolak mengakses admin/settings/preset/template/batch. Pembacaan
  proyek, revisi dan tagihan akun lain mendapat 404; preset pribadi tidak bocor
  dan tidak dapat dihapus akun lain.
- Admin menyimpan perubahan harga/kuota melalui UI. Hak langganan fixture yang
  sudah dibayar tetap memakai snapshot pembelian sebelumnya. Katalog dikembalikan
  ke harga kosong dan penjualan nonaktif setelah tes.
- Checkout QRIS dengan fetch fixture hanya memakai kanal terkonfigurasi, nominal
  dan signature yang sesuai. Klik serentak menghasilkan satu invoice. Metode lain,
  nominal/referensi salah, signature rusak ditolak.
- Callback duplikat tersimpan sekali; aktivasi hanya setelah konfirmasi status
  provider. Callback terlambat sesudah batas polling membuka satu cek tambahan.
  Callback gagal setelah paid tidak menurunkan status atau menambah periode.
- Early renewal menambah interval setelah paid-through; pergantian paket tidak
  mengubah usage minggu berjalan. Tes provider memakai respons fixture, tanpa
  request ke merchant Duitku sesungguhnya atau pembayaran nyata.

## Generator dan browser

- Sembilan tipe website, tepat 42 entri katalog, dependency closure, cycle
  detection, negasi fitur, validasi evidence, parser JSON, lint dan traceability.
- Health failure tidak membuat job. Start/resume idempotent tidak memotong ulang;
  retry key tetap menunjuk hasil yang sama setelah proses selesai atau AI mati.
- Arsip ZIP benar-benar diperiksa central directory-nya: tepat file pilihan plus
  satu manifest, termasuk skenario seluruh 42 Markdown dan 43 entri ZIP.
- File gagal menghasilkan partial; tautan putus memblokir ZIP. Resume setelah
  langganan habis tetap memakai reservasi/checkpoint dan retensi awal 180 hari.
- Pembatalan in-flight menghentikan request berikutnya; cancelled tidak diekspor.
  Lease recovery, fencing duplicate worker dan pengiriman ulang antrean diuji.
- Plus: preset dipakai ulang, brief tersimpan sebagai revisi, generasi, regenerasi
  pilihan beserta dependensi, checksum file salinan, perbandingan versi, kuota 2/10.
- Max: template PRD pribadi tertangkap dalam snapshot batch, dua proyek selesai,
  kuota 2/25, batas satu executing/account teramati.
- Invoice QRIS fixture tampil pada ponsel 390px, countdown/status terbaca, akses
  anonim ditolak. Kode fixture sengaja tidak dapat dipakai untuk membayar.
- Landing/pricing/signup/privacy/terms/recovery, navigasi mobile, form, preview,
  source, ZIP, dan delete dijalankan melalui browser. Tabel paket dapat digeser
  memakai keyboard. Tidak ada overflow horizontal halaman pada viewport uji.
- Markdown berbahaya tidak menjalankan script, tidak menampilkan raw HTML/gambar
  remote, dan tidak mengirim request tracker. Unduhan konten berbahaya ditolak.
- Screenshot desktop dan mobile benar-benar diamati. Arsip QA privat berada di
  `.local/qa/`; hasil sementara Playwright berada di `test-results/`, diabaikan Git.

## Bug yang ditemukan dan diperbaiki

- Kandidat retensi dapat berubah setelah query awal. Cleanup kini memegang lock
  akun dan memeriksa ulang draft/proses sebelum penghapusan; tes regresi lulus.
- Callback baru setelah polling habis kini diperiksa kembali; replay callback
  identik tidak membuka polling baru. Pembayaran tetap perlu konfirmasi provider.
- Klik start dengan key berbeda saat job aktif kini dicatat agar retry sesudah
  job selesai tetap mengembalikan job yang sama.
- Cache draft yang masih fresh dapat menghentikan polling halaman rencana setelah
  memakai preset. Mutasi menginvalidasi data proyek; halaman rencana selalu
  meminta status terbaru saat dibuka. Riwayat revisi juga disegarkan setelah save.
- Regenerasi belum boleh berjalan ketika hasil masih ditulis. Kontrol menunggu
  status selesai/partial; pilihan di luar paket mendapat HTTP 400.

## Batas yang belum diverifikasi

- Harga komersial belum ditentukan. Tiga Pro masih `monthlyPrice=null`,
  `available=false`; fixture harga bukan harga jual.
- Merchant QRIS Duitku, callback publik HTTPS, kanal merchant aktif, settlement
  dan transaksi sandbox merchant yang sesungguhnya belum diuji.
- Domain Resend/Turnstile, pengiriman email nyata, domain publik dan HTTPS belum
  dikonfigurasi. Local outbox tidak membuktikan email sampai ke pengguna internet.
- Tidak ada inference berbayar atau panggilan 9router/provider nyata. Model,
  kualitas, biaya AI, dan harga paket masih perlu diukur.
- Kit dokumen asli belum tersedia; template bawaan masih fallback berlabel.
- Unit systemd, Caddy, backup timer, CI GitHub dan deployment VPS belum dijalankan
  pada host eksternal. Tidak ada perubahan DNS atau deployment publik.
- Belum ada soak/load test banyak pengguna, Safari/Firefox atau perangkat fisik.
  Concurrency diuji pada dua pekerjaan batch lokal; kapasitas produksi belum diukur.
- Recovery memakai lease uji 30 detik; produksi default 15 menit. Restore berhasil
  secara lokal; belum dilakukan latihan cutover produksi atau restore off-site.
- Cleanup mencakup tes race dan pembatalan, bukan simulasi seluruh usia 180 hari
  beserta semua backup. Rotasi dan enkripsi backup off-site perlu dioperasikan.
- Tes generator ini tidak membuktikan implementasi proyek target yang dituliskan
  dalam dokumen hasil.
