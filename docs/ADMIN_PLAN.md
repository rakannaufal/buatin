# Rencana panel admin Buatin

Tanggal tinjauan: 21 Oktober 2026. Dokumen ini menyimpan rancangan awal sebelum
implementasi. Status akhir dan batas fitur ada di `ADMIN_GUIDE.md`, bukti pengujian
ada di `VALIDATION.md`. Bagian kondisi sekarang di bawah merupakan baseline historis. Hosting, domain
dan database produksi tetap menyusul; pengembangan memakai PostgreSQL lokal dan
provider fixture untuk pengujian transaksi.

## 1. Kondisi sekarang

Buatin sudah memiliki admin dasar. Role `owner`, `admin` dan `user` tersedia;
akses halaman dan API operator diperiksa di server. Owner dan admin saat ini
memiliki izin luas yang sama, belum berupa pembagian izin per tindakan.

| Area        | Sudah tersedia                                                                      | Kekurangan utama                                                                            |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Akses       | Role server-side, signup selalu user, MFA operator pada konfigurasi domain publik   | Undangan staf, pembagian izin, proteksi owner terakhir, autentikasi ulang tindakan sensitif |
| Harga/paket | Edit harga bulanan IDR, kuota mingguan, retensi dan aktif/nonaktif Starter/Plus/Max | Draft/publish, riwayat versi, pengaturan Free dan fitur paket yang masih statis             |
| Pengguna    | Daftar berhalaman, identitas, verifikasi email, role dan paket aktif                | Pencarian/filter/detail, suspend/pulihkan, cabut sesi, grant akses dan kredit               |
| Voucher     | Belum ada                                                                           | Model data, formulir, validasi, checkout, reservasi pemakaian dan laporan                   |
| Pembayaran  | Daftar 30 terbaru, rekonsiliasi terbatasi, aktivasi setelah konfirmasi provider     | Pencarian/detail lengkap, pengajuan refund uang, laporan dan ekspor                         |
| Generasi/AI | Daftar 30 job terbaru, agregat token, pilihan model planner/writer dan tes koneksi  | Detail biaya/akun, kontrol job, konfigurasi anggaran melalui panel                          |
| Operasi     | Kesehatan worker/DB/antrean, batas AI dan prioritas peluncuran                      | Peringatan eksternal, riwayat insiden dan kontrol maintenance terarah                       |
| Privasi     | Permintaan export/hapus data dan pembaruan status                                   | Pemenuhan terverifikasi, bukti penyelesaian dan kebijakan retensi operasional               |
| Audit       | Sebagian tindakan tercatat                                                          | Tampilan pencarian, alasan, target serta perubahan sebelum/sesudah                          |
| Konten      | Template/skill sudah memiliki sumber dan checksum                                   | Alur tinjau/publish/rollback melalui admin, pengaturan konten situs                         |

Dasar tinjauan: `src/features/admin/admin.tsx`,
`src/features/admin/operations.tsx`, `src/features/settings/settings.tsx`,
`src/server/saas-api.ts`, `src/server/access.ts`,
`src/server/operator-access.ts`, `src/server/billing.ts`,
`src/server/entitlements.ts` dan `prisma/schema.prisma`.

## 2. Hasil yang dituju

Operator dapat mengelola pengguna, paket, promosi dan operasi sehari-hari dari
website. Setiap tindakan penting memiliki izin server, validasi, alasan,
riwayat audit dan hasil yang dapat diperiksa. Harga/total/hak akses selalu
ditentukan server. Perubahan admin tidak menghapus hak pembelian lama atau
membuat transaksi pembayaran palsu.

Versi awal mempertahankan empat tingkat paket dan role owner/admin/user.
Role support/finance khusus serta editor izin bebas ditunda sampai ada tim
yang memerlukannya. Permission tetap diberi nama di kode sejak awal agar
pemisahan tersebut tidak memerlukan penulisan ulang seluruh endpoint.

## 3. Role dan batas akses

