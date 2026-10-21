# Keputusan arsitektur Buatin

## Satu aplikasi, proses worker terpisah

Next.js App Router + TypeScript melayani halaman dan REST API. PostgreSQL + Prisma
menyimpan akun, proyek, transaksi, ledger, dan antrean pg-boss. Tidak memerlukan
Redis. Worker native persisten menjaga proses panjang dari timeout web. Node 24,
PostgreSQL, systemd, dan Caddy dipasang langsung; Docker tidak digunakan.

## Identitas publik, data privat

Better Auth menangani hash password, sesi, verifikasi email dan pemulihan password.
Registrasi terbuka untuk pengguna terverifikasi; field role tidak menerima input
signup. Semua resource dicari bersama userId dari sesi. Admin dan owner hanya dapat
mengakses pengaturan operasional, daftar akun/pembayaran/job; tidak memperoleh
bypass ownership untuk konten proyek. Mutasi membutuhkan Origin, validasi, dan
rate limit. Resend serta Turnstile harus dikonfigurasi sebelum registrasi publik.

## Hak berlangganan berbentuk interval dibayar

Setiap pembayaran terverifikasi menghasilkan interval Subscription yang unik
berdasarkan paymentId. Interval baru dimulai setelah akhir seluruh interval yang
sudah dibayar, atau saat verifikasi jika tidak ada masa aktif. Perubahan tingkat
berlaku pada interval berikutnya. Kuota/retensi/prioritas disalin pada order sehingga
perubahan katalog tidak mengubah manfaat pembelian lama. Tidak ada autodebit atau
prorata. Satu bulan kalender memakai zona WIB dan clamp akhir bulan.

## Kuota terpisah dari penagihan

UsagePeriod lifetime menyimpan Free permanen; periode week:YYYY-MM-DD dimulai
Senin 00.00 WIB. Semua paket Pro memakai periode kalender minggu yang sama sehingga
pembayaran/upgrade tidak mereset pemakaian. User advisory lock menyerialkan reservasi,
refund, dan transaksi pembayaran. QuotaLedger memiliki satu reserve dan satu refund
per job; tidak berelasi cascade ke proyek. Membatalkan sebelum AI atau menutup
kegagalan mengembalikan ke periode asal. Resume tidak membuat reservasi baru.

## Worker, prioritas, dan keadilan

Transactional outbox, conditional claim, lease version dan checkpoint melindungi
dari queue delivery hilang atau duplikat. Satu proses worker memegang advisory lock,
menjalankan WORKER_CONCURRENCY generasi antar akun. Group queue dan index parsial
membatasi satu eksekusi per akun serta satu job aktif per proyek. Max dapat memiliki
10 job aktif termasuk queued. Skor prioritas mengurangi menit waktu pembuatan;
pekerjaan lama akhirnya melampaui pekerjaan Pro yang baru datang (Max mendapat
keunggulan 20 menit, Plus 10 menit). Tidak ada starvation karena prioritas permanen.

## QRIS melalui Duitku

Server memilih NQ/SQ yang aktif pada merchant, menangkap nominal harga di order,
menampilkan qrString menjadi gambar QR. Callback HMAC SHA256 disimpan durabel;
status nominal/referensi dikonfirmasi server-ke-server sebelum entitlement aktif.
Webhook duplikat, status terlambat, dan retry rekonsiliasi tidak menambah interval
kedua. Signature callback tidak mencakup status: konfirmasi API penting untuk
menetapkan status akhir. Browser tidak melakukan polling provider.

## Snapshot, retensi, dan pemakaian AI

Brief, katalog, plan, template dan konfigurasi model ditangkap saat job dibuat.
Regenerasi memakai snapshot asal, menambahkan dokumen yang bergantung pada pilihan,
dan menyalin hasil lain menjadi checkpoint. Retensi hasil ditangkap sesuai paket;
downgrade tidak memperpendeknya. Pembersihan hasil tidak menghapus ledger atau
catatan pembayaran. AiUsage mencatat percobaan planner/writer/repair dan token yang
dilaporkan provider secara terpisah dari isi dokumen; tidak menaksir token hilang.

## Batas kepercayaan

AI tidak menjalankan tool atau kode. Path tetap dari katalog. Preview menolak HTML
mentah/gambar remote. Lint dan ekspor menolak secret serta rujukan putus. Template
fallback dan mock selalu berlabel. Dokumen tidak membuktikan website target sudah
dibangun/diuji. Produksi, biaya gateway, pengiriman email, serta AI nyata memerlukan
konfigurasi dan validasi eksternal tersendiri.
