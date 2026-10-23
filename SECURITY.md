# Keamanan Buatin

## Profil Vercel tanpa worker

`PROCESSING_MODE=request` memakai POST continuation yang memeriksa sesi, status
akun, Origin dan rate limit. Resource dipilih server hanya untuk akun tersebut;
body tidak menerima user ID atau resource milik akun lain. Lease persisten,
fencing dan checkpoint mencegah duplicate output/quota setelah timeout. GET/HEAD
workspace tidak menjalankan proses. Worker persisten menolak mode request.

Storage Supabase menggunakan key server di environment, bucket privat yang
diperiksa sebelum write, serta download melalui ownership API. Publishable/anon
key tidak mencukupi. PDF/DOCX ditolak sebelum penyimpanan pada profil ini;
parser image/text tetap berjalan terisolasi tanpa secret. Tidak ada scanner atau
heartbeat worker buatan. Lihat `docs/VERCEL_SUPABASE_FREE.md`.

GET mesin `/api/cron/maintenance` merupakan pengecualian eksplisit terhadap
route baca: mutation retensi hanya dengan Bearer `CRON_SECRET` acak, perbandingan
digest constant-time, lease global dan batch terbatas. Cookie bukan otorisasi.
HEAD 405 tidak memulai retensi. Cron tidak menggantikan backup atau delivery email.

## Batas kepercayaan

API memeriksa sesi terverifikasi, Origin untuk mutation, ownership, rate limit,
Zod, batas ukuran dan transaksi/versi. Semua referensi dan skill adalah data;
instruksinya tidak memberikan akses tool, filesystem atau secrets.

## Referensi privat

PNG/JPEG/WebP diperiksa signature dan di-encode ulang tanpa EXIF, maksimal 24 juta
pixel sebelum resize 1600px. PDF maksimal 100 halaman. DOCX maksimal 300 entri,
20 MiB expanded, 2 MiB per entri; enkripsi, macro, traversal dan entity ditolak.
Parser berjalan dalam proses anak tanpa environment secrets, heap 192 MiB dan
timeout. Teks hasil ekstraksi maksimal 12.000 karakter; konteks generasi dibatasi
lagi. Produksi wajib memakai HTTPS; enkripsi at rest diatur pada volume/bucket
oleh operator. Storage lokal development tidak mengenkripsi blob sendiri.

Di domain publik, PDF/DOCX harus lolos pemindai yang ditunjuk
`REFERENCE_SCANNER_PATH` (executable ClamAV-compatible). Tidak ada pemindai berarti
file ditahan/ditolak. Loopback development dapat memproses fixture tanpa scanner;
hasil lokal bukan bukti scanning produksi. File pending/rejected tidak dapat
diunduh. Setiap unduhan memeriksa ownership dengan no-store/nosniff/CSP sandbox.

Storage lokal harus di luar `public/` dengan direktori 0700/file 0600. Produksi
dapat memakai bucket S3-compatible privat. Jangan memberikan ACL publik. Keys
server tetap di environment dan tidak dikirim ke client atau manifest. URL sumber
dicatat sebagai metadata; tidak di-fetch. Analisis vision memerlukan model yang
dikonfigurasi admin dan tindakan pengguna, dibatasi request serta dicatat usage.

## Retensi dan pemulihan

Menghapus lampiran melepasnya dari brief; revisi lama masih bisa merujuknya.
Maintenance membersihkan storage yatim setelah satu jam, serta referensi yang
tidak lagi dibutuhkan revisi/job. Project/job mengikuti retensi paket yang ada.
Backup privat dapat memuat data sampai masa backup berakhir; storage S3 perlu
kebijakan backup dan lifecycle yang sesuai. Jangan menggunakan test pada produksi.

## Supply chain dan rilis