| Tindakan                                             | Owner                                  | Admin                                            | User                               |
| ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| Lihat panel operasional                              | Ya                                     | Ya                                               | Tidak                              |
| Kelola pengguna biasa, cabut sesi, suspend/pulihkan  | Ya                                     | Ya, wajib alasan                                 | Akun sendiri sesuai fitur akun     |
| Kelola harga/paket dan voucher                       | Ya                                     | Ya, dalam batas kebijakan                        | Lihat harga/pakai voucher miliknya |
| Beri akses promosi/kredit                            | Ya                                     | Sesuai batas jumlah/durasi yang ditentukan owner | Tidak                              |
| Lihat transaksi dan minta rekonsiliasi               | Ya                                     | Ya                                               | Transaksi sendiri                  |
| Ajukan refund uang                                   | Ya                                     | Ya                                               | Permintaan melalui bantuan         |
| Setujui refund uang                                  | Ya, dengan verifikasi ulang            | Tidak pada versi awal                            | Tidak                              |
| Ubah model dan pengaturan operasional yang diizinkan | Ya                                     | Ya, dalam batas owner                            | Tidak                              |
| Kelola template/skill/konten situs                   | Ya                                     | Ya, lewat tinjau dan publish                     | Preferensi/proyek sendiri          |
| Undang staf, ubah role, alihkan kepemilikan          | Ya, dengan verifikasi ulang            | Tidak                                            | Tidak                              |
| Ubah batas keras biaya dan kebijakan keamanan        | Ya, melalui konfigurasi yang diizinkan | Tidak                                            | Tidak                              |
| Baca secret, password, token sesi atau kode MFA      | Tidak melalui panel                    | Tidak                                            | Tidak melalui admin                |

Aturan wajib:

- Periksa permission di setiap pembacaan/mutasi server, bukan hanya menu.
- Semua operator wajib MFA pada deployment publik; tindakan sensitif memerlukan
  autentikasi ulang dengan masa berlaku singkat yang diverifikasi server.
- Role/status dibaca dari keadaan akun terkini. Perubahan role atau suspend
  mencabut sesi dan segera menghentikan otorisasi sesi lama.
- Admin tidak dapat menaikkan role sendiri, mengubah owner atau menonaktifkan
  operator. Tidak boleh tersisa nol owner. Perubahan owner memakai transaksi
  dan proteksi terhadap permintaan bersamaan.
- Undangan staf hanya oleh owner, token sekali pakai, berakhir otomatis,
  terikat email terverifikasi. Penerimaan wajib memenuhi kebijakan MFA.
- Tidak ada impersonasi pengguna pada versi awal. Akses isi proyek privat
  dibatasi kasus bantuan yang tercatat, bukan terbuka karena memiliki role.

## 4. Navigasi dan pengalaman admin

| Kelompok   | Halaman yang direncanakan                              | Isi utama                                                                       |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Ringkasan  | `/admin`                                               | Pengguna aktif, transaksi perlu tinjau, job gagal, estimasi biaya dan prioritas |
| Akun       | `/admin/users`, `/admin/users/[id]`                    | Pencarian, detail, sesi, penggunaan, suspend dan grant                          |
| Komersial  | `/admin/plans`, `/admin/vouchers`                      | Paket, versi harga, promosi dan pemakaian                                       |
| Keuangan   | `/admin/payments`, `/admin/refunds`                    | Invoice, timeline, rekonsiliasi, pengajuan refund                               |
| Operasi    | `/admin/jobs`, `/admin/ai`, `/admin/operations`        | Job, model, anggaran, antrean dan kesehatan                                     |
| Konten     | `/admin/templates`, `/admin/skills`, `/admin/settings` | Versi konten, katalog dan pengaturan situs                                      |
| Pengawasan | `/admin/audit`, `/admin/privacy`, `/admin/staff`       | Jejak tindakan, permintaan data dan staf                                        |
| Lanjutan   | `/admin/support`, `/admin/reports`                     | Bantuan dan laporan agregat setelah fitur inti                                  |

Pertahankan Manrope/Source Serif 4, warna hijau dan surface yang sudah digunakan.
Daftar memakai pagination server, filter di URL, sorting terbatas, empty/error
state dan tombol retry. Detail memakai breadcrumb serta ringkasan konteks.
Form menampilkan nilai lama/baru, validasi field, hasil simpan dan konflik versi
409 agar perubahan operator lain tidak tertimpa diam-diam.

Tindakan berisiko menampilkan target, dampak, alasan dan konfirmasi eksplisit.
Tombol sibuk mencegah double submit; server tetap memakai idempotency. Navigasi
keyboard, fokus dialog, label, kontras, reduced motion dan target sentuh minimal
44px diperiksa. Tabel pada ponsel memakai ringkasan/detail atau scroll terlabel
tanpa membuat seluruh halaman melebar.

### Lazy loading dan skeleton

