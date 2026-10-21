# Runbook operasi

## Menyiapkan host kemudian

Deployment awal memakai Vercel web, Supabase DB/storage dan Railway worker;
ikuti `DEPLOYMENT.md`. Web dapat serverless, worker harus tetap berjalan.
Contoh systemd/Caddy berikut hanya alternatif bila pindah ke server sendiri.

Gunakan Node.js 24, npm lockfile dan PostgreSQL yang kompatibel dengan pg-boss.
Jangan mengandalkan request serverless untuk pekerjaan panjang.
Simpan `.env` produksi/secret file di luar repository,
mode 0600, akses hanya service user. Instal seluruh dependency termasuk runtime
tsx; build worker saat ini memverifikasi tipe, start worker memakai TypeScript.

Pada host Linux, sesuaikan contoh `deploy/systemd/` dan `deploy/Caddyfile` untuk
path, user, runtime, database lokal/managed dan domain sebenarnya. Contoh bukan
installer yang sudah dijalankan. Untuk database managed, ganti dependency
postgresql.service. Web/worker memakai satu direktori lampiran privat yang sama
atau satu bucket privat. Batasi akses PostgreSQL pada koneksi server ber-TLS.
9router harus memakai gateway HTTPS berautentikasi yang terjangkau kedua host.

Konfigurasi produksi: APP_URL HTTPS, auth secret acak, kontak nyata, Resend dan
Turnstile, model dan kredensial AI, tarif/batas AI, storage/scanner serta key backup.
Lihat `.env.example`; isinya bukan secret produksi siap pakai. Jangan menjalankan
script owner bootstrap atau test dengan database produksi tanpa tujuan yang jelas.

## Rilis dan rollback

1. Buat backup lengkap dan catat versi aplikasi/schema yang sedang berjalan.
2. Jalankan seluruh pemeriksaan `TESTING.md`, lalu build web/worker pada release
   directory. Gunakan artifact yang sama pada staging dan produksi.
3. Terapkan migration kompatibel, restart satu worker dan web, periksa readiness,
   log serta alur nyata. Maksimal satu proses worker; concurrency diatur di proses.
4. Buka trafik setelah P0 selesai dan smoke staging lulus. Biarkan paid tiers
   nonaktif sampai pembayaran produksi terverifikasi.
5. Bila regresi, batasi trafik/side effect lalu kembali ke release sebelumnya yang
   kompatibel dengan schema. Jangan otomatis rollback schema atau menimpa database.

Pada alternatif server sendiri, Caddy mengizinkan 12 MB hanya untuk POST lampiran;
request lain 256 KB. Upload
masih dibatasi API 5 MiB gambar/10 MiB dokumen secara default. Samakan proxy saat
menaikkan batas env; uji upload sah dan penolakan oversize melalui proxy sebenarnya.
Vercel otomatis membatasi file/ZIP 3 MiB sesuai `DEPLOYMENT.md`.

## Pemeriksaan dan alert

- Liveness hanya proses HTTP: `/api/health/live`.
- Readiness database/migration + worker: `/api/health/ready`, HTTP 503 saat gagal.
  Tidak melakukan inferensi berbayar pada setiap probe.
- `npm run ops:check`: JSON antrean, disk aplikasi, worker, email gagal, review
  pembayaran dan budget AI. Disk <1024 MiB atau outbox >120 detik menjadi alert.
  Disk mount/bucket lain perlu monitor infrastrukturnya sendiri.
- `npm run check:production -- --provider`: gap konfigurasi menurut prioritas,
  runtime serta daftar model. Pemeriksaan model bukan bukti saldo/kuota upstream.
- Service/timer monitor menghasilkan journal dan exit status. Hubungkan layanan
  uptime/log/alert eksternal setelah tujuan operator tersedia; uji jalur alert.

Gunakan request ID dan kode event untuk diagnosis. Jangan menyalin log berisi
brief, isi referensi, password, session token, kunci, URI MFA atau kode pemulihan
ke kanal publik. Akun operator harus menggunakan MFA dan scope minimum.

## Backup database dan blob

```sh
npm run backup:key
npm run db:backup
npm run backup:verify -- /path/ke/direktori-backup --restore
```

`backup:key` membuat key 32 byte acak pada BACKUP_KEY_FILE (0600), tidak pernah
menimpa key lama atau mencetak nilainya. Produksi menggunakan path privat absolut
yang dapat dibaca service user. Simpan salinan key terpisah dari salinan backup;
kehilangan key berarti backup terenkripsi tidak dapat dipulihkan.

`db:backup` sekarang membuat bundle terenkripsi AES-256-GCM di BACKUP_DIRECTORY,
bukan hanya `.dump`. pg_dump memakai exported repeatable-read snapshot yang sama
dengan metadata lampiran. Semua blob lokal/S3 dibaca dan checksum/ukuran diperiksa.
Jika lampiran berubah, hilang atau tidak dapat diverifikasi, backup gagal. Coba
lagi setelah pemrosesan selesai; jangan menganggap folder `.partial` sebagai backup.
Folder incomplete dapat memuat dump/blob plaintext sementara; perlakukan privat,
periksa penyebab dan hapus secara sengaja setelah tak diperlukan.

Setelah bundle selesai, job mencatat ID dan waktu ke `Setting` dengan key
`backup.completed`. Panel web membaca receipt ini dari DB bersama walau volume
backup berada di host lain. Receipt bukan bukti salinan di luar host, kesehatan
volume atau hasil restore. Scanner juga dilaporkan heartbeat worker; konfigurasi
path pada web tidak membuktikan executable tersedia di Railway.

