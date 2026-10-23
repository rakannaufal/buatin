# Profil awal Vercel + Supabase gratis

Keputusan pengguna: hanya Vercel dan Supabase, tanpa worker/provider hosting lain.
Profil ini menggantikan kebutuhan worker persisten untuk dokumen template.
Login publik dan payment gateway tetap ditunda; proteksi akun tidak dinonaktifkan.

## Perilaku yang didukung

- Brief, preferensi, rencana, snapshot dan dokumen disimpan di PostgreSQL Supabase.
- Vercel memakai `PROCESSING_MODE=request` secara otomatis bila variable tersebut
  tidak diisi. Isi eksplisit `request` di Production agar pilihan mudah diaudit.
- Halaman rencana, proses, referensi dan dashboard mengirim POST `/api/processing`
  saat status menunjukkan pekerjaan tertunda. GET/HEAD tidak memulai pekerjaan.
  Header `X-Processing-Mode` mengatur continuation pada client, bukan otorisasi.
- Satu request memproses satu referensi, satu rencana, atau maksimal enam dokumen
  dengan anggaran langkah 15 detik. Pemeriksaan waktu terjadi antar file; timeout
  platform tetap mungkin. Snapshot dan checkpoint berhasil dipertahankan.
- Lease akun 240 detik membatasi permintaan bersamaan. Lease job 120 detik dan
  fencing version mencegah invocation lama menimpa checkpoint setelah recovery.
  Task/reference yang terputus dipulihkan setelah lima menit pada POST berikutnya.
- Kuota dicadangkan sekali saat enqueue. Continuation/recovery tidak mencadangkan
  kuota baru. File gagal tidak diulang setiap slice; pengguna memilih resume.
- Biarkan halaman proses atau dashboard terbuka sampai selesai. Halaman yang
  ditutup menghentikan continuation; buka kembali untuk melanjutkan. Tidak ada
  jaminan pemrosesan latar belakang ketika seluruh tab ditutup.
- Dokumen berasal dari template terstruktur, bukan inference AI. Vision tetap
  terpisah, nonaktif tanpa model/provider/batas biaya yang lengkap.

## Environment Vercel Production

Simpan melalui secret environment hosting; jangan masukkan nilai nyata ke Git.

| Variable                     | Nilai/peran                                                     |
| ---------------------------- | --------------------------------------------------------------- |
| `APP_URL`, `BETTER_AUTH_URL` | Origin HTTPS deployment                                         |
| `DATABASE_URL`               | Transaction pooler Supabase, TLS, database yang sudah dimigrasi |
| `DATABASE_DIRECT_URL`        | Direct/session untuk migration/backup dari operator             |
| `BETTER_AUTH_SECRET`         | Secret sesi yang sudah ada; jangan diganti sembarangan          |
| `PROCESSING_MODE`            | `request`                                                       |
| `MOCK_LLM`                   | `false`                                                         |
| `ADMIN_REQUIRE_2FA`          | `true`                                                          |
| `REFERENCE_STORAGE`          | `supabase`                                                      |
| `SUPABASE_URL`               | URL project Supabase                                            |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server secret key atau JWT service_role; bukan publishable/anon |
| `SUPABASE_STORAGE_BUCKET`    | `buatin-references`                                             |
| `CRON_SECRET`                | Minimal 32 karakter acak; dikirim Vercel sebagai Bearer cron    |
| `SUPPORT_EMAIL`              | Alamat operasional; dapat memakai pengaturan site yang ditinjau |

`DATABASE_WORKER_URL`, host worker dan S3 access keys tidak diperlukan dalam mode
ini. Jangan memakai token CLI Supabase sebagai server key. Key server storage
memiliki akses luas: server-only, tidak boleh memakai prefix `NEXT_PUBLIC_`.
Sesuaikan nilai dengan `.env.example` / `deploy/hosted.env.example`.

## Referensi privat

Bucket wajib privat. Adapter memeriksa status bucket sebelum setiap write,
menggunakan URL project Supabase HTTPS yang dibatasi, timeout dan pembacaan
berukuran terbatas. URL file tidak diberikan kepada browser; download melalui
API dengan sesi, ownership dan status pemeriksaan.

PNG/JPG/WebP di-encode ulang tanpa EXIF; TXT/MD diperiksa UTF-8 dan karakter
kontrol. Parser berjalan dalam child process tanpa environment aplikasi, heap
192 MiB dan timeout. File parser serta dependensi native disertakan dalam tracing
Next. PDF/DOCX ditolak sebelum write pada mode request karena tidak ada scanner
ClamAV persisten. Jangan membuka format tersebut dengan melewati pemeriksaan.