Ikuti `LOADING_STRATEGY.md`. Navigasi, judul dan informasi utama segera tampil.
Grafik berat, tab tersembunyi atau ekspor dapat dimuat saat diperlukan. Skeleton
hanya pada batas pengambilan data yang benar-benar menunggu, ditunda singkat
untuk mencegah kedip; jangan menunda data yang sudah siap. Pertahankan data cache
saat filter dimuat ulang dan ukuran placeholder agar layout stabil. Proses
panjang memakai status/progres nyata, pembatalan bila aman, timeout dan error
yang dapat ditindaklanjuti. Jangan memakai skeleton untuk halaman statis atau
persentase rekaan untuk proses yang tidak dapat diukur.

## 5. Manajemen pengguna

Daftar pengguna:

- Cari nama/email/ID; filter role, status, verifikasi, paket dan tanggal daftar.
- Detail: profil, periode paket, konsumsi kuota, grant, pembayaran, job dan
  riwayat tindakan. Email/identitas hanya tampil bagi operator yang berwenang.
- Sesi hanya memperlihatkan metadata yang diperlukan, tanpa token atau secret.
  Operator dapat mencabut satu/semua sesi dengan alasan.
- Suspend sementara/permanen dan pulihkan dengan alasan. Suspend bukan refund
  atau penghapusan akun; periode berbayar tetap tercatat.
- Reset password memakai alur email yang tersedia. Admin tidak menetapkan atau
  membaca password pengguna, tidak mengubah email terverifikasi tanpa verifikasi.

Suspend ditegakkan saat login, request API, submit job dan pengambilan job oleh
worker. Request AI yang sudah diterima provider mungkin tetap ditagih; hentikan
request berikutnya, lalu selesaikan kuota sesuai tahap eksekusi yang tercatat.
Callback pembayaran tetap dicatat walau akun disuspend; pemberian periode bayar
dan pemblokiran penggunaan tetap menjadi dua keadaan berbeda.

### Akses paket dan kredit kompensasi

- Grant akses memiliki paket/versi manfaat, mulai/akhir, alasan, pemberi dan
  sumber. Bentrok dengan langganan aktif ditampilkan sebelum konfirmasi.
- Grant tidak memperpendek masa bayar, mereset kuota minggu berjalan, menghapus
  konsumsi Free seumur hidup atau membuat pembayaran berstatus lunas buatan.
- Untuk versi awal, periode grant paket tidak boleh bertumpang tindih dengan
  periode berbayar/grant lain. Validasi dan lock akun juga berlaku saat checkout
  atau aktivasi pembayaran yang bersamaan; konflik masuk peninjauan tanpa
  menghilangkan nilai pembelian.
- Bonus generasi memakai credit grant tersendiri dengan jumlah, masa berlaku,
  alasan dan batas per operator. Alokasi konsumsi dicatat per job; kredit yang
  dibatalkan hanya dikembalikan ke sumber asal sekali bila memenuhi aturan.
- Kuota paket dipakai dahulu, lalu bonus aktif terdekat expiry. Bonus tidak
  otomatis membuka fitur paket lain. Pencabutan grant hanya memengaruhi sisa
  yang belum terpakai; riwayat tidak dihapus.

Permintaan penghapusan data memakai alur privasi terpisah, bukan tombol hard
delete. Schema saat ini memiliki cascade; implementasi wajib melindungi catatan
keuangan/ledger dan menetapkan retensi serta pseudonimisasi terlebih dahulu.

## 6. Harga, paket dan kebijakan produk

- Pisahkan edit sebagai draft, preview, publish dan riwayat versi. Cegah dua
  operator menerbitkan versi berdasarkan keadaan lama.
- Kelola nama/deskripsi, harga bulanan IDR integer, status dijual, kuota,
  retensi, prioritas serta fitur bertipe yang memang didukung aplikasi.
- Pertahankan empat paket terlebih dahulu. Menambah paket bebas ditunda karena
  entitlement saat ini masih memiliki pemetaan fitur berdasarkan ID paket.
- Pengaturan Free/planner yang masih hardcoded dipindahkan bertahap ke kebijakan
  terversi. Konsumsi Free lama tetap dihitung; tidak ada reset otomatis.
- Validasi batas kuota/retensi, dependensi fitur dan harga sebelum publish.
  Harga kosong tetap memblokir checkout. Tidak mengarang angka harga produksi.
- Sebelum aktivasi jual, tampilkan estimasi biaya AI, batas biaya yang tersedia
  dan konfigurasi pembayaran yang masih kurang; estimasi diberi label jelas.
