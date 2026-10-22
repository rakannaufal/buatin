# Kebutuhan Produk — {{projectName}}

## Pengguna dan Nilai

**Tipe website:** {{webTypeLabel}} — {{webTypeDescription}}

**Ringkasan:** {{summary}}

Persona utama dan nilai yang diberikan:

{{#if isLanding}}- **Pengunjung:** Mendapatkan informasi produk/layanan dengan cepat dan melakukan konversi (CTA).
{{/if}}{{#if isCompany}}- **Pengunjung:** Memahami profil perusahaan, layanan dan kontak.

- **Admin:** Mengelola konten halaman perusahaan.
  {{/if}}{{#if isPortfolio}}- **Pengunjung:** Melihat portofolio karya dan menghubungi pemilik.
  {{/if}}{{#if isBlog}}- **Pembaca:** Membaca artikel, mencari konten, berlangganan.
- **Penulis:** Membuat dan mengelola artikel.
  {{/if}}{{#if isEcommerce}}- **Pembeli:** Mencari produk, memesan, membayar.
- **Penjual/Admin:** Mengelola produk, pesanan, pembayaran.
  {{/if}}{{#if isSaas}}- **Pengguna:** Mendaftar, menggunakan fitur aplikasi, mengelola akun.
- **Admin:** Mengelola pengguna, langganan, konfigurasi.
  {{/if}}{{#if isInternal}}- **Karyawan:** Mengakses tools internal untuk operasional harian.
- **Admin:** Mengelola akses, data dan konfigurasi.
  {{/if}}{{#if isBooking}}- **Pelanggan:** Memilih layanan/jadwal, melakukan reservasi.
- **Penyedia:** Mengelola ketersediaan, pemesanan, konfirmasi.
  {{/if}}{{#if isCustom}}- **Pengguna:** Mengakses fitur sesuai kebutuhan proyek.
{{/if}}

## Kebutuhan Produk

| ID                              | Peran      | Kebutuhan                                                                              | Prioritas                                                                | Kriteria Keberhasilan                                     |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| REQ-01                          | Pengunjung | Halaman utama menampilkan informasi inti dengan jelas dan responsif di semua perangkat | P0                                                                       | Halaman dimuat <2,5 detik (LCP), layout stabil (CLS <0,1) |
| REQ-02                          | Pengunjung | Navigasi yang konsisten dan aksesibel antar halaman                                    | P0                                                                       | Keyboard navigable, focus visible, mobile menu berfungsi  |
| REQ-03                          | Pengunjung | Halaman memenuhi standar aksesibilitas dasar                                           | P0                                                                       | Kontras ≥4,5:1, target sentuh 44px, label form lengkap    |
| {{#if hasAuth}}                 | REQ-04     | Pengguna                                                                               | Registrasi, login, logout dan pemulihan akun                             | P0                                                        | Auth flow berjalan end-to-end, sesi aman, error ditangani     |
| {{else}}                        | REQ-04     | Pengunjung                                                                             | Konten halaman informatif dan terstruktur dengan baik                    | P1                                                        | Hierarki heading benar, konten terbaca, SEO dasar terpenuhi   |
| {{/if}}{{#if hasPayments}}      | REQ-05     | Pembeli                                                                                | Proses pembayaran yang aman dan terintegrasi payment gateway             | P0                                                        | Transaksi berhasil, webhook diverifikasi, idempotensi terjaga |
| {{else}}                        | REQ-05     | Pengunjung                                                                             | Formulir kontak atau call-to-action berfungsi                            | P1                                                        | Submit berhasil, validasi input, feedback ditampilkan         |
| {{/if}}{{#if hasSearch}}        | REQ-06     | Pengguna                                                                               | Pencarian konten dengan hasil yang relevan                               | P1                                                        | Pencarian mengembalikan hasil akurat, handling empty state    |
| {{else}}                        | REQ-06     | Pengunjung                                                                             | Halaman memuat dengan performa baik pada koneksi standar                 | P1                                                        | INP <200ms, bundle teroptimasi, gambar lazy-loaded            |
| {{/if}}{{#if hasAdmin}}         | REQ-07     | Admin                                                                                  | Panel admin untuk mengelola konten dan data                              | P1                                                        | CRUD lengkap, RBAC diterapkan, audit log tersedia             |
| {{else}}                        | REQ-07     | Pengunjung                                                                             | Footer dengan informasi kontak dan tautan penting                        | P2                                                        | Footer responsif, tautan valid, informasi kontak benar        |
| {{/if}}{{#if hasCms}}           | REQ-08     | Editor                                                                                 | Sistem manajemen konten untuk update tanpa deploy ulang                  | P1                                                        | Konten dapat diubah, preview tersedia, perubahan terpublikasi |
| {{else}}                        | REQ-08     | Pengunjung                                                                             | Halaman error (404, 500) yang informatif dengan navigasi kembali         | P2                                                        | Halaman error ditampilkan, link kembali berfungsi             |
| {{/if}}{{#if hasUploads}}       | REQ-09     | Pengguna                                                                               | Upload file dengan validasi tipe, ukuran dan keamanan                    | P1                                                        | Upload berhasil, file berbahaya ditolak, storage aman         |
| {{else}}                        | REQ-09     | Pengunjung                                                                             | Metadata dan Open Graph untuk sharing di media sosial                    | P2                                                        | OG tags lengkap, preview benar di platform sosial             |
| {{/if}}{{#if hasNotifications}} | REQ-10     | Pengguna                                                                               | Notifikasi untuk aktivitas penting (email/in-app)                        | P1                                                        | Notifikasi terkirim dan diterima, preferensi dapat diatur     |
| {{else}}                        | REQ-10     | Pengunjung                                                                             | Website berfungsi baik tanpa JavaScript kritis (progressive enhancement) | P2                                                        | Konten inti terlihat tanpa JS, form berfungsi dengan fallback |
{{/if}}

## MVP dan Batas Lingkup

**Termasuk MVP:**

1. Halaman utama responsif (REQ-01)
2. Navigasi dan aksesibilitas dasar (REQ-02, REQ-03)
   {{#if hasAuth}}3. Alur autentikasi lengkap (REQ-04)
   {{/if}}{{#if hasPayments}}4. Integrasi pembayaran dasar (REQ-05)
{{/if}}

**Di luar lingkup MVP:**

- Optimasi performa lanjutan (PWA, offline)
- Fitur analitik kustom
- Integrasi pihak ketiga yang belum dikonfirmasi
- Multi-bahasa (kecuali sudah ditentukan)

## Ketergantungan

| Kebutuhan                  | Bergantung Pada | Catatan         |
| -------------------------- | --------------- | --------------- |
| {{#if hasAuth}}            | REQ-05, REQ-07  | REQ-04 (Auth)   | Fitur pembayaran dan admin memerlukan autentikasi                      |
| {{/if}}{{#if hasPayments}} | REQ-05          | Payment gateway | Kredensial dan konfigurasi provider belum tersedia sampai dikonfirmasi |
| {{/if}}{{#if hasAdmin}}    | REQ-07          | REQ-04          | Panel admin memerlukan sistem autentikasi dan RBAC                     |
| {{/if}}                    | REQ-01..REQ-03  | —               | Dapat dikerjakan tanpa ketergantungan eksternal                        |

Semua kebutuhan terhubung ke [acceptance.md](acceptance.md) (AC-xx), [testing.md](testing.md) (TEST-xx), dan [implementation-plan.md](implementation-plan.md) (T-phase.number). Status: pending sampai diimplementasikan dan diverifikasi.
