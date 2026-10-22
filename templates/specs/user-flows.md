# User Flows — {{projectName}}

> Dokumen ini mendefinisikan alur perjalanan pengguna (user flows) utama dalam **{{projectName}}**.

---

## Ringkasan

{{brief}}

Setiap flow didokumentasikan dengan precondition, langkah-langkah, dan postcondition untuk memastikan implementasi konsisten.

---

## Konvensi

| Simbol | Arti            |
| ------ | --------------- |
| 🟢     | Start point     |
| 🔴     | End point       |
| 🔀     | Decision point  |
| ⚠️     | Error/edge case |

---

## Flow Umum

### UF-01: Landing Page Visit

| Aspek             | Detail                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-01                                                                                                                                                                                    |
| **Nama**          | Kunjungan Halaman Utama                                                                                                                                                                  |
| **Aktor**         | Visitor (unauthenticated)                                                                                                                                                                |
| **Precondition**  | User membuka URL {{projectName}}                                                                                                                                                         |
| **Langkah**       | 1. User mengakses halaman utama → 2. Sistem menampilkan hero section, fitur utama, CTA → 3. User menjelajahi konten halaman → 4. User memutuskan aksi selanjutnya (daftar/login/explore) |
| **Postcondition** | User memahami value proposition dan memilih aksi                                                                                                                                         |
| **Error Case**    | Halaman gagal load → tampilkan error page dengan retry                                                                                                                                   |