- Hak langganan lama tetap memakai snapshot pembelian. Invoice yang sudah terbit
  mempertahankan nominal/manfaatnya, meski harga katalog berubah atau paket
  berhenti dijual. Perubahan periodisasi/prorata tidak termasuk versi awal.

Fitur dinamis wajib memakai pemeriksaan entitlement terpusat di API dan worker,
bukan sekadar checkbox UI. Snapshot subscription/job lama dibackfill sesuai
perilaku yang berlaku saat migrasi, tanpa perubahan hak secara diam-diam.

## 7. Voucher dan promosi

### Konfigurasi voucher

- Kode unik ASCII, normalisasi uppercase, panjang/karakter dibatasi; judul dan
  catatan internal terpisah dari pesan yang terlihat pengguna.
- Diskon persentase atau nominal IDR; batas diskon maksimum dan minimum belanja.
- Waktu mulai/akhir: antarmuka WIB, penyimpanan UTC, interval akhir eksklusif.
- Paket yang memenuhi syarat, akun tertentu atau semua akun, pelanggan baru
  berdasarkan riwayat pembayaran terkonfirmasi, bukan klaim browser.
- Batas total, batas per pengguna, aktif/jeda/kedaluwarsa, preview perhitungan,
  jumlah reservasi/pemakaian dan laporan transaksi terkait.
- Satu voucher per invoice pada versi awal; tanpa penumpukan diskon. Syarat
  promosi terlihat sebelum checkout. Edit syarat membuat versi baru.
- Hitungan pemakaian melekat pada identitas kode lintas versi. Batas baru tidak
  boleh lebih kecil dari pemakaian dan reservasi yang masih sah. Voucher yang
  pernah terkait invoice hanya diarsipkan; kodenya tidak dipakai ulang.

### Integrasi checkout

1. Server menghitung quote dari harga/versi paket, voucher, identitas akun dan
   waktu server. Browser tidak menentukan total atau kelayakan.
2. Quote memiliki versi/hash dan expiry. Jika harga/promo berubah sebelum
   invoice dibuat, minta pengguna menyetujui total terbaru; jangan menaikkan
   nominal diam-diam. Quote sendiri belum menghabiskan slot voucher.
3. Dalam transaksi dengan urutan lock konsisten, checkout memvalidasi ulang
   syarat, membuat Payment snapshot dan mereservasi slot voucher secara atomik.
   Batas global/per-user menghitung reservasi yang belum selesai.
4. Idempotency request mencakup paket, versi quote dan voucher ternormalisasi.
   Retry mengembalikan invoice yang sama. Satu invoice unresolved per akun tetap
   berlaku; mengganti kode tidak membuat invoice QRIS kedua.
5. Snapshot menyimpan subtotal, diskon, total bayar, mata uang, versi paket dan
   identitas/versi voucher. Total tidak negatif, pembulatan integer konsisten,
   diskon persentase dibulatkan ke bawah ke rupiah penuh, nominal minimum
   mengikuti kanal merchant yang sudah diverifikasi.
6. Redemption berpindah `reserved` ke `consumed` hanya setelah pembayaran
   terkonfirmasi provider. Kegagalan final menjadi `released` sekali. Retry,
   webhook duplikat dan restart worker tidak menambah pemakaian.
7. Jangan melepas reservasi hanya karena browser ditutup atau timer lokal habis.
   Order `creating`/`review` dengan hasil provider belum pasti tetap ditahan dan
   diproses rekonsiliasi; slot tidak dijual dua kali.
8. Voucher kedaluwarsa/jeda tidak membatalkan invoice valid yang sudah terbit.
   Late payment mengikuti hasil merchant yang otoritatif. Anomali paid setelah
   pelepasan final masuk review, tanpa diam-diam menghilangkan hak pembayaran.

Diskon yang menghasilkan total nol ditolak pada versi awal checkout QRIS.
Akses gratis/100% memakai alur grant promosi tersendiri setelah tersedia, bukan
Payment QRIS fiktif. Refund uang tidak otomatis mengembalikan slot voucher;
kebijakan versi awal tetap menghitung transaksi paid yang pernah mengonsumsinya.
Voucher bonus kredit/akses durasi dapat ditambahkan setelah fondasi grant stabil.

Kriteria utama: voucher terakhir tidak dapat dipakai dua checkout bersamaan;
kode salah/kedaluwarsa tidak membuat invoice; manipulasi total ditolak; event
duplikat hanya memberi satu periode akses dan satu konsumsi voucher.

