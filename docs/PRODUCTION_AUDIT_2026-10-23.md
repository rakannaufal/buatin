# Audit operasional 23 Oktober 2026

Status: **belum layak dibuka untuk pengguna publik**. Penundaan login publik,
MFA enrollment dan payment gateway mengikuti keputusan pengguna. Proteksi akses
tetap aktif. Kelulusan fixture/build bukan bukti aktivasi provider atau kapasitas.

## P0: runtime dan deployment

Proteksi `main` sudah aktif dan diverifikasi melalui API: `verify` dari GitHub
Actions wajib lulus, strict/up-to-date, berlaku bagi admin, force push dan
penghapusan branch dilarang. Commit harus lulus CI pada branch sebelum fast-forward.

1. **Deployment dashboard sudah Ready; pipeline otomatis masih terblokir.**
   `d70a600` lulus Native validation pada `main` (run `39894504574`). Commit
   tersebut kemudian diterapkan melalui dashboard Vercel sebagai deployment
   `AYgzMZsHJsgnWAFvEn3L3PEPNQLk`, Ready, Production, domain
   `buatin-kappa.vercel.app`. GitHub repository dan environment
   `production` belum memiliki secret deployment Vercel. Lengkapi `VERCEL_TOKEN`,
   `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` melalui secret manager setelah integrasi
   akun tersedia. Automatic Git deployment tetap dinonaktifkan; required CI
   mendahului deploy. Log step yang gagal belum dapat diunduh dengan akses saat ini;
   jangan menyimpulkan error internal provider tanpa log sebenarnya.
2. **Kredensial diperbarui; mode produksi belum tersimpan.** Setelah pengguna
   memperbarui environment dan redeploy kode lama `a251218`, pricing/session
   berubah dari 500 menjadi 200: koneksi database terbukti berhasil pada
   deployment tersebut. Setelah penerapan `d70a600`, HEAD liveness 200, suffix
   asing 404, metode pricing salah 405 dan OPTIONS/Allow sesuai kontrak.
   API utama mengembalikan 503 `SERVICE_UNCONFIGURED`. Log deployment terbaru
   menyebut satu field: `MOCK_LLM`. Perubahan `MOCK_LLM=false` belum disimpan:
   pemeriksaan persetujuan otomatis meminta konfirmasi spesifik pengguna.
   Setelah disetujui, simpan lalu redeploy dan ulangi smoke serta validasi DB
   dari runtime terbaru. Jangan menonaktifkan TLS/RLS, ownership atau guard.
3. **Worker cloud belum hidup.** Heartbeat Supabase belum ada. Gunakan satu worker
   persisten dengan direct/session connection, bukan transaction pooler.
   Blueprint Docker Render sekarang menyertakan ClamAV dan PostgreSQL client 17;
   pembuatan host, biaya, pengaturan secret dan readiness nyata masih diperlukan.
   Render belum login; halaman otorisasi GitHub meminta identitas dan email
   read. Persetujuan pengguna diminta sebelum pemberian akses baru tersebut.

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
