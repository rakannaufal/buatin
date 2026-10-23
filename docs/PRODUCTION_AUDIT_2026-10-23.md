# Audit operasional 23 Oktober 2026

## Pembaruan profil gratis

Keputusan terbaru: hanya Vercel + Supabase. Mode request memakai POST continuation,
lease/checkpoint database dan storage Supabase privat. Kebutuhan host worker pada
catatan terdahulu tidak berlaku untuk profil aktif. PDF/DOCX ditutup sampai ada
scanner; template, gambar dan TXT/MD tetap didukung. Tidak ada provisioning berbayar.

Prioritas aktual sebelum peluncuran:

1. **P0 - Runtime inti terverifikasi.** SHA `fd240bb` lulus required verify,
   dipromosikan ke main dan deployment Production Ready. Smoke publik 14/14,
   readiness 200, mode request dan mock false. Proteksi main tetap aktif.
   Alur privat cloud belum diuji melalui akun produksi; bukti bucket read-only
   dan fixture tidak menggantikannya. CD otomatis menunggu izin token khusus
   proyek pada GitHub Environment production; deploy manual berhasil.
2. **P1 - Backup/restore dan monitoring.** Cron harian hanya retensi batch terbatas;
   bukan backup. Belum ada bukti backup off-host/restore produksi. Pantau maintenance,
   error rate, pemakaian DB/storage, expiry lease dan backlog. Workflow monitor
   HTTP telah diaktifkan; run manual `39910384926` sukses. Delivery alert operator
   belum dibuktikan.
3. **P1 - Login dan MFA operator (ditunda).** Tetap wajib sebelum membuka akses
   publik. Jangan melewati ownership/Origin/MFA untuk mempermudah pengujian cloud.
   Payment nonaktif sampai aktivasi merchant dan harga ditinjau.
4. **P2 - Batas gratis dan kapasitas.** Ukur staging, concurrent user, pool dan
   throughput. Tab harus terbuka untuk continuation. Tidak ada SLA background,
   scanner persisten atau kapasitas tak terbatas. Hobby hanya personal/nonkomersial;
   penggunaan komersial memerlukan paket sesuai ketentuan provider.

Runbook aktif: `VERCEL_SUPABASE_FREE.md`. Bukti aktual: `VALIDATION.md`.
Bagian berikut merupakan riwayat audit sebelum profil request diterapkan.

Status: **belum layak dibuka untuk pengguna publik**. Penundaan login publik,
MFA enrollment dan payment gateway mengikuti keputusan pengguna. Proteksi akses
tetap aktif. Kelulusan fixture/build bukan bukti aktivasi provider atau kapasitas.

## P0: runtime dan deployment

Proteksi `main` sudah aktif dan diverifikasi melalui API: `verify` dari GitHub
Actions wajib lulus, strict/up-to-date, berlaku bagi admin, force push dan
penghapusan branch dilarang. Commit harus lulus CI pada branch sebelum fast-forward.

1. **Deployment dashboard sudah Ready; pipeline otomatis masih terblokir.**
   `e3fa641` lulus required check `verify` sebelum fast-forward ke `main`.
   Commit tersebut diterapkan melalui dashboard Vercel sebagai deployment
   `Ags1WizPkdbQ8SvfZC5rdg3P5cgm`, Ready, Production, domain
   `buatin-kappa.vercel.app`. GitHub repository dan environment
   `production` belum memiliki secret deployment Vercel. Lengkapi `VERCEL_TOKEN`,
   `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` melalui secret manager setelah integrasi
   akun tersedia. Automatic Git deployment tetap dinonaktifkan; required CI
   mendahului deploy. Log step yang gagal belum dapat diunduh dengan akses saat ini;
   jangan menyimpulkan error internal provider tanpa log sebenarnya.
2. **Koneksi web dan mode produksi pulih; readiness belum sehat.** Sesudah
   persetujuan pengguna, `MOCK_LLM=false` disimpan pada Production lalu deployment
   diulang. Public config teramati `mock:false`. Smoke nyata: 13/14 pemeriksaan
   lulus; pricing/session/public-config 200, projects anonim 401, HEAD liveness
   200, suffix asing 404, metode salah 405 dan OPTIONS/Allow sesuai kontrak.
   Readiness tetap 503 dengan `ok:false`; kelulusan build tidak menutup gate ini.
   Jangan menonaktifkan TLS/RLS, ownership atau guard untuk mengubah hasilnya.
3. **Worker cloud belum hidup.** Heartbeat Supabase belum ada. Gunakan satu worker
   persisten dengan direct/session connection, bukan transaction pooler.
   Blueprint Docker Render sekarang menyertakan ClamAV dan PostgreSQL client 17;
   pembuatan host, biaya, pengaturan secret dan readiness nyata masih diperlukan.
   Akun Render sudah login dan consent identitas/email disetujui pengguna.
   Formulir `buatin-worker` disiapkan memakai repository publik, Dockerfile
   `deploy/worker.Dockerfile`, branch main, Singapore, 1 CPU/2 GB RAM.
   Harga dashboard US$25/bulan ditolak pengguna: anggaran awal harus gratis.
   Service belum dibuat; jangan menerapkan blueprint berbayar tanpa izin baru.
   Opsi yang dinilai sesuai arsitektur saat ini adalah VM Oracle Always Free
   untuk worker/scanner, dengan database/storage tetap Supabase. Akun, kapasitas
   region dan kompatibilitas image ARM belum diverifikasi. Region/key S3,
   koneksi DB Direct/Session, auth secret bersama dan kontak perlu dilengkapi.

