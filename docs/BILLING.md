# Operasional paket dan QRIS Duitku

## Konfigurasi awal

1. Daftarkan merchant Duitku, aktifkan salah satu kanal QRIS NQ/SQ sesuai fasilitas
   akun merchant. Aplikasi memeriksa kanal aktif melalui Get Payment Method.
2. Gunakan kredensial sandbox pada environment staging terpisah. Isi APP_URL HTTPS
   yang dapat dijangkau Duitku; callback `/api/billing/duitku/callback`.
3. Isi DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_QRIS_METHOD dan expiry (5-60 menit,
   sesuaikan kanal merchant). Return URL menuju `/billing/:id`; status pada URL
   tidak dipercaya. QR ditampilkan langsung, paymentUrl dengan pilihan kanal lain
   tidak dipakai.
4. Ukur biaya planner, writer, retry/repair per paket dan jumlah dokumen. Bujetkan
   kesempatan awal serta seluruh reset Senin yang dilewati periode bulanan, bukan
   menganggap satu bulan selalu empat minggu. Tambahkan biaya gateway, email,
   infrastruktur, dan margin sebelum menentukan harga.
5. Owner membuka `/admin`, mengisi harga bulanan, kuota, retensi dan mengaktifkan
   penjualan. Default harga null, available=false. Tidak ada harga produksi rekaan.
6. Verifikasi sandbox merchant yang sesungguhnya sebelum mengganti environment
   produksi. Sandbox dan produksi mempunyai kredensial berbeda. Aktifkan HTTPS,
   kirim callback ulang dari portal merchant, uji jumlah/referensi salah, duplikat,
   pembayaran terlambat dan perpanjangan.

## Alur transaksi

- Server menangkap harga, kuota, retensi, prioritas dan metode pada Payment.
- Lock per akun dan Idempotency-Key mencegah beberapa invoice dari klik bersamaan.
  Satu order unresolved harus diselesaikan sebelum checkout paket berbeda.
- Inquiry menggunakan HMAC SHA256 atas merchantCode + orderId + amount. Callback
  menggunakan merchantCode + amount + orderId. Transaction Status menggunakan
  merchantCode + orderId. Kunci tidak dikirim ke browser.
- Callback diverifikasi lalu disimpan sebagai WebhookEvent yang unik. HTTP 200
  dikembalikan setelah pencatatan durable. Callback tidak langsung memberi akses.
- Worker mengonfirmasi nominal, referensi dan status ke API Duitku melalui HTTPS.
  Baru status 00 membuat tepat satu Subscription berdasarkan paymentId. Nilai
  callback resultCode sendiri tidak cukup karena signature tidak mencakup status.
- Respons tidak pasti pada inquiry tidak membuat order kedua. Rekonsiliasi dengan
  backoff 1-30 menit, maksimal 12 cek otomatis/order. Browser polling DB sendiri
  setiap 5 detik, tidak memanggil provider. Callback valid yang baru dapat memicu
  satu pemeriksaan tambahan setelah batas tercapai; replay event identik tidak
  membuka percobaan baru. Operator dapat menjadwalkan ulang dari admin setelah
  mencocokkan order di portal Duitku. Tidak ada tombol lunas palsu.
- Pembayaran lunas mengantrekan email receipt. Email/checkout/outbox tetap bisa
  dipulihkan setelah worker restart. Event finansial tidak dibersihkan oleh retensi
  dokumen.

## Masa berlaku dan perubahan paket

Satu pembayaran menambah satu bulan kalender dalam WIB, dengan clamp akhir bulan.
Jika masa aktif belum habis, periode baru dimulai tepat setelah akhir periode yang
sudah dibayar. Pembelian di muka dibatasi satu periode berikutnya. Perubahan tingkat
juga berlaku pada periode berikutnya; tidak ada prorata di versi ini.

Subscription menyimpan manfaat pembelian sendiri. Mengubah katalog tidak mengubah
kuota/retensi yang sudah dibayar. Entitlement dicari pada interval startsAt <= now
< endsAt. Setelah berakhir, akun kembali ke Free dengan kesempatan Free yang belum
terpakai. Pembayaran tidak mengubah UsagePeriod minggu kalender berjalan.

Tidak ada autodebit. Pengguna berhenti dengan tidak memperpanjang; pengingat email
opsional tiga hari sebelum expiry. Mengubah preferensi pengingat tidak mengubah
periode yang sudah dibayar.

## Kuota, kegagalan, dan retensi

Reservasi berada dalam transaksi yang sama dengan job/files/outbox/idempotency.
Ledger reserve unik per job. Refund unik per job menurunkan usage periode asal;
refund dari minggu lalu tidak menambah minggu ini. Menghapus proyek tidak menghapus
lifetime grant atau ledger. Sisa kuota mingguan tidak menumpuk.

Resume memakai snapshot dan reservasi asal, termasuk setelah paket habis. Kegagalan
permanen karena auth/model/budget mengembalikan kuota dan menutup proses. Partial
atau gangguan worker dapat dilanjutkan, atau ditutup pengguna dari progres untuk
refund sekali. Pembatalan sebelum AI mulai refund, setelah AI mulai tetap dihitung.
Refund kuota berbeda dari refund uang; pengembalian dana merchant perlu pemeriksaan
administratif melalui Duitku, belum diotomatisasi.

Setiap Job menyimpan retentionDays/expiresAt saat diterima; hasil selesai memperoleh
masa simpan sesuai retensi tersebut. Upgrade/downgrade tidak mengubah tanggal hasil
lama. API mengembalikan 410 setelah expiry meski maintenance belum menghapus fisik.
Riwayat tagihan dan ledger bertahan saat hasil dihapus.

## Kesiapan peluncuran

`npm run check:production` mengecek konfigurasi dan harga secara read-only. Lulus
konfigurasi belum membuktikan transaksi merchant sesungguhnya atau mutu AI. Uji
callback publik di staging, Resend domain terverifikasi, Turnstile hostname, model
9router, backup/restore, HTTPS serta kapasitas worker sebelum membuka produksi.

Acuan provider: https://docs.duitku.com/api/id/ (skema signature HMAC SHA256 yang
berlaku pada dokumentasi Oktober 2026). Contoh MD5 lama tidak dipakai.