`backup:verify -- ... --restore` mendekripsi ke folder inspeksi privat `.local/`,
memeriksa tag/checksum, membuat database `buatin_restore_*` baru, memulihkan schema
dan memeriksa hubungan database/blob. Tidak menimpa database/storage aplikasi.
Database dan file inspeksi dipertahankan untuk pemeriksaan; mengandung data privat,
tidak boleh dilayani web. Bersihkan secara manual setelah disetujui pengelola.
`db:check-restore` lama hanya untuk `.dump` lama tanpa backup lampiran.

Jadwalkan backup harian dari service/timer contoh. Tentukan retensi dan kapasitas,
salin bundle terenkripsi ke luar host dengan akun backup terpisah, versioning /
object lock bila diperlukan. Tidak ada penghapusan backup otomatis tanpa kebijakan
yang disetujui. RPO/RTO nyata harus diukur dalam latihan restore di host tujuan.

Pemulihan insiden: hentikan trafik dan worker, verifikasi backup ke lokasi/database
baru, pulihkan blob privat dan key/config yang sesuai, periksa migration serta
ownership, arahkan service ke hasil inspeksi yang telah disetujui, smoke kemudian
buka trafik. Jangan menyalakan worker test-restore sebelum menilai job lama dan
kemungkinan pengulangan side effect/email/pembayaran.

## Gangguan umum

| Gejala                  | Tindakan                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readiness 503           | Periksa koneksi/migration DB lalu heartbeat, advisory lock dan journal worker. Liveness 200 sendiri belum cukup.                                                            |
| Outbox menua            | Pastikan satu worker hidup dan DB/pg-boss dapat ditulis; jangan membuat banyak worker untuk melewati lock.                                                                  |
| LLM_DAILY_LIMIT         | Periksa pemakaian UTC, tarif, token/request dan batas provider. Tunggu reset harian atau ubah anggaran setelah persetujuan operator. Job dengan checkpoint dapat di-resume. |
| LLM_AUTH / model hilang | Periksa koneksi 9router tanpa mencetak key; lakukan discovery. Tidak ada fallback ke auth none.                                                                             |
| Email gagal             | Periksa sender/domain/key/suppression Resend; outbox dan retry tetap persisten. Jangan mencetak tautan reset ke log.                                                        |
| Pembayaran review       | Periksa dashboard merchant dan nominal/reference lalu minta rekonsiliasi. Redirect bukan bukti lunas.                                                                       |
| Upload ditolak          | Periksa batas proxy/API, scanner/signature dan storage. Jangan melewati scanner pada domain publik.                                                                         |
| Disk penuh              | Batasi upload/proses, periksa mount, backup serta retensi; jangan menghapus data pengguna secara massal.                                                                    |

## Rotasi dan insiden kredensial

Rotasi key 9router pada router, ganti environment privat, restart web/worker dan
jalankan discovery/smoke terbatas. Jangan menaruh key lama/baru pada tiket, commit
atau hasil spesifikasi. Cabut key lama setelah perubahan terverifikasi.

Auth secret juga mengenkripsi MFA melalui BetterAuth. Jangan menggantinya tanpa
rencana keyring/migration atau reenrollment yang didukung versi BetterAuth;
penggantian mentah dapat memutus sesi dan membuat secret MFA lama tidak terbaca.
Rotasi key backup dengan membuat key baru terpisah untuk backup baru; simpan key
lama selama backup lama masih diperlukan. Catat pemilik, waktu dan hasil uji
tanpa menuliskan nilai key.

## Permintaan data dan privasi

Pengguna terverifikasi membuat permintaan export/deletion pada Akun dengan
konfirmasi email. Admin meninjau di `/admin/privacy`. Perubahan status terminal mengantrekan
notifikasi email. Export data dan penghapusan tetap mengikuti pemenuhan manual;
status completed memerlukan processing sebelumnya serta referensi bukti.

Verifikasi identitas serta scope; catat penerimaan, owner dan tenggat sesuai
kebijakan yang disetujui. Untuk export, sertakan profil, proyek/hasil/lampiran,
revisi/preset/template, pemakaian dan pembayaran milik pengguna; keluarkan password,
secret MFA, recovery codes, session token dan key. Serahkan lewat kanal privat
terautentikasi yang disepakati. Jangan mengirim data ke orang lain tanpa instruksi.

Untuk penghapusan, hentikan pekerjaan aktif dan cabut sesi, nilai kewajiban retensi
pembayaran, lalu gunakan prosedur migrasi/anonymisasi yang ditinjau. Jangan langsung
DELETE User: relasi invoice/subscription/ledger/grant/kredit/bantuan kini
menolak penghapusan yang menghilangkan riwayat. Retensi dan pseudonimisasi perlu
prosedur tersendiri yang ditinjau. Dokumenkan
pengecualian, jadwal cadangan dan bukti pemenuhan sebelum menandai selesai.

Log penggunaan AI, budget period, audit dan permintaan selesai mengikuti cleanup
180 hari; permintaan terbuka tetap tersedia untuk ditindaklanjuti. Retensi finansial
dan backup harus ditentukan pengelola sebelum layanan publik dibuka.

## Pengelolaan admin

Lihat `ADMIN_GUIDE.md` untuk izin, reauth, undangan staf, harga, voucher,
refund merchant, kompensasi, jeda layanan, audit dan riwayat konfigurasi.
Jangan menggunakan restore database untuk membatalkan perubahan harga/voucher.
Settings dapat dipulihkan sebagai versi baru, konten melalui versi yang sudah
ditinjau, dan penawaran paket melalui draft baru. Snapshot pembelian/job lama
tetap dipertahankan.