Vercel membatasi file/ZIP menjadi 3 MiB dan pool web maksimal tiga koneksi per
instance. Kuota referensi per proyek/akun tetap berlaku. Batas free provider
dapat menghentikan upload/generasi; tidak ada upgrade atau biaya otomatis di kode.

## Maintenance dan pemulihan

`vercel.json` menjadwalkan GET `/api/cron/maintenance` sekali sehari. Ini endpoint
mesin yang memerlukan Bearer secret, tidak menerima cookie sebagai otorisasi.
HEAD selalu 405 tanpa mutation. Jadwal Hobby dapat terlambat; bukan SLA.

Lease global mencegah overlap. Tiap run membatasi job/proyek kedaluwarsa menjadi
20 kandidat masing-masing; session/verification/request limit/outbox menjadi
500 per jenis. Penghapusan proyek/job memeriksa ulang kondisi di bawah lock akun.
Ledger, invoice dan pembayaran tidak dihapus. Sweep storage memakai cursor 100
objek per run, grace period satu jam, serta batas waktu; backlog perlu diawasi.
Referensi yang masih dirujuk revisi/snapshot dipertahankan.

Periksa `Setting.maintenance` dan `/api/health/ready`; UI operasi melaporkan
dependency sebenarnya. Mode request tidak menulis heartbeat worker palsu.
Backup database dan storage bukan hasil cron ini. Jalankan backup terenkripsi
dan latihan restore melalui operator; free Supabase tidak memberi jaminan PITR
atau backup off-host aplikasi. Simpan key pemulihan terpisah.

## Validasi dan batas peluncuran

```sh
npm run test:request
npm run test:e2e -- tests/e2e/workspace.spec.ts --grep 'desktop:|mobile:'
npm run deploy:smoke -- https://deployment-origin --scope=operations
```

Uji request memerlukan database/web fixture loopback terisolasi, `MOCK_LLM=true`,
`PROCESSING_MODE=request`, tanpa worker, dan cron secret fixture yang dicantumkan
di CI. Jangan menjalankannya terhadap produksi. CI menguji kedua mode secara
terpisah. Hasil fixture tidak membuktikan OAuth, settlement atau kapasitas cloud.

Vercel Hobby dibatasi penggunaan personal/nonkomersial menurut Terms. Gunakan
profil ini untuk prototipe/uji awal yang memenuhi ketentuan tersebut; kegiatan
komersial memerlukan paket yang sesuai. Supabase Free memiliki kuota database/
storage dan dapat pause saat tidak aktif. Jangan memasang keepalive untuk
menghindari kebijakan provider.

Prioritas sebelum membuka layanan: aktivasi login/MFA yang ditunda, backup dan
restore off-host, monitoring/alert serta verifikasi kapasitas. Payment tetap
nonaktif sampai integrasi dan harga ditinjau. Rincian bukti aktual di VALIDATION.

## Deploy otomatis dan rotasi token

Workflow `Deploy verified production` hanya menerima Native validation sukses
untuk push main pada repository ini. Script membandingkan SHA validasi dengan
main terkini sebelum meminta deployment. Automatic Git deployment main tetap
nonaktif agar CI mendahului deploy. Proteksi main tetap wajib untuk admin.

GitHub Environment `production` menyimpan `VERCEL_TOKEN`, `VERCEL_TEAM_ID` dan
`VERCEL_PROJECT_ID`. Token aktif hanya mencakup proyek `buatin`, berakhir
21 Januari 2027 pukul 14.14 WIB. Jangan memakai token CLI akun sebagai pengganti.

1. Sebelum tanggal tersebut, buat token pengganti dari dashboard Vercel dengan
   scope tim lalu proyek `buatin`, masa berlaku 90 hari. Periksa scope dan expiry
   sebelum Create; jangan memilih All Projects atau Full Account.
2. Simpan token pengganti langsung pada secret `VERCEL_TOKEN` di environment
   production GitHub. Jangan mengirimnya lewat chat, command argument atau Git.
3. Uji melalui workflow pada main yang sudah lulus validasi dan masih terkini.
   Bila menjalankan ulang job, pastikan SHA main belum berubah. Periksa job
   success, Vercel Ready, kesamaan gitSource/validatedCommit dan smoke publik.
4. Setelah pengganti terverifikasi, cabut token lama dan catat expiry baru pada
   runbook operator. Deployment gagal karena expiry tidak menghapus deployment
   aktif; periksa status provider sebelum mencoba ulang.

Sumber resmi diperiksa 23 Oktober 2026:

- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/legal/terms
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
