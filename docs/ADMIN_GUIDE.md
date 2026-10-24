# Pengelolaan admin Bantuin

Implementasi 21 Oktober 2026. Hosting, domain, database produksi serta fasilitas
merchant tetap disiapkan terpisah. Panel tidak menyatakan layanan siap produksi
hanya karena formulir sudah tersedia.

## Akses operator

`owner` mengelola seluruh modul. `admin` dapat mengelola pengguna biasa, paket,
voucher, transaksi, generasi, konten, privasi dan bantuan. Hanya owner dapat
mengelola staf, menyetujui/menyelesaikan refund uang dan mengubah kontrol biaya.
Pengguna biasa tidak dapat membuka API atau halaman admin.

Role dan status akun dibaca dari database pada setiap request. Operator domain
publik wajib MFA sesuai kebijakan deployment; readiness memblokir peluncuran
ketika MFA operator belum siap. Form verifikasi di panel memeriksa password dan
TOTP, bila aktif, lalu membuka mutasi selama lima menit pada sesi tersebut.
Verifikasi gagal dibatasi lima kali per lima menit. Password/kode tidak disimpan
pada audit atau browser storage.

Semua mutasi admin membutuhkan Origin yang benar, `Idempotency-Key` 8–128
karakter, alasan dan izin server. Payload berbeda dengan key sama ditolak 409.
Versi lama menghasilkan `VERSION_CONFLICT`; muat ulang dan tinjau nilai terbaru.
Audit dan efek perubahan disimpan dalam transaksi yang sama. Tindakan job memakai
transaksi layanan kuota/lease yang sama, sehingga retry tidak membatalkan upaya
baru yang sudah di-resume.

## Modul dan alur

| Halaman             | Penggunaan                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `/admin`            | Ringkasan akun, penggunaan, transaksi review dan email gagal                                   |
| `/admin/users`      | Cari nama/email/ID, role/status/paket, verifikasi dan tanggal daftar UTC                       |
| `/admin/users/:id`  | Detail akun, sesi tanpa token, kuota, invoice/job, suspend/pulihkan, grant/kredit              |
| `/admin/plans`      | Draft, preview manfaat, publish dan riwayat versi empat paket                                  |
| `/admin/vouchers`   | Buat/jeda/arsip kode, syarat, reservasi, riwayat aturan dan pemakaian                          |
| `/admin/payments`   | Cari invoice/email/referensi, status/paket/tanggal/voucher, snapshot, receipt dan rekonsiliasi |
| `/admin/refunds`    | Pengajuan penuh, persetujuan owner, proses, bukti hasil merchant                               |
| `/admin/jobs`       | Status, kuota/lease, permintaan cancel dan resume snapshot asal                                |
| `/admin/ai`         | Request, model, token dan estimasi biaya per akun/tugas                                        |
| `/admin/operations` | Readiness, antrean, kapasitas, backup serta prioritas produksi                                 |
| `/settings`         | Model planner/writer dari discovery, tes koneksi, tanpa secret                                 |
| `/admin/content`    | Draft/review/publish/rollback template dan skill yang sudah siap                               |
| `/admin/settings`   | Konten publik, kontak, jeda layanan, kontrol biaya dan riwayat/restore pengaturan              |
| `/admin/staff`      | Undangan email sekali pakai, pencabutan, role dan transfer owner                               |
| `/admin/privacy`    | Penanggung jawab, proses, bukti pemenuhan dan notifikasi status                                |
| `/admin/audit`      | Pencarian jejak sebelum/sesudah, actor, target, alasan dan request ID                          |
| `/admin/support`    | Tiket, prioritas, penanggung jawab, balasan publik dan catatan internal                        |
| `/admin/reports`    | Agregat pembayaran/diskon/refund/job/AI dan CSV privat terbatasi                               |

