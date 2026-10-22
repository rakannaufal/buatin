# Acceptance Criteria — {{projectName}}

## Kriteria AC

### AC-01: Halaman Utama

- **Kondisi:** Pengguna mengakses URL utama
- **Hasil:** Halaman utama dimuat lengkap, responsif, LCP <2,5 detik, layout stabil
- **Penolakan:** Halaman blank, konten terpotong, layout rusak di mobile

### AC-02: Navigasi

- **Kondisi:** Pengguna berpindah antar halaman via menu
- **Hasil:** Navigasi konsisten, keyboard accessible, focus visible, mobile menu berfungsi
- **Penolakan:** Link rusak, focus trap, menu tidak dapat dibuka di mobile

### AC-03: Aksesibilitas

- **Kondisi:** Pengguna menggunakan keyboard, screen reader, atau perangkat bantu
- **Hasil:** Kontras ≥4,5:1, target sentuh 44px, label form terhubung, heading hierarkis
- **Penolakan:** Kontras gagal, elemen tidak terjangkau keyboard, label hilang

{{#if hasAuth}}
### AC-04: Autentikasi

- **Kondisi:** Pengguna mengisi form registrasi/login dengan data valid
- **Hasil:** Akun terbuat/login berhasil, sesi aktif, redirect ke halaman yang sesuai
- **Penolakan:** Data invalid diterima, sesi tidak terbentuk, error tidak informatif
- **Kasus negatif:** Password lemah ditolak, email duplikat ditangani, brute force dibatasi
{{else}}
### AC-04: Konten Halaman

- **Kondisi:** Pengguna membuka halaman konten
- **Hasil:** Konten terstruktur, heading hierarkis, SEO meta tag lengkap
- **Penolakan:** Konten tidak terbaca, heading melompat level, meta tag kosong
{{/if}}

{{#if hasPayments}}
### AC-05: Pembayaran

- **Kondisi:** Pengguna menyelesaikan proses checkout dengan payment method valid
- **Hasil:** Pembayaran diproses, konfirmasi ditampilkan, webhook diterima dan diverifikasi
- **Penolakan:** Pembayaran ganda, status tidak konsisten, webhook gagal tanpa retry
- **Kasus negatif:** Pembayaran gagal ditangani, nominal diverifikasi server-side
{{else}}
### AC-05: Form Kontak/CTA

- **Kondisi:** Pengguna mengisi dan submit form kontak
- **Hasil:** Validasi berjalan, submit berhasil, konfirmasi ditampilkan
- **Penolakan:** Input invalid diterima, submit tanpa feedback, double submit
{{/if}}

{{#if hasSearch}}
### AC-06: Pencarian

- **Kondisi:** Pengguna mengetik query di search bar
- **Hasil:** Hasil relevan ditampilkan, empty state informatif, pagination berfungsi
- **Penolakan:** Hasil tidak relevan, error tanpa pesan, infinite loading
{{else}}
### AC-06: Performa

- **Kondisi:** Halaman diakses pada koneksi standar (4G)
- **Hasil:** INP <200ms, bundle teroptimasi, gambar lazy-loaded di bawah fold
- **Penolakan:** Interaksi lambat, bundle terlalu besar, gambar memblokir render
{{/if}}

{{#if hasAdmin}}
### AC-07: Panel Admin

- **Kondisi:** Admin login dan mengakses panel admin
- **Hasil:** CRUD konten/data berfungsi, akses dibatasi per role, audit log tercatat
- **Penolakan:** User biasa mengakses admin, operasi tanpa log, data rusak setelah edit
{{else}}
### AC-07: Footer dan Informasi

- **Kondisi:** Pengguna scroll ke bawah halaman
- **Hasil:** Footer responsif, link valid, informasi kontak benar
- **Penolakan:** Footer overlap konten, link rusak, informasi salah
{{/if}}

{{#if hasCms}}
### AC-08: Manajemen Konten

- **Kondisi:** Editor membuat/mengubah konten via CMS
- **Hasil:** Konten tersimpan, preview tersedia, perubahan terpublikasi
- **Penolakan:** Konten hilang saat save, preview tidak akurat, publish gagal tanpa error
{{else}}
### AC-08: Halaman Error

- **Kondisi:** Pengguna mengakses URL yang tidak ada atau server error
- **Hasil:** Halaman 404/500 informatif ditampilkan, navigasi kembali tersedia
- **Penolakan:** Halaman putih, stack trace terekspos, tidak ada jalan kembali
{{/if}}

{{#if hasUploads}}
### AC-09: Upload File

- **Kondisi:** Pengguna mengupload file dengan tipe dan ukuran yang valid
- **Hasil:** File tersimpan, accessible, preview tersedia untuk gambar
- **Penolakan:** File berbahaya diterima, upload tanpa validasi, file hilang
{{else}}
### AC-09: SEO dan Sharing

- **Kondisi:** URL di-share di media sosial atau diakses crawler
- **Hasil:** OG tags lengkap, preview benar, canonical URL tepat
- **Penolakan:** Preview kosong, judul/gambar salah, URL duplikat
{{/if}}

{{#if hasNotifications}}
### AC-10: Notifikasi

- **Kondisi:** Aktivitas penting terjadi (transaksi, update status)
- **Hasil:** Notifikasi terkirim via channel yang sesuai, preferensi dihormati
- **Penolakan:** Notifikasi tidak terkirim, spam, preferensi diabaikan
{{else}}
### AC-10: Progressive Enhancement

- **Kondisi:** Pengguna mengakses website dengan JavaScript dinonaktifkan
- **Hasil:** Konten inti tetap terlihat, form memiliki fallback
- **Penolakan:** Halaman kosong tanpa JS, form tidak berfungsi sama sekali
{{/if}}

## Matriks Traceability

| REQ    | AC    | TEST    | TASK  | Status  |
| ------ | ----- | ------- | ----- | ------- |
| REQ-01 | AC-01 | TEST-01 | T-2.1 | pending |
| REQ-02 | AC-02 | TEST-02 | T-2.2 | pending |
| REQ-03 | AC-03 | TEST-03 | T-2.3 | pending |
| REQ-04 | AC-04 | TEST-04 | T-2.4 | pending |
| REQ-05 | AC-05 | TEST-05 | T-2.5 | pending |
| REQ-06 | AC-06 | TEST-06 | T-3.1 | pending |
| REQ-07 | AC-07 | TEST-07 | T-3.2 | pending |
| REQ-08 | AC-08 | TEST-08 | T-3.3 | pending |
| REQ-09 | AC-09 | TEST-09 | T-3.4 | pending |
| REQ-10 | AC-10 | TEST-10 | T-3.5 | pending |

## Gerbang Kualitas

Sebelum rilis, semua item berikut harus terpenuhi:

| Gate           | Kriteria                                            | Status  |
| -------------- | --------------------------------------------------- | ------- |
| Fungsional     | Semua AC-01..AC-10 yang relevan diterima            | pending |
| Keamanan       | Uji negatif dari [security.md](security.md) lulus   | pending |
| Aksesibilitas  | Kontras, keyboard, label, focus — AC-03             | pending |
| Responsif      | Desktop, tablet, mobile diuji                       | pending |
| Performa       | LCP ≤2,5s, CLS ≤0,1, INP ≤200ms                     | pending |
| Loading        | Skeleton hanya untuk async, SSR/SSG langsung render | pending |
| Error handling | 404, 500, network error, empty state ditangani      | pending |
| Build          | CI hijau, format/lint/typecheck/test/build lulus    | pending |

Semua status **pending** sampai implementasi selesai dan bukti dikumpulkan. Detail pengujian di [testing.md](testing.md).