{{#if hasAuth}}

---

## Flow Autentikasi

### UF-AUTH-01: Registrasi Akun Baru

| Aspek             | Detail                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**            | UF-AUTH-01                                                                                                                                                                                                   |
| **Nama**          | Registrasi User Baru                                                                                                                                                                                         |
| **Aktor**         | Visitor                                                                                                                                                                                                      |
| **Precondition**  | User belum memiliki akun                                                                                                                                                                                     |
| **Langkah**       | 1. User klik "Daftar" → 2. Sistem tampilkan form registrasi → 3. User isi nama, email, password → 4. Sistem validasi input → 5. Sistem kirim email verifikasi → 6. User klik link verifikasi → 7. Akun aktif |
| **Postcondition** | Akun terdaftar dan terverifikasi, user bisa login                                                                                                                                                            |
| **Error Case**    | Email sudah terdaftar → tampilkan pesan "Email sudah digunakan"; Password lemah → tampilkan requirement                                                                                                      |

### UF-AUTH-02: Login

| Aspek             | Detail                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-AUTH-02                                                                                                                                                                            |
| **Nama**          | Login User                                                                                                                                                                            |
| **Aktor**         | Registered User                                                                                                                                                                       |
| **Precondition**  | User memiliki akun aktif                                                                                                                                                              |
| **Langkah**       | 1. User klik "Masuk" → 2. Sistem tampilkan form login → 3. User isi email dan password → 4. Sistem validasi kredensial → 5. Sistem buat session/token → 6. Redirect ke dashboard/home |
| **Postcondition** | User terautentikasi dengan session aktif                                                                                                                                              |
| **Error Case**    | Kredensial salah → pesan error; Akun terkunci → info lockout duration                                                                                                                 |

### UF-AUTH-03: Lupa Password

| Aspek             | Detail                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-AUTH-03                                                                                                                                                                   |
| **Nama**          | Reset Password                                                                                                                                                               |
| **Aktor**         | Registered User                                                                                                                                                              |
| **Precondition**  | User lupa password                                                                                                                                                           |
| **Langkah**       | 1. User klik "Lupa Password" → 2. User masukkan email → 3. Sistem kirim link reset → 4. User klik link di email → 5. User masukkan password baru → 6. Sistem update password |
| **Postcondition** | Password berhasil diubah, user bisa login dengan password baru                                                                                                               |
| **Error Case**    | Email tidak terdaftar → pesan generic (keamanan); Link expired → minta kirim ulang                                                                                           |

### UF-AUTH-04: Logout

| Aspek             | Detail                                                                               |
| ----------------- | ------------------------------------------------------------------------------------ |
| **ID**            | UF-AUTH-04                                                                           |
| **Nama**          | Logout                                                                               |
| **Aktor**         | Authenticated User                                                                   |
| **Precondition**  | User dalam kondisi login                                                             |
| **Langkah**       | 1. User klik "Keluar" → 2. Sistem hapus session/token → 3. Redirect ke halaman utama |
| **Postcondition** | Session dihapus, user kembali ke status visitor                                      |
| **Error Case**    | Session sudah expired → redirect ke login                                            |

{{/if}}

{{#if isEcommerce}}

---

## Flow E-Commerce

### UF-EC-01: Browse & Cari Produk

| Aspek             | Detail                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-EC-01                                                                                                                                            |
| **Nama**          | Pencarian Produk                                                                                                                                    |
| **Aktor**         | Visitor / User                                                                                                                                      |
| **Precondition**  | Katalog produk tersedia                                                                                                                             |
| **Langkah**       | 1. User buka halaman katalog → 2. User gunakan filter/search → 3. Sistem tampilkan hasil → 4. User pilih produk → 5. Sistem tampilkan detail produk |
| **Postcondition** | User melihat detail produk yang diminati                                                                                                            |
| **Error Case**    | Tidak ada hasil → tampilkan pesan "Produk tidak ditemukan" dengan saran                                                                             |

### UF-EC-02: Add to Cart & Checkout

| Aspek             | Detail                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-EC-02                                                                                                                                                                                                                                                    |
| **Nama**          | Keranjang & Checkout                                                                                                                                                                                                                                        |
| **Aktor**         | User (authenticated)                                                                                                                                                                                                                                        |
| **Precondition**  | User sudah memilih produk                                                                                                                                                                                                                                   |
| **Langkah**       | 1. User klik "Tambah ke Keranjang" → 2. Sistem update cart → 3. User buka keranjang → 4. User atur quantity → 5. User klik "Checkout" → 6. User isi alamat pengiriman → 7. User pilih metode pembayaran → 8. User konfirmasi pesanan → 9. Sistem buat order |
| **Postcondition** | Order terbuat dengan status "pending payment"                                                                                                                                                                                                               |
| **Error Case**    | Stok habis → notifikasi; Harga berubah → konfirmasi ulang                                                                                                                                                                                                   |

### UF-EC-03: Tracking Pesanan

| Aspek             | Detail                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-EC-03                                                                                                                          |
| **Nama**          | Lacak Status Pesanan                                                                                                              |
| **Aktor**         | User (authenticated)                                                                                                              |
| **Precondition**  | User memiliki order aktif                                                                                                         |
| **Langkah**       | 1. User buka "Pesanan Saya" → 2. User pilih pesanan → 3. Sistem tampilkan status dan timeline → 4. User melihat detail pengiriman |
| **Postcondition** | User mengetahui status terkini pesanan                                                                                            |
| **Error Case**    | Data tracking belum tersedia → tampilkan status terakhir yang diketahui                                                           |

{{/if}}

{{#if isSaas}}

---

## Flow SaaS

### UF-SAAS-01: Onboarding

| Aspek             | Detail                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-SAAS-01                                                                                                                                                                                              |
| **Nama**          | Onboarding User Baru                                                                                                                                                                                    |
| **Aktor**         | New User                                                                                                                                                                                                |
| **Precondition**  | User baru saja registrasi                                                                                                                                                                               |
| **Langkah**       | 1. User diarahkan ke wizard onboarding → 2. User isi profil/organisasi → 3. User pilih use case → 4. Sistem konfigurasi workspace → 5. User melihat guided tour → 6. User mulai menggunakan fitur utama |
| **Postcondition** | Workspace terkonfigurasi, user siap menggunakan produk                                                                                                                                                  |
| **Error Case**    | User skip onboarding → bisa diakses lagi dari settings                                                                                                                                                  |

### UF-SAAS-02: Upgrade Plan

| Aspek             | Detail                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-SAAS-02                                                                                                                                                                                                       |
| **Nama**          | Upgrade Subscription                                                                                                                                                                                             |
| **Aktor**         | Account Owner                                                                                                                                                                                                    |
| **Precondition**  | User pada plan free/basic                                                                                                                                                                                        |
| **Langkah**       | 1. User buka halaman pricing/billing → 2. User pilih plan baru → 3. Sistem tampilkan perbandingan fitur → 4. User konfirmasi → 5. User isi payment method → 6. Sistem proses pembayaran → 7. Plan aktif langsung |
| **Postcondition** | Plan ter-upgrade, fitur premium aktif                                                                                                                                                                            |
| **Error Case**    | Pembayaran gagal → tetap di plan lama, tampilkan opsi retry                                                                                                                                                      |

### UF-SAAS-03: Invite Team Member

| Aspek             | Detail                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-SAAS-03                                                                                                                                                                                                       |
| **Nama**          | Undang Anggota Tim                                                                                                                                                                                               |
| **Aktor**         | Account Owner / Admin                                                                                                                                                                                            |
| **Precondition**  | User memiliki akses admin workspace                                                                                                                                                                              |
| **Langkah**       | 1. User buka settings → Team → 2. User klik "Invite" → 3. User masukkan email dan role → 4. Sistem kirim undangan email → 5. Invitee klik link → 6. Invitee registrasi/login → 7. Invitee bergabung ke workspace |
| **Postcondition** | Anggota baru bergabung dengan role yang ditentukan                                                                                                                                                               |
| **Error Case**    | Seat limit tercapai → tampilkan opsi upgrade; Email sudah terdaftar di workspace → info sudah jadi member                                                                                                        |

{{/if}}

{{#if isBooking}}

---

## Flow Booking

### UF-BK-01: Cari & Pesan

| Aspek             | Detail                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-BK-01                                                                                                                                                                                                                               |
| **Nama**          | Pencarian & Pemesanan                                                                                                                                                                                                                  |
| **Aktor**         | User                                                                                                                                                                                                                                   |
| **Precondition**  | Slot/jadwal tersedia                                                                                                                                                                                                                   |
| **Langkah**       | 1. User pilih tanggal/waktu → 2. Sistem tampilkan ketersediaan → 3. User pilih slot → 4. User isi detail pemesanan → 5. User konfirmasi → 6. Sistem reserve slot → 7. User lakukan pembayaran (jika diperlukan) → 8. Booking confirmed |
| **Postcondition** | Booking terkonfirmasi, slot ter-reserve                                                                                                                                                                                                |
| **Error Case**    | Slot sudah terisi → tampilkan alternatif; Timeout reserve → slot dilepas                                                                                                                                                               |

### UF-BK-02: Pembatalan Booking

| Aspek             | Detail                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-BK-02                                                                                                                                                                                                |
| **Nama**          | Batalkan Reservasi                                                                                                                                                                                      |
| **Aktor**         | User                                                                                                                                                                                                    |
| **Precondition**  | User memiliki booking aktif                                                                                                                                                                             |
| **Langkah**       | 1. User buka "Booking Saya" → 2. User pilih booking → 3. User klik "Batalkan" → 4. Sistem tampilkan kebijakan pembatalan → 5. User konfirmasi → 6. Sistem proses pembatalan → 7. Refund (jika eligible) |
| **Postcondition** | Booking dibatalkan, slot kembali tersedia                                                                                                                                                               |
| **Error Case**    | Batas pembatalan terlewat → info biaya cancellation                                                                                                                                                     |

### UF-BK-03: Reschedule

| Aspek             | Detail                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-BK-03                                                                                                                                                                  |
| **Nama**          | Jadwal Ulang                                                                                                                                                              |
| **Aktor**         | User                                                                                                                                                                      |
| **Precondition**  | Booking aktif, belum melewati batas reschedule                                                                                                                            |
| **Langkah**       | 1. User buka detail booking → 2. User klik "Ubah Jadwal" → 3. Sistem tampilkan slot tersedia → 4. User pilih slot baru → 5. Sistem update booking → 6. Konfirmasi dikirim |
| **Postcondition** | Booking dipindah ke jadwal baru, slot lama dilepas                                                                                                                        |
| **Error Case**    | Limit reschedule tercapai → tidak bisa ubah jadwal lagi                                                                                                                   |

{{/if}}

{{#if hasPayments}}

---

## Flow Pembayaran

### UF-PAY-01: Proses Pembayaran

| Aspek             | Detail                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**            | UF-PAY-01                                                                                                                                                                                                                      |
| **Nama**          | Pembayaran                                                                                                                                                                                                                     |
| **Aktor**         | User                                                                                                                                                                                                                           |
| **Precondition**  | User memiliki item yang perlu dibayar                                                                                                                                                                                          |
| **Langkah**       | 1. Sistem tampilkan ringkasan pembayaran → 2. User pilih metode bayar → 3. Sistem redirect ke payment gateway → 4. User selesaikan pembayaran → 5. Gateway kirim webhook → 6. Sistem update status → 7. Konfirmasi ditampilkan |
| **Postcondition** | Pembayaran berhasil, status order/subscription updated                                                                                                                                                                         |
| **Error Case**    | Pembayaran gagal → opsi retry; Timeout → cek status via callback                                                                                                                                                               |

{{/if}}

{{#if hasAdmin}}

---

## Flow Admin

### UF-ADM-01: Kelola Data

| Aspek             | Detail                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-ADM-01                                                                                                                                                               |
| **Nama**          | Manajemen Data oleh Admin                                                                                                                                               |
| **Aktor**         | Admin                                                                                                                                                                   |
| **Precondition**  | User memiliki role admin                                                                                                                                                |
| **Langkah**       | 1. Admin login → 2. Admin buka dashboard → 3. Admin pilih menu manajemen → 4. Admin CRUD data → 5. Sistem validasi → 6. Sistem simpan perubahan → 7. Audit log tercatat |
| **Postcondition** | Data berhasil dikelola, perubahan tercatat di audit log                                                                                                                 |
| **Error Case**    | Validasi gagal → tampilkan error detail; Concurrent edit → conflict resolution                                                                                          |

{{/if}}

{{#if hasUploads}}

---

## Flow Upload

### UF-UPL-01: Upload File

| Aspek             | Detail                                                                                                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**            | UF-UPL-01                                                                                                                                                                                                                                      |
| **Nama**          | Upload File                                                                                                                                                                                                                                    |
| **Aktor**         | User                                                                                                                                                                                                                                           |
| **Precondition**  | User terautentikasi, memiliki izin upload                                                                                                                                                                                                      |
| **Langkah**       | 1. User klik area upload / drag-drop file → 2. Client validasi tipe & ukuran → 3. Upload dimulai dengan progress bar → 4. Server validasi ulang → 5. File disimpan ke storage → 6. URL/referensi disimpan ke database → 7. Preview ditampilkan |
| **Postcondition** | File tersimpan dan terhubung dengan entitas terkait                                                                                                                                                                                            |
| **Error Case**    | Tipe tidak valid → pesan error; Ukuran melebihi batas → info limit; Upload gagal → opsi retry                                                                                                                                                  |

{{/if}}

---

## Ringkasan Flow

| ID    | Flow               | Aktor   | Prioritas |
| ----- | ------------------ | ------- | --------- |
| UF-01 | Landing Page Visit | Visitor | High      |
{{#if hasAuth}}
| UF-AUTH-01 | Registrasi | Visitor | Critical |
| UF-AUTH-02 | Login | User | Critical |
| UF-AUTH-03 | Lupa Password | User | High |
| UF-AUTH-04 | Logout | User | High |
{{/if}}
{{#if isEcommerce}}
| UF-EC-01 | Browse Produk | Visitor/User | High |
| UF-EC-02 | Cart & Checkout | User | Critical |
| UF-EC-03 | Tracking Pesanan | User | High |
{{/if}}
{{#if isSaas}}
| UF-SAAS-01 | Onboarding | New User | High |
| UF-SAAS-02 | Upgrade Plan | Account Owner | High |
| UF-SAAS-03 | Invite Member | Admin | Medium |
{{/if}}
{{#if isBooking}}
| UF-BK-01 | Cari & Pesan | User | Critical |
| UF-BK-02 | Pembatalan | User | High |
| UF-BK-03 | Reschedule | User | Medium |
{{/if}}
{{#if hasPayments}}
| UF-PAY-01 | Pembayaran | User | Critical |
{{/if}}
{{#if hasAdmin}}
| UF-ADM-01 | Kelola Data | Admin | High |
{{/if}}
{{#if hasUploads}}
| UF-UPL-01 | Upload File | User | Medium |
{{/if}}

---

> Flow ini harus menjadi acuan utama untuk pengembangan UI/UX dan testing **{{projectName}}**.
