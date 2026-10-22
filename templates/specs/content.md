# Inventaris Konten — {{projectName}}

> Dokumen ini mendefinisikan seluruh kebutuhan konten untuk **{{projectName}}** termasuk teks halaman, label UI, microcopy, dan aset konten.

---

## Ringkasan

{{brief}}

---

## Konten Halaman Utama

### Homepage

| Elemen           | Konten                                                            | Catatan                |
| ---------------- | ----------------------------------------------------------------- | ---------------------- |
| Hero Title       | Headline utama yang menjelaskan value proposition {{projectName}} | Maks 10 kata           |
| Hero Subtitle    | Penjelasan singkat benefit utama                                  | Maks 25 kata           |
| CTA Primary      | Teks tombol aksi utama (misal: "Mulai Sekarang")                  | Action-oriented        |
| CTA Secondary    | Teks tombol aksi sekunder (misal: "Pelajari Lebih Lanjut")        | Exploratory            |
| Features Section | 3-6 fitur utama dengan ikon, judul, dan deskripsi singkat         | Per fitur maks 15 kata |
| Social Proof     | Testimoni, jumlah pengguna, atau logo partner                     | Minimal 3 item         |
| Footer CTA       | Call-to-action penutup sebelum footer                             | Reinforcement          |

### About

| Elemen     | Konten                                  | Catatan          |
| ---------- | --------------------------------------- | ---------------- |
| Page Title | "Tentang {{projectName}}"               | H1               |
| Story      | Latar belakang dan misi {{projectName}} | 2-3 paragraf     |
| Team       | Profil tim (jika relevan)               | Nama, role, foto |
| Values     | Nilai-nilai yang dipegang               | 3-5 nilai        |

### Contact

| Elemen          | Konten                                                                   | Catatan                |
| --------------- | ------------------------------------------------------------------------ | ---------------------- |
| Page Title      | "Hubungi Kami"                                                           | H1                     |
| Form Labels     | Nama, Email, Subjek, Pesan                                               | Label bahasa Indonesia |
| Submit Button   | "Kirim Pesan"                                                            | CTA                    |
| Success Message | "Pesan Anda berhasil dikirim. Kami akan merespons dalam 1-2 hari kerja." | Feedback               |

---

## Label UI & Microcopy

### Navigasi

