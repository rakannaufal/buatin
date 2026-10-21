# Spesifikasi pembangunan Buatin

Dokumen ini menjadi acuan aplikasi web Buatin, menggantikan rancangan workflow
n8n/Telegram dan MVP satu pemilik. Semua interaksi pengguna diproses pada website.
Tidak ada Docker, Docker Compose, n8n atau bot Telegram dalam runtime.

## Produk

Buatin mengubah brief website menjadi paket spesifikasi Markdown. Pengguna
memilih satu dari sembilan tipe website, menulis/impor brief, menjawab klarifikasi,
menyetujui checklist dokumen, memulai generasi, meninjau hasil dan mengunduhnya
untuk coding agent. Produk menghasilkan dokumen, bukan website target siap deploy.

Gunakan Next.js App Router + TypeScript, React, Tailwind/Radix, React Hook Form +
Zod, TanStack Query, PostgreSQL + Prisma, Better Auth, pg-boss, worker Node 24.
Deploy native Linux dengan systemd dan Caddy HTTPS. Redis tidak wajib. Pertahankan
font Manrope + Source Serif 4 dan palet mineral/hijau hutan.

## Paket

| Fitur                                  | Free           | Pro Starter     | Pro Plus        | Pro Max         |
| -------------------------------------- | -------------- | --------------- | --------------- | --------------- |
| Generasi                               | 1 seumur hidup | 3/minggu        | 10/minggu       | 25/minggu       |
| Reset                                  | Tidak          | Senin 00.00 WIB | Senin 00.00 WIB | Senin 00.00 WIB |
| Retensi hasil                          | 14 hari        | 30 hari         | 90 hari         | 180 hari        |
| 9 jenis, brief, klarifikasi, checklist | Ya             | Ya              | Ya              | Ya              |
| Hingga 42 Markdown + manifest          | Ya             | Ya              | Ya              | Ya              |
| Preview/source/prompt/ZIP/individual   | Ya             | Ya              | Ya              | Ya              |
| Resume proses sama                     | Ya             | Ya              | Ya              | Ya              |
| Revisi dan banding hasil               | -              | -               | Ya              | Ya              |
| Regenerasi pilihan beserta dependensi  | -              | -               | Ya              | Ya              |
| Preset brief pribadi                   | -              | -               | 50              | 50              |
| Template Markdown pribadi              | -              | -               | -               | 42              |
| Batch proyek                           | -              | -               | -               | Maks. 10 aktif  |
| Prioritas antrean                      | Standar        | Standar         | Lebih tinggi    | Tertinggi       |

Harga belum disetujui. Simpan null dan nonaktifkan checkout sampai operator mengisi
harga berdasarkan biaya AI. Jangan menjual menggunakan angka perkiraan.

## Akun dan isolasi

Registrasi publik memakai email terverifikasi, password minimal 12 karakter,
recovery sekali pakai, pencabutan sesi saat reset, Resend, Turnstile, serta rate
limit berbasis database. Lokal dapat memakai mailbox privat; jangan mengekspos
link verifikasi melalui endpoint publik. Produksi gagal tertutup bila belum siap.
Setiap proyek/job/file/preset/template/revisi/invoice harus dicari berdasarkan akun
sesi. Admin/owner mengelola operasional. Klien tidak boleh memilih role saat signup.

## Aturan penggunaan

Satu penggunaan berarti proses generasi baru untuk satu paket. Regenerasi pilihan
merupakan job baru dan memakai satu kuota; dokumen yang bergantung ikut dihasilkan
ulang. Hasil lain disalin sebagai checkpoint. Resume menggunakan snapshot/kuota
asal. Edit, preview, unduh, dan resume tidak memotong lagi. Planner dibatasi
terpisah agar Free tidak menjadi akses AI tanpa batas.

Reservasi kuota, job, files, key idempotensi dan outbox harus atomik. Gunakan lock
per akun dan constraint database, bukan hanya tombol disabled. Free tidak mendapat
kredit baru dari penghapusan proyek. Kegagalan permanen refund sekali ke periode
asal dan menutup job. Gangguan worker menyisakan checkpoint resumable. Pembatalan
sebelum AI refund; setelah AI mulai tetap dihitung.