Daftar utama menggunakan 20 baris per halaman. Detail menampilkan riwayat terbatas
dengan batas eksplisit di API; bukan ekspor seluruh data. Tampilan menjaga data
cache saat filter berubah, menampilkan status/error, menyediakan retry dan tabel
yang dapat digulir dengan keyboard. Tidak ada delay loading buatan atau skeleton
untuk judul/navigasi; keputusan mengikuti `LOADING_STRATEGY.md`.

Pesan bantuan memakai 20 pesan per halaman, halaman pertama berisi pesan terbaru
dalam urutan baca kronologis. Tombol pesan sebelumnya/lebih baru membuka riwayat;
balasan baru kembali ke halaman terbaru. Catatan internal tidak masuk pesan atau
jumlah pesan yang dikirim ke pengguna.

### Pengguna, staf dan kompensasi

Suspend mencabut sesi serta memblokir login/API/AI berikutnya. Worker membatalkan
job antrean sebelum AI dan mengembalikan kuota asal sekali. Permintaan yang sudah
diterima provider masih dapat ditagih. Callback pembayaran tetap diproses selama
akun dibatasi. Suspend tidak menghapus masa bayar atau mengembalikan uang.

Admin tidak dapat menonaktifkan operator atau menaikkan rolenya sendiri. Perubahan
role hanya oleh owner, mencabut sesi target. Owner terakhir dilindungi dengan
lock/transaksi, termasuk ketika dua penurunan role terjadi bersamaan. Undangan
terikat email terverifikasi, token tersimpan sebagai hash, berlaku 24 jam,
sekali pakai; penerimaan mencabut sesi agar login berikutnya memakai role baru.

Grant akses dimulai setelah seluruh periode bayar/grant yang masih ada. Invoice
unresolved harus diselesaikan dahulu. Snapshot manfaat disimpan; tidak membuat
invoice lunas buatan. Kredit generasi terpisah dari ledger kuota paket. Kuota
paket dipakai dahulu, lalu kredit aktif dengan expiry terdekat. Pengembalian
kredit hanya ke grant asal sekali; revokasi tidak menghapus konsumsi lama.

Secara default admin tidak dapat memberikan grant/kredit. Owner menetapkan batas
kumulatif kredit dan hari grant per admin per hari UTC, termasuk grant yang lalu
dicabut. Batas hari juga membatasi expiry kredit per penerbitan. Owner memiliki
batas validasi form/API tersendiri: maksimal 365 hari dan 1.000 kredit sekali
penerbitan. Kompensasi tidak mengaktifkan fitur paket lain secara otomatis.

### Harga, voucher dan refund

Perubahan paket diterbitkan dari draft dengan versi dasar yang masih berlaku.
Invoice dan subscription menyimpan harga/manfaat asal. Perubahan paket tidak
mengganti pembelian lama, konsumsi Free seumur hidup atau pemakaian minggu berjalan.
Free tidak dijual melalui QRIS. Tabel paket README menjelaskan default awal;
halaman harga adalah kebijakan aktif setelah publish.

Checkout memerlukan pemeriksaan total pada UI. Quote HMAC berlaku lima menit,
terikat pengguna/paket/versi/voucher/nominal. Quote belum mereservasi voucher.
Checkout memvalidasi ulang dan mereservasi slot dalam satu transaksi. Syarat
mencakup periode, paket, minimum belanja, maksimum diskon, batas global/per akun,
akun baru serta allowlist akun. Persen dibulatkan ke bawah ke rupiah penuh.
Satu invoice unresolved per akun; mengganti kode/total tidak membuat QR kedua.

Reservasi dihitung bersama transaksi consumed. Hasil provider yang ambigu tidak
melepaskan slot. Konfirmasi paid mengonsumsi sekali; gagal final melepaskan sekali.
Paid terlambat setelah pelepasan final diberi status redemption `review` dan
tetap memperoleh hak bayar. Voucher jeda/expired tidak membatalkan invoice sah
yang telah terbit. Kode arsip tidak dipakai ulang. Refund tidak membuka ulang slot.
Minimum aplikasi Rp1.000 perlu dikonfirmasi kembali terhadap kanal merchant nyata.
Diskon nol-total/100% memakai grant, bukan QRIS palsu.