| Key           | Indonesia | Konteks    |
| ------------- | --------- | ---------- |
| `nav.home`    | Beranda   | Menu utama |
| `nav.about`   | Tentang   | Menu utama |
| `nav.contact` | Kontak    | Menu utama |
{{#if hasAuth}}
| `nav.login` | Masuk | Header CTA |
| `nav.register` | Daftar | Header CTA |
| `nav.logout` | Keluar | User menu |
| `nav.profile` | Profil Saya | User menu |
| `nav.settings` | Pengaturan | User menu |
{{/if}}
{{#if hasAdmin}}
| `nav.admin` | Admin | Admin menu |
| `nav.dashboard` | Dashboard | Sidebar |
{{/if}}

### Tombol & Aksi

| Key                | Indonesia         | Konteks             |
| ------------------ | ----------------- | ------------------- |
| `action.save`      | Simpan            | Form submit         |
| `action.cancel`    | Batal             | Form cancel         |
| `action.delete`    | Hapus             | Destructive action  |
| `action.edit`      | Edit              | Inline action       |
| `action.create`    | Buat Baru         | Create action       |
| `action.search`    | Cari              | Search input        |
| `action.filter`    | Filter            | Filter panel        |
| `action.reset`     | Reset             | Filter/form reset   |
| `action.load_more` | Muat Lebih Banyak | Pagination          |
| `action.back`      | Kembali           | Navigation          |
| `action.next`      | Selanjutnya       | Wizard/stepper      |
| `action.previous`  | Sebelumnya        | Wizard/stepper      |
| `action.confirm`   | Konfirmasi        | Confirmation dialog |
| `action.close`     | Tutup             | Modal/dialog        |

### Status & Feedback

| Key                   | Indonesia                | Konteks          |
| --------------------- | ------------------------ | ---------------- |
| `status.loading`      | Memuat...                | Loading state    |
| `status.saving`       | Menyimpan...             | Save in progress |
| `status.success`      | Berhasil!                | Success toast    |
| `status.error`        | Terjadi kesalahan        | Error message    |
| `status.empty`        | Belum ada data           | Empty state      |
| `status.not_found`    | Halaman tidak ditemukan  | 404 page         |
| `status.server_error` | Terjadi kesalahan server | 500 page         |
| `status.offline`      | Anda sedang offline      | No connection    |
| `status.no_results`   | Tidak ada hasil          | Search empty     |

### Validasi Form

| Key                            | Indonesia                        | Konteks           |
| ------------------------------ | -------------------------------- | ----------------- |
| `validation.required`          | Wajib diisi                      | Required field    |
| `validation.email`             | Format email tidak valid         | Email validation  |
| `validation.min_length`        | Minimal {n} karakter             | Min length        |
| `validation.max_length`        | Maksimal {n} karakter            | Max length        |
| `validation.password_weak`     | Password terlalu lemah           | Password strength |
| `validation.password_mismatch` | Password tidak cocok             | Confirm password  |
| `validation.phone`             | Format nomor telepon tidak valid | Phone validation  |
| `validation.url`               | Format URL tidak valid           | URL validation    |
| `validation.number`            | Harus berupa angka               | Number validation |
| `validation.file_too_large`    | Ukuran file melebihi batas       | File upload       |
| `validation.file_type`         | Tipe file tidak didukung         | File upload       |

### Konfirmasi

| Key               | Indonesia                                                   | Konteks             |
| ----------------- | ----------------------------------------------------------- | ------------------- |
| `confirm.delete`  | Yakin ingin menghapus? Tindakan ini tidak dapat dibatalkan. | Delete confirmation |
| `confirm.unsaved` | Ada perubahan yang belum disimpan. Yakin ingin keluar?      | Unsaved changes     |
| `confirm.logout`  | Yakin ingin keluar dari akun?                               | Logout confirmation |

{{#if hasAuth}}

---

## Konten Autentikasi

| Halaman  | Elemen        | Konten                                                                     |
| -------- | ------------- | -------------------------------------------------------------------------- |
| Login    | Title         | Masuk ke Akun Anda                                                         |
| Login    | Subtitle      | Selamat datang kembali di {{projectName}}                                  |
| Login    | Forgot Link   | Lupa password?                                                             |
| Login    | Register Link | Belum punya akun? Daftar sekarang                                          |
| Register | Title         | Buat Akun Baru                                                             |
| Register | Subtitle      | Bergabung dengan {{projectName}}                                           |
| Register | Login Link    | Sudah punya akun? Masuk                                                    |
| Register | Terms         | Dengan mendaftar, Anda menyetujui Syarat & Ketentuan dan Kebijakan Privasi |
| Forgot   | Title         | Lupa Password                                                              |
| Forgot   | Subtitle      | Masukkan email Anda untuk menerima link reset password                     |
| Forgot   | Success       | Link reset password telah dikirim ke email Anda                            |
| Verify   | Title         | Verifikasi Email                                                           |
| Verify   | Success       | Email Anda berhasil diverifikasi                                           |
| Verify   | Expired       | Link verifikasi sudah kadaluarsa                                           |

{{/if}}

{{#if isEcommerce}}

---

## Konten E-Commerce

### Label Produk

| Key                      | Indonesia           | Konteks            |
| ------------------------ | ------------------- | ------------------ |
| `product.add_to_cart`    | Tambah ke Keranjang | Product detail CTA |
| `product.buy_now`        | Beli Sekarang       | Direct purchase    |
| `product.out_of_stock`   | Stok Habis          | Unavailable        |
| `product.in_stock`       | Tersedia            | Available          |
| `product.low_stock`      | Stok Terbatas       | Low stock warning  |
| `product.price`          | Harga               | Price label        |
| `product.discount`       | Diskon {n}%         | Discount badge     |
| `product.description`    | Deskripsi           | Tab/section        |
| `product.reviews`        | Ulasan ({n})        | Tab/section        |
| `product.related`        | Produk Terkait      | Section            |
| `product.specifications` | Spesifikasi         | Tab/section        |

### Label Checkout

| Key                         | Indonesia               | Konteks       |
| --------------------------- | ----------------------- | ------------- |
| `cart.title`                | Keranjang Belanja       | Page title    |
| `cart.empty`                | Keranjang Anda kosong   | Empty cart    |
| `cart.subtotal`             | Subtotal                | Price summary |
| `cart.shipping`             | Ongkos Kirim            | Shipping cost |
| `cart.tax`                  | Pajak                   | Tax           |
| `cart.total`                | Total                   | Grand total   |
| `checkout.title`            | Checkout                | Page title    |
| `checkout.shipping_address` | Alamat Pengiriman       | Form section  |
| `checkout.payment_method`   | Metode Pembayaran       | Form section  |
| `checkout.place_order`      | Buat Pesanan            | Final CTA     |
| `order.confirmed`           | Pesanan Berhasil Dibuat | Success page  |
| `order.tracking`            | Lacak Pesanan           | Tracking CTA  |

{{/if}}

{{#if isSaas}}

---

## Konten SaaS

### Pricing

| Elemen         | Konten                            | Catatan         |
| -------------- | --------------------------------- | --------------- |
| Section Title  | Pilih Paket yang Tepat untuk Anda | H1 pricing page |
| Free Plan      | Gratis — Untuk memulai            | Plan card       |
| Pro Plan       | Pro — Untuk profesional           | Plan card       |
| Enterprise     | Enterprise — Untuk tim besar      | Plan card       |
| CTA Free       | Mulai Gratis                      | Button          |
| CTA Pro        | Pilih Pro                         | Button          |
| CTA Enterprise | Hubungi Sales                     | Button          |

### Onboarding

| Step | Title                             | Description                         |
| ---- | --------------------------------- | ----------------------------------- |
| 1    | Selamat Datang di {{projectName}} | Ayo siapkan workspace Anda          |
| 2    | Tentang Anda                      | Ceritakan sedikit tentang diri Anda |
| 3    | Pilih Use Case                    | Apa yang ingin Anda capai?          |
| 4    | Siap Memulai                      | Workspace Anda sudah siap!          |

{{/if}}

{{#if isBooking}}

---

## Konten Booking

| Key                   | Indonesia                                 | Konteks           |
| --------------------- | ----------------------------------------- | ----------------- |
| `booking.select_date` | Pilih Tanggal                             | Date picker label |
| `booking.select_time` | Pilih Waktu                               | Time slot label   |
| `booking.confirm`     | Konfirmasi Pemesanan                      | CTA               |
| `booking.cancel`      | Batalkan Pemesanan                        | Cancel action     |
| `booking.reschedule`  | Ubah Jadwal                               | Reschedule action |
| `booking.confirmed`   | Pemesanan Dikonfirmasi                    | Success status    |
| `booking.cancelled`   | Pemesanan Dibatalkan                      | Cancelled status  |
| `booking.no_slots`    | Tidak ada slot tersedia untuk tanggal ini | Empty slots       |

{{/if}}

---

## Konten Legal

| Halaman          | Deskripsi                              | Status                   |
| ---------------- | -------------------------------------- | ------------------------ |
| Privacy Policy   | Kebijakan privasi sesuai UU PDP / GDPR | Perlu ditulis oleh legal |
| Terms of Service | Syarat dan ketentuan penggunaan        | Perlu ditulis oleh legal |
| Cookie Policy    | Kebijakan penggunaan cookie            | Perlu ditulis oleh legal |

---

## Panduan Gaya Konten

| Aspek          | Panduan                                                 |
| -------------- | ------------------------------------------------------- |
| **Nada**       | Profesional namun ramah, tidak kaku                     |
| **Bahasa**     | Bahasa Indonesia baku, hindari jargon teknis            |
| **Singkat**    | Headline maks 10 kata, deskripsi maks 25 kata           |
| **Inklusif**   | Gunakan bahasa netral gender                            |
| **Konsisten**  | Gunakan istilah yang sama untuk konsep yang sama        |
| **Actionable** | CTA gunakan kata kerja aktif ("Mulai", "Buat", "Kirim") |

---

> Konten ini harus di-review oleh tim copywriting dan disesuaikan dengan brand voice **{{projectName}}**.