## 8. Pembayaran, refund dan laporan komersial

- Cari/filter invoice berdasarkan pengguna, nomor order, paket, tanggal,
  status dan voucher. Pagination serta rentang ekspor dibatasi.
- Detail menampilkan subtotal/diskon/net, snapshot manfaat, timeline callback,
  status hasil rekonsiliasi dan status pengiriman receipt tanpa secret provider.
- Pertahankan larangan tombol lunas manual. Status paid berasal dari verifikasi
  server ke provider; rekonsiliasi admin tetap dibatasi dan diaudit.
- Pengajuan refund memuat transaksi asal, nominal, alasan, persetujuan owner,
  referensi provider/bukti dan status `requested`, `approved`, `processing`,
  `completed`, `rejected` atau `failed`. Transisi atomik dan permintaan idempotent
  mencegah refund ganda.
- Kemampuan refund QRIS/API belum dibuktikan. Versi awal mencatat alur review;
  eksekusi uang mengikuti fasilitas merchant yang benar-benar terverifikasi.
  `completed` hanya setelah ada bukti pengembalian dana, bukan klik persetujuan.
- Nilai refund kumulatif tidak boleh melebihi dana terkonfirmasi. Partial refund
  dan penyesuaian hak akses memerlukan kebijakan eksplisit sebelum diaktifkan.
- Pisahkan refund uang, pengembalian kuota job dan kredit kompensasi pada UI,
  API, laporan serta audit. Refund tidak menghapus invoice atau audit lama.
- Laporan membedakan nilai bruto, diskon, pembayaran terkonfirmasi, refund,
  settlement bila ada datanya dan estimasi biaya AI. Tanpa autodebit, jangan
  menyajikan perpanjangan manual sebagai pendapatan berulang yang pasti.
- Ekspor privat, terbatasi izin/rentang/jumlah, diaudit, umur unduh pendek;
  sanitasi formula CSV dan hindari data pribadi yang tidak diperlukan.

## 9. AI, job dan operasi

- Pilih model dari allowlist hasil discovery. Tampilkan model planner/writer,
  kegagalan, request/token, reservasi dan estimasi biaya per hari/pengguna/job.
- Tarif model harus berasal dari operator/provider, memiliki versi dan tanggal
  efektif. Tarif belum diisi ditampilkan belum diketahui, bukan biaya nol.
- Panel dapat mengatur batas operasional lebih rendah dari batas keras
  environment. Perubahan owner diaudit; perhitungan anggaran berlaku lintas
  web/worker dan tidak mereset penggunaan berjalan.
- API key, URL koneksi, kredensial DB/9router/email/storage dan kunci backup
  tetap di secret manager/environment; panel hanya menampilkan status teredaksi.
- Sediakan pause generasi baru, pause signup/checkout dan pengumuman maintenance
  secara terpisah. Callback, rekonsiliasi, akses akun dan pemulihan tetap tersedia
  sesuai mode; job berjalan tidak dipotong tanpa keputusan yang terlihat.
- Detail job memuat tahap/checkpoint, snapshot, error aman, penggunaan dan
  tindakan yang sah. Retry/resume memakai reservasi asal dan aturan paket;
  regenerasi baru memakai konfirmasi serta kuota baru.
- Cancel admin memakai alasan, fencing/lease worker dan aturan refund kuota
  yang ada. Jangan mengirim AI dua kali karena klik atau worker bersamaan.
- Tampilkan kesehatan DB/worker/antrean/email/scanner/storage, backup terakhir,
  hasil uji restore, transaksi review dan alert biaya. Panel tidak mengeksekusi
  shell command, restore DB atau instalasi plugin dari request.
- Notifikasi eksternal dan eskalasi insiden disiapkan setelah kanal operasional
  nyata dipilih; tidak membuat akun atau mengirim pesan tanpa otorisasi.

## 10. Template, skill dan pengaturan situs

- Template/skill memakai draft, preview, review, publish, versi dan rollback.
  Simpan sumber, commit/checksum, lisensi, cakupan dukungan dan hasil validasi.
- Import GitHub masuk antrean review terbatas; jangan menerima URL/path bebas
  lalu mengeksekusi script. Tolak sumber/path privat atau internal yang tidak
  diizinkan, arsip traversal, file berlebihan dan paket tanpa hak yang jelas.
- Skill merupakan konteks tidak tepercaya, bukan instruksi yang dapat melewati
  permission atau membuka secret. Plugin desktop tidak otomatis menjadi layanan
  web. Status belum siap tetap tidak dapat diaktifkan pengguna.