### Batas opsi gratis

Dokumentasi provider diperiksa pada 23 Oktober 2026:

- [Render Free](https://render.com/docs/free) tidak mendukung Background Worker.
  Web service gratis tidur setelah 15 menit tanpa trafik; bukan pengganti worker
  persisten hanya dengan mengganti tipe service atau menambah ping buatan.
- [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
  mencantumkan jatah A1 2 OCPU/12 GB RAM pada tenancy gratis. Ketersediaan shape
  tergantung home region; instance idle bisa ditarik kembali. Alokasi harus
  diperiksa terhadap seluruh resource akun sebelum provisioning. Ini kandidat,
  bukan bukti host sudah tersedia atau image worker ARM sudah lulus.
- [Pendaftaran Oracle](https://www.oracle.com/cloud/free/faq/) memerlukan
  verifikasi kartu, dapat menahan otorisasi sementara, tanpa SLA Always Free.
  Jangan mengaktifkan Pay As You Go atau memakai resource di luar jatah gratis
  untuk melewati kekurangan kapasitas tanpa persetujuan baru.
- [Vercel Hobby](https://vercel.com/legal/terms) dibatasi untuk penggunaan pribadi
  atau nonkomersial. Peluncuran SaaS komersial memerlukan peninjauan hosting;
  menunda payment tidak dengan sendirinya menjadikan penggunaan nonkomersial.

Keputusan provider pengganti menunggu ketersediaan akun Oracle atau kebutuhan
tanpa kartu. Jangan menghapus scanner, ownership atau guard kesiapan agar layanan
terlihat sehat pada host yang tidak mendukung kebutuhannya.

## P1: ketahanan data dan operasi

| Area             | Bukti saat audit                                                               | Syarat penutupan                                                                                     |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Database         | 12 migration selesai; perlindungan tabel telah diaudit sebelumnya              | Probe runtime Vercel/worker memakai role server dan TLS; ukuran pool ditinjau                        |
| Referensi        | Satu bucket privat tersedia; kredensial S3 runtime belum tersedia              | Upload/read/delete milik akun uji, penolakan lintas akun, batas payload melalui host tujuan          |
| Scanner          | Wrapper, freshness probe dan isolasi environment diuji; image memiliki gate CI | Signature update, PDF bersih dan EICAR pada lingkungan terisolasi; heartbeat scanner sehat           |
| Backup           | Tidak ada receipt backup/off-host pada Supabase; latihan lokal tersedia        | Target privat terpisah, key terpisah, backup terjadwal, download dan restore nyata dari luar host    |
| Monitoring       | Workflow HTTP tersedia, jadwal belum aktif                                     | Origin sehat, `MONITOR_ENABLED=true`, notifikasi operator dan latihan gangguan; `ops:check` internal |
| Dukungan/privasi | Kontak, retensi dan prosedur memerlukan keputusan pengelola                    | Identitas/kontak nyata, tenggat dan kebijakan retensi disetujui                                      |

Downloader backup memeriksa receipt, batas ukuran, nama aman/unik, checksum dan
permission sebelum menerbitkan direktori hasil. Restore tetap membutuhkan key
AES-GCM dan database latihan baru; download sukses sendiri tidak membuktikan restore.

## P2: kapasitas dan pemeliharaan

- Uji beban bertahap pada staging dengan batas aman: koneksi Vercel/Supabase,
  antrean worker, waktu respons p95, error rate, CPU/memori scanner dan anggaran.
  Belum ada kapasitas pengguna bersamaan atau SLA yang terukur.
- Verifikasi Safari/Firefox, perangkat fisik dan kondisi jaringan lambat pada
  origin tujuan. Uji Chromium fixture tidak membuktikan seluruh perangkat.
- Evaluasi pembaruan ESLint yang masih memberi peringatan dukungan. Pindah major
  perlu pemeriksaan kompatibilitas, bukan menonaktifkan aturan lint.

## Penundaan yang disengaja

Login/password reset/email/Google nyata, enrollment MFA operator dan pembayaran
nyata dikerjakan pada tahap berikutnya. `--scope=operations` memisahkan laporan,
bukan melewati keamanan atau membuka workspace anonim. Pemeriksaan default penuh
tetap mencantumkan gap tersebut. Sebelum peluncuran publik, selesaikan aktivasi
login; sebelum penjualan paket, selesaikan merchant dan settlement.

Perintah, hasil aktual dan keterbatasan pengujian tercatat di `VALIDATION.md`.
Panduan aktivasi ada di `PRODUCTION_RELEASE.md`. Tidak ada secret atau data akun
privat dalam laporan ini.