Refund awal hanya penuh, satu permintaan aktif/selesai per invoice. Alur:
`requested → approved → processing → completed/failed`; penolakan tersedia
sebelum processing. Hanya owner mengubah alur persetujuan. Completed/failed
membutuhkan referensi merchant unik dan referensi bukti. Completed mencabut sisa
subscription dari invoice asal, mempertahankan invoice paid dan jejak keuangannya.
Panel tidak melakukan transfer dana. Operator wajib memverifikasi hasil uang
melalui fasilitas merchant sebelum mencatat selesai. Partial refund/prorata belum
dibuka.

### AI, konten dan privasi

Owner dapat menurunkan cap request/token/USD dibanding environment, menjeda signup,
checkout atau generasi baru secara terpisah. Callback dan rekonsiliasi tetap hidup.
Pemakaian berjalan tidak direset saat cap berubah. Tarif konservatif input/output
harus mencakup seluruh model/combo; versi dan tarif dicatat per request nyata.
Tarif/usage yang belum diketahui ditandai; agregat biaya dapat belum lengkap.
Estimasi bukan tagihan final. Tetapkan spending cap di provider.

Konten dibatasi key katalog yang didukung; skill keamanan wajib tidak dapat
diganti. Sumber/lisensi/checksum wajib, URL hanya metadata dan tidak di-fetch.
Tidak ada eksekusi script/plugin/HTML dari panel. Review mendahului publish;
rollback memakai versi yang pernah ditinjau. Rencana baru menyimpan template
override dan skill yang berlaku, sehingga perubahan berikutnya tidak mengubah
job/resume lama. Preferensi manual tetap terkunci.

Katalog pilihan teknologi/gaya, integrasi skill baru dan aturan rekomendasi inti
tetap ditinjau melalui repository/checksum. Panel tidak memasang dependency atau
plugin GitHub secara langsung. Model tarif individual, analitik cohort/settlement,
editor permission bebas dan akses impersonasi tidak dibuka pada versi ini.

Permintaan privasi dikerjakan sesuai runbook, bukan hard delete otomatis. Completed
hanya setelah processing dan bukti pemenuhan dicatat. Status terminal mengantrekan
email pemberitahuan tanpa melampirkan data pribadi. Relasi invoice/subscription/
ledger/grant/kredit/bantuan melindungi riwayat dari penghapusan akun. Gunakan
pseudonimisasi/retensi yang disetujui setelah menilai kewajiban keuangan dan backup.

Laporan memakai tanggal UTC; maksimum 366 hari. Ekspor maksimum 31 hari/1.000
invoice, no-store, permission/reauth/audit dan sanitasi formula CSV. Penerimaan
setelah refund belum dikurangi gateway, pajak, AI atau infrastruktur; bukan MRR
atau settlement yang sudah dibuktikan.

## Peluncuran

1. Backup lengkap, uji restore ke database terpisah, lalu deploy migration
   `20261021050000_admin_management` dan `20261021060000_admin_retention`.
   Backfill mempertahankan invoice/periode lama dan menambah snapshot manfaat.
2. Jalankan seluruh gerbang `TESTING.md`, restart web/worker dari versi yang sama,
   periksa readiness dan lakukan smoke staging.
3. Aktifkan MFA operator, email/challenge, tarif/cap AI dan prosedur privasi/dukungan.
4. Verifikasi QRIS/callback/expiry/refund, scanner, storage, backup di luar host
   serta alert pada layanan nyata sebelum membuka penjualan.

Jangan rollback dengan menimpa database sesudah ada transaksi baru. Jeda fitur
terdampak, pertahankan callback dan lakukan perbaikan maju atau rollback aplikasi
yang kompatibel dengan schema.