- Publikasi hanya memengaruhi rencana baru. Job/resume lama tetap memakai versi
  snapshot; rollback tidak menulis ulang hasil yang sudah dimiliki pengguna.
- Kelola rekomendasi teknologi, gaya, warna dan default pemilihan skill secara
  terversi. Pilihan manual/terkunci pengguna tidak boleh ditimpa.
- Pengaturan situs awal: nama/logo terverifikasi, kontak bantuan, pengumuman,
  FAQ, ketentuan/privasi dan feature flag yang memang memiliki implementasi.
- Gunakan schema bertipe, allowlist key, sanitasi konten serta preview/publish.
  Tidak ada editor JSON/HTML atau environment bebas untuk operator.
- Aturan lazy/skeleton menjadi panduan kontekstual per jenis halaman, bukan
  sakelar yang memaksa seluruh website memakai keduanya.

## 11. Audit, privasi dan bantuan

Audit menyimpan actor, tindakan, jenis/ID target, alasan, perubahan sebelum/
sesudah yang sudah disamarkan, request ID, waktu dan hasil. Mutasi penting dan
event audit berhasil berada dalam transaksi yang sama. Percobaan ditolak dicatat
melalui log keamanan yang dibatasi agar tidak membanjiri sistem. Jangan merekam
password, token, secret, kode MFA, payload provider lengkap atau isi brief privat.

Audit dapat dicari/filter oleh operator berizin dan tidak dapat diedit/dihapus
melalui aplikasi. Retensi, akses database dan backup ditetapkan dalam runbook;
tabel append-only pada aplikasi saja tidak membuktikan kebal manipulasi DB.

Permintaan data memiliki penanggung jawab, status, alasan penolakan, bukti
pemenuhan dan notifikasi melalui alur email yang dikonfigurasi. Export harus
terikat pengguna dan kedaluwarsa. Penghapusan meninjau job aktif, blob, revisi,
ledger, transaksi serta siklus backup. Masa retensi tidak ditebak sebagai
kepatuhan hukum; tetapkan sesuai kebutuhan operasional dan kewajiban yang berlaku.

Support ticket dan catatan internal menjadi tahap lanjutan: status, prioritas,
penanggung jawab dan tautan pengguna/job/invoice, tanpa akses proyek privat
otomatis. Tindakan finansial atau akun tetap melalui modul berizin yang sama.

## 12. Perubahan data dan API

Nama berikut merupakan rancangan; migration dan kontrak final ditinjau sebelum
implementasi. Gunakan migration tambahan dan backfill, bukan menghapus data lama.

| Model/area                         | Perubahan yang direncanakan                                                | Invarian                                                                |
| ---------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `User`                             | Status aktif/suspended, alasan/waktu/expiry, versi otorisasi               | Role/status valid, sesi lama tidak melewati pembatasan                  |
| `AdminInvitation`                  | Email, role yang diundang, hash token, expiry, actor, accepted/revoked     | Token sekali pakai, tidak menyimpan token mentah                        |
| `BillingPlanVersion`               | Versi immutable harga/manfaat; pointer versi aktif/draft                   | Subscription/Payment tetap merujuk manfaat yang disepakati              |
| `Voucher` dan versi aturan         | Kode unik ternormalisasi, status, tanggal, syarat, nilai dan batas         | Persentase/nominal valid, versi invoice tidak berubah                   |
| `VoucherRedemption`                | User/payment/version, reserved/consumed/released, waktu dan key            | Satu redemption per invoice, batas atomik global/per-user               |
| `Payment`                          | Subtotal, diskon, net pada `amount`, mata uang, snapshot versi promo/paket | `amount = subtotal - discount`, IDR integer, idempotency mencakup promo |
| `EntitlementGrant`                 | Sumber, versi manfaat, periode, penerima, actor, alasan/revocation         | Tidak memakai Subscription berbayar palsu, tidak memotong masa bayar    |
| `CreditGrant` / `CreditAllocation` | Jumlah bonus, expiry, job, reserve/consume/return                          | Tidak negatif, konsumsi/pengembalian sekali dan terlacak                |
| `RefundRequest`                    | Payment, nominal, status, actor persetujuan, bukti/referensi               | Total refund dibatasi dana paid, tidak mengubah invoice asli            |
| `AuditEvent`                       | Actor/target, reason, before/after teredaksi, result dan request ID        | Audit transaksi wajib, referensi tidak lenyap saat akun dipseudonimkan  |
| `Setting` / versi konten           | SchemaVersion, version, status, effectiveAt dan actor                      | Allowlist key, optimistic concurrency, tanpa secret                     |
| `DataRequest`                      | Penanggung jawab, fulfillment metadata dan bukti                           | Selesai hanya setelah pemenuhan diverifikasi                            |
| `SupportTicket`                    | Permintaan, status, penanggung jawab dan relasi aman                       | Ditunda setelah modul inti stabil                                       |