Versi dependency dikunci. Skill aktif menyertakan sumber, lisensi dan checksum;
skill tanpa lisensi yang jelas hanya tercatat sebagai metadata. Pembaruan skill
ditinjau admin; tidak mengeksekusi skrip unduhan. CI menjalankan pemeriksaan
wajib, audit dependency dan secret scan. Temuan high/critical memblokir rilis.

## Operator dan batas biaya

Login Google memakai callback Better Auth dengan state cookie/database sekali
pakai dan PKCE. Callback memanggil verifier Google dari library secara eksplisit
untuk signature RS256, issuer, audience serta masa berlaku sebelum membaca profil.
Email provider wajib terverifikasi; implicit linking hanya ke
email lokal terverifikasi yang sama. Token Google tidak dipertahankan. Unique
constraint provider/subject mencegah satu identitas terikat ke beberapa akun.
Signup pause juga diperiksa pada callback. Suspend diperiksa sebelum sesi baru.
Better Auth 1.7.11 tidak menantang MFA aplikasi pada social sign-in: akun dengan
MFA serta owner/admin harus memakai email/password/TOTP, termasuk setelah promosi
role saat OAuth berjalan. Jangan mengubah aturan ini tanpa regression test.

Hosting memakai DB terlindungi dan bucket privat bersama; URL/kredensial hanya di server.
Tabel aplikasi memakai RLS tanpa policy publik, dengan hak PUBLIC/anon/
authenticated dicabut. Supabase Data API dimatikan bila tidak diperlukan;
tabel baru wajib dilindungi migration yang sama ketatnya. Role koneksi server
harus pemilik tabel atau memiliki izin/bypass yang ditinjau, bukan role browser.
Vercel membatasi payload buffered; konfigurasi otomatis menjaga unggahan dan
konten ZIP di bawah 3 MiB serta pool maksimal tiga koneksi per instance.
Migration/backup serta lock worker memakai koneksi langsung/session, bukan
transaction pooler. `check:hosted` memeriksa konfigurasi, bukan bukti konektivitas
atau validitas secret. Prosedur peluncuran ada di `docs/DEPLOYMENT.md`.

Role/status terkini diperiksa server pada setiap request. Suspend mencabut sesi,
memblokir login/API dan menghentikan job antrean sebelum AI. Request provider yang
terlanjur berjalan masih dapat ditagih. Callback pembayaran tetap diproses.
Owner terakhir dilindungi transaksi dan lock, termasuk penurunan role bersamaan.
Undangan staf terikat email terverifikasi, hash token sekali pakai dan expiry
24 jam. Penerimaan mencabut sesi; role tidak ditentukan dari input signup.

BetterAuth menangani TOTP/MFA dan recovery code terenkripsi. Aktivasi berhasil
mencabut sesi lain. Operator pada domain publik wajib memakai MFA; pengujian lokal
tidak mengaktifkan MFA pada akun pengguna secara otomatis. URI setup/recovery code
hanya terlihat saat pengaturan; tidak disimpan pada browser storage atau log.

Semua perubahan panel memerlukan verifikasi ulang password/TOTP pada sesi yang
berlaku lima menit, Origin benar, alasan, permission dan Idempotency-Key. Owner
saja mengelola staf, persetujuan refund uang dan kontrol anggaran. Batas grant
admin kumulatif per hari UTC; default nol. Key sama dengan payload berbeda dan
versi lama ditolak 409. Audit atomik dengan perubahan mencatat actor/target,
alasan, request ID dan before/after yang disunting dari kredensial. Verifikasi
ulang sukses/gagal serta penolakan API admin tercatat tanpa payload autentikasi.
Log penolakan dibatasi agar tidak menjadi saluran penulisan tanpa batas.

Konten admin terbatas pada key template/skill siap. Review mendahului publish,
versi lama tetap immutable dan snapshot job membekukan konten saat perencanaan.
Panduan keamanan wajib tidak dapat diganti. Sumber/lisensi/checksum wajib;
tautan metadata tidak di-fetch dan kode plugin tidak dieksekusi. Integrasi plugin
baru tetap memerlukan tinjauan repository. Pesan bantuan/konten publik berupa
teks; catatan internal hanya tersedia bagi operator.