Kuota Pro reset secara logis pada minggu kalender WIB; tidak memerlukan cron yang
mengubah semua baris. Tidak ada rollover. Tagihan bulanan dan reset mingguan
terpisah, termasuk bulan dengan lima reset. Perpanjangan/perubahan tingkat tidak
mereset pemakaian minggu berjalan.

## QRIS Duitku

Pembayaran hanya QRIS, manual setiap bulan. Tidak ada kartu, VA, atau autodebit.
Server memilih kanal merchant aktif NQ/SQ, membuat inquiry nominal tetap, lalu
menampilkan qrString sebagai gambar QR. Verifikasi HMAC SHA256, merchant, nominal,
referensi dan metode. Callback form-urlencoded dicatat durable sebelum diakui.
Aktifkan paket hanya setelah server mengonfirmasi status melalui API Duitku.
Redirect/query browser tidak boleh menentukan lunas. Callback duplikat/out-of-order
tidak menggandakan periode. Provider status diperiksa terbatas dengan backoff;
browser hanya polling database aplikasi.

Satu pembayaran menambah satu bulan kalender. Perpanjangan awal menambahkan masa
setelah akhir periode yang sudah dibayar. Tingkat baru berlaku periode berikutnya,
tanpa prorata. Snapshot manfaat mencegah perubahan katalog mengubah pembelian lama.
Setelah habis kembali ke Free. Hasil lama tetap bisa diunduh sampai captured expiry.

## Worker dan keamanan hasil

Worker persisten native dengan konkurensi terbatas antar akun. Maksimal satu job
berjalan per akun dan satu aktif per proyek. Max boleh mengantrekan beberapa proyek.
Prioritas mempertimbangkan umur antrean agar paket standar tidak kelaparan.
Transactional outbox, lease/fencing, checkpoint, resume dan recovery harus diuji.
Simpan penggunaan AI terpisah dari file hasil, termasuk planner/retry/repair.

Model AI tidak menentukan filesystem path, role atau kuota. Gunakan katalog 42
Markdown; manifest otomatis tidak memakai panggilan AI. Dependency closure dan
minimum wajib dikendalikan kode. Respons/template/brief tidak dipercaya: preview
tanpa raw HTML atau gambar remote, lint sebelum ekspor, blokir secret dan rujukan
putus. Fallback template dan mode mock selalu diberi label.

## Halaman dan operasional

Publik: landing, pricing, signup, login, verifikasi, recovery, privacy, terms.
Workspace: dashboard kuota/reset/masa aktif, editor/plan/progres/hasil/riwayat,
profil, billing/QRIS/invoice, pustaka preset/template, revisi/perbandingan, batch.
Admin: akun, harga/kuota/retensi, tagihan, pekerjaan, penggunaan AI, konfigurasi.
Semua memiliki keadaan loading/empty/error/success, mobile dan keyboard support.

Retensi hasil mengikuti paket saat job dibuat; downgrade tidak mempersingkat hasil.
Ledger Free serta data pembayaran tidak ikut terhapus bersama proyek. Sediakan
backup/restore, timer backup native, secret environment, HTTPS, log tanpa isi brief
atau key, CI native tanpa container, dan pemeriksaan konfigurasi produksi.

## Verifikasi wajib

Uji reset tepat Senin WIB, akhir bulan/leap year, reservasi bersamaan, refund
idempotent, penghapusan tanpa refill Free, expiry paket dan hasil, webhook duplikat,
nominal/referensi salah, callback sebelum inquiry selesai, pembayaran pending,
perpanjangan/perubahan paket tanpa reset, ownership, hak fitur per tingkat,
regenerasi dependensi, batch atomik, kerja adil, dan restart worker nyata.
Jalankan lint/typecheck/unit/integration/browser/build serta audit dependency.
Mock/provider stub tidak membuktikan pembayaran merchant atau email produksi.

Kontrak endpoint: `API.md`. Rincian finansial: `BILLING.md`. Keputusan:
`../DECISIONS.md`. Hasil validasi aktual: `VALIDATION.md`.