Catatan kompatibilitas:

- `Subscription.paymentId` saat ini wajib dan unik. Tetap pertahankan bukti bayar;
  gunakan jalur grant tersendiri untuk akses nonbayar dan resolver entitlement
  bersama untuk web/worker.
- `QuotaLedger` saat ini membatasi reserve `+1` dan refund `-1` per job/action.
  Jangan menyisipkan kredit bebas ke ledger tersebut. Perluasan alokasi kredit
  harus diuji terhadap resume, refund dan periode lama.
- Backfill Payment lama: subtotal = amount, discount = 0, voucher kosong.
  Pembelian lama tetap valid tanpa kewajiban memiliki voucher/version baru.
- Index mengikuti query: pengguna/status/tanggal, payment/status/tanggal,
  kode voucher unik, redemption voucher/user/status, audit target/actor/waktu.
  Relasi finansial/audit memakai kebijakan delete yang menjaga riwayat.
- Publikasi paket, suspend, grant, refund dan checkout memakai transaksi,
  lock dengan urutan konsisten, batas retry serta konflik versi eksplisit.

Kontrak API bertahap:

- `/api/admin/users` dan detail/actions untuk suspend, restore, revoke sessions
  serta grants; endpoint staf terpisah, owner-only.
- `/api/admin/plans` untuk draft/preview/publish; endpoint PATCH lama dijaga
  kompatibel selama migrasi dan tidak menjadi jalan pintas melewati izin baru.
- `/api/admin/vouchers` dan `/api/billing/quote`; checkout yang ada diperluas
  dengan quote/voucher, validasi dan idempotency baru.
- `/api/admin/payments`, `/api/admin/refunds`, `/api/admin/jobs`,
  `/api/admin/ai`, `/api/admin/audit` dan `/api/admin/privacy`.
- Semua list memiliki pagination/filter allowlist, seluruh input tervalidasi,
  Origin/CSRF mengikuti pola repo, error konsisten, rate limit sesuai tindakan.

Pisahkan modul domain saat menambah fitur: izin/audit, pengguna/grant,
paket/voucher, keuangan dan operasi. Pecah `saas-api.ts` serta komponen admin
besar secara bertahap hanya pada bagian yang disentuh. Update `docs/API.md`,
`docs/BILLING.md`, `SECURITY.md`, `TESTING.md` dan runbook sesuai perilaku baru.

## 13. Urutan pengerjaan dan syarat penerimaan

Setiap tahap menghasilkan satu alur UI/API/data yang bisa dijalankan. Lakukan
commit/push setelah slice terverifikasi; jangan menunggu seluruh backlog selesai.

| Tahap                     | Prioritas                           | Hasil                                                                             | Bukti penerimaan minimum                                                                                                                |
| ------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Fondasi izin dan audit | P0                                  | Permission server, MFA/reauth, proteksi owner, audit teredaksi, kerangka navigasi | User mendapat 403; admin tidak dapat eskalasi; owner terakhir terlindungi saat concurrent; mutasi dan audit konsisten                   |
| 2. Pengguna dan paket     | P0                                  | Cari/detail/suspend/cabut sesi, draft versi harga, akses/kredit terpisah          | Suspend memblokir API/worker/sesi lama; perubahan harga tidak mengubah pembelian; grant tidak mereset Free/kuota atau masa bayar        |
| 3. Voucher dan checkout   | P0 sebelum promo                    | CRUD/publish/jeda, quote, reservasi, redemption dan UI checkout                   | Perebutan slot terakhir, duplikat checkout/callback, expiry, perubahan harga dan nominal manipulasi teruji; tepat satu aktivasi         |
| 4. Keuangan dan privasi   | P1; prosedur manual wajib saat jual | Detail/review transaksi, alur refund berbukti, pemenuhan data dan ekspor          | Tidak ada lunas palsu/refund ganda; data akun lain ditolak; riwayat finansial bertahan                                                  |
| 5. AI dan operasi         | P1; batas biaya P0 sebelum publik   | Kontrol aman biaya/model/job, pause terarah, audit/health lengkap                 | Cap lintas proses tetap berlaku; retry tidak menggandakan biaya/kuota; key tidak tampil; callback tetap berfungsi saat checkout dipause |
| 6. Konten dan pengaturan  | P1                                  | Template/skill/site settings terversi dengan review/rollback                      | Publish baru tidak mengubah snapshot lama; konten berbahaya ditolak; pilihan manual tetap utuh                                          |
| 7. Bantuan dan analitik   | P2                                  | Ticket, laporan revenue/usage/retensi, role staf khusus bila dibutuhkan           | Angka dapat direkonsiliasi, ekspor aman, hak akses per staf teruji                                                                      |