Refund uang memerlukan alur owner, referensi merchant dan bukti; panel tidak
melakukan transfer dana. Snapshot invoice/manfaat dan ledger keuangan dipertahankan.
CSV privat membutuhkan reauth/audit, maksimum 31 hari/1.000 invoice, formula
spreadsheet dinetralkan. Permintaan privasi terminal memerlukan penanganan manual
dan bukti; hubungan keuangan memakai Restrict untuk mencegah cascade delete.

Request AI nyata harus memiliki audit dan reservasi persisten dalam transaksi.
Batas request/token berlaku global/per akun; estimasi USD memakai tarif operator.
Usage hilang atau request ambigu menahan cadangan. Estimasi bukan tagihan final;
aktifkan spending cap di provider. Uji otomatis menghapus key nyata dari environment
fixture dan menolak server integration/E2E yang tidak menjalankan mock.

Panel hanya dapat menurunkan cap dibanding environment. Tarif input/output dan
versinya dicatat per request nyata. Tarif atau usage yang belum diketahui tidak
dianggap biaya nol. Jeda signup/checkout/generasi tidak menghentikan callback dan
rekonsiliasi. Gunakan cap provider serta alert eksternal untuk biaya sebenarnya.

## Backup dan kesiapan layanan

Backup database dan lampiran menggunakan snapshot, checksum serta AES-256-GCM;
key terpisah mode 0600. Folder incomplete dan hasil inspeksi restore bersifat
privat. Restore membuat database baru; tidak menimpa sumber secara otomatis.
Readiness memeriksa database/migration serta dependency sesuai mode, dengan timeout.
Mode worker memerlukan heartbeat sehat; mode request tidak memerlukannya. HTTP
503 berarti dependency wajib bermasalah; liveness hanya memeriksa proses web.
Lihat `docs/OPERATIONS.md` dan `docs/VERCEL_SUPABASE_FREE.md`.

## Pelaporan

Laporkan masalah secara privat ke operator melalui alamat dukungan yang
dikonfigurasi aplikasi. Jangan memublikasikan exploit, secrets atau data pengguna
di issue publik. Rotasi kredensial terdampak, batasi akses, catat dampak, perbaiki,
jalankan regression test dan verifikasi pemulihan sebelum membuka layanan.

## Credential and release controls

Shared production credential seeds and password arguments are forbidden. Owner
bootstrap is serialized and first-owner-only; recovery cannot promote users or
remove MFA. Use audited staff invitations for other privileged accounts.

Exact API path/method contracts run before dispatch. Private browser query caches
are bound to the workspace session and discarded across login/logout. Uploads on
Vercel require shared private Supabase or S3 storage; a publishable Supabase key
is not a server database or storage credential. New queued work checks processing
readiness before quota reservation. Cancellation refunds also check actual output checkpoints.

Main-branch auto deployment is disabled. The production workflow accepts only a
successful validation for the current main SHA. Protect its GitHub environment
and branch rules; passing a build alone never certifies a runtime connection,
email, OAuth, scanner, payment provider, off-host backup, or restore drill.

The current-source scanner rejects credential hashes and non-loopback database
password URLs. Historical revoked findings use fingerprint-only baselines and
remain explicitly reported; source scans never apply historical exceptions.

Operations-only release checks explicitly defer login/provider enrollment and
payment activation. They never disable session, ownership, role, Origin or MFA
enforcement and never certify a public launch. Default full checks retain these
blockers. The worker image runs as a non-root user; scanner probes and ClamAV
children receive no application secrets. Missing/stale signatures fail closed.
Off-host recovery validates bounded receipts, safe unique file names, sizes and
hashes before publishing a local encrypted bundle. AES-GCM/key checks remain
mandatory before restore.