P0 berarti fondasi keamanan/integritas yang tidak boleh dilewati sebelum
kemampuan terkait dibuka. Voucher bukan syarat menjual tanpa promosi; seluruh
kontrol voucher wajib selesai sebelum kode promo dipublikasikan. Fondasi audit,
kontrol akses, tarif/batas AI, harga dan verifikasi merchant tetap prioritas
peluncuran meskipun modul laporan atau konten belum lengkap.

## 14. Pengujian dan gerbang rilis

Pengujian dilakukan pada akun/database fixture terisolasi, bukan pengguna atau
tagihan produksi. Mock AI tidak memanggil 9router berbayar. Tes unit/integrasi
transaksi tidak membuat pembayaran uang nyata.

| Lapisan           | Skenario utama                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit              | Permission, validasi paket, pembulatan diskon, waktu UTC/WIB, eligibility, grant/credit expiry, redaksi audit                                        |
| Integrasi DB/API  | Akses anonim/user/admin/owner, suspend/sesi lama, role concurrency, harga terversi, grant, slot voucher terakhir, idempotency dan rollback transaksi |
| Worker/pembayaran | Callback duplikat/terlambat, inquiry timeout, restart, order review, redemption release/consume, refund bukti dan kuota periode asal                 |
| E2E               | Owner undang staf, admin kelola user/harga/voucher, user checkout, kegagalan izin, form conflict, mobile dan keyboard                                |
| Keamanan          | IDOR, CSRF/Origin, XSS/Markdown, SSRF pada import, rate limit, input mass assignment, CSV formula, respons/log tanpa secret                          |
| Migrasi/pemulihan | Backfill data lama, subscription/snapshot/ledger tetap sama, backup dan restore terpisah, rollback aplikasi yang kompatibel                          |
| Staging nyata     | MFA operator, email, callback HTTPS dan kanal QRIS, harga minimum/refund merchant, model/biaya AI, alert dan kapasitas                               |

Sebelum rilis fitur: format, lint, typecheck, unit/integration/E2E relevan,
build web/worker, audit dependency dan secret scan harus lulus. Jalankan
`skills:verify`/`templates:verify` bila konten terkait berubah. Catat perintah,
hasil aktual dan gap di `docs/VALIDATION.md`; hasil mock tidak menjadi bukti
merchant, email atau biaya produksi. Loading diuji pada respons cepat/lambat,
error dan reduced motion, tanpa klaim performa yang belum diukur.

Sebelum migration: backup terverifikasi dan latihan backfill pada salinan data.
Gunakan perubahan additive, pantau error/queue/keuangan setelah rollout dan
siapkan feature flag untuk menutup fitur baru tanpa menonaktifkan callback.
Jangan memulihkan seluruh DB secara otomatis untuk membatalkan fitur apabila
transaksi baru sudah masuk; gunakan perbaikan maju atau rollback aplikasi yang
kompatibel sambil mempertahankan catatan finansial.

## 15. Batas tahap perencanaan awal

Pada commit rencana awal, dokumen ini belum menambahkan voucher, suspend, refund
atau halaman admin baru. Implementasi berikutnya dijelaskan pada `ADMIN_GUIDE.md`.
Angka harga, batas grant/refund, tarif AI dan kebijakan retensi final perlu
ditentukan sebelum fitur terkait diaktifkan; default aman adalah nonaktif.
Hosting dan database produksi tidak dibuat dalam tahap perencanaan ini.

Langkah implementasi pertama: permission/audit beserta proteksi owner, lalu
manajemen pengguna dan versi paket. Fondasi ini dipakai langsung oleh voucher,
grant dan pengaturan operasional sehingga kontrol tidak dibangun berulang.
