# Aturan Bisnis — {{projectName}}

> Dokumen ini mendefinisikan aturan bisnis (business rules) yang mengatur logika domain **{{projectName}}**.

---

## Ringkasan

{{brief}}

Aturan bisnis berikut memastikan konsistensi logika aplikasi di seluruh layer (frontend, backend, database). Setiap aturan memiliki ID unik untuk referensi silang dengan dokumen spesifikasi lainnya.

---

## Konvensi

| Prioritas    | Arti                                                         |
| ------------ | ------------------------------------------------------------ |
| **Critical** | Pelanggaran menyebabkan data corrupt atau kerugian finansial |
| **High**     | Pelanggaran menyebabkan pengalaman pengguna rusak            |
| **Medium**   | Pelanggaran menyebabkan inkonsistensi minor                  |
| **Low**      | Best practice, boleh ditunda                                 |

---

## Aturan Bisnis Umum

| ID    | Aturan             | Deskripsi                                                              | Prioritas | Validasi                  |
| ----- | ------------------ | ---------------------------------------------------------------------- | --------- | ------------------------- |
| BR-01 | Input Sanitization | Semua input pengguna harus di-sanitize sebelum diproses                | Critical  | Server-side + client-side |
| BR-02 | Rate Limiting      | API endpoint dibatasi maksimal request per menit per user/IP           | High      | Middleware                |
| BR-03 | Data Integrity     | Setiap operasi tulis harus atomic — gagal total atau sukses total      | Critical  | Database transaction      |
| BR-04 | Audit Trail        | Setiap perubahan data penting harus dicatat dengan timestamp dan aktor | High      | Event log                 |
| BR-05 | Soft Delete        | Data tidak dihapus permanen, gunakan flag `deleted_at`                 | Medium    | Query filter              |

{{#if hasAuth}}

---

## Aturan Autentikasi & Otorisasi

| ID         | Aturan            | Deskripsi                                                              | Prioritas | Validasi                       |
| ---------- | ----------------- | ---------------------------------------------------------------------- | --------- | ------------------------------ |
| BR-AUTH-01 | Password Policy   | Minimal 8 karakter, kombinasi huruf besar, kecil, angka                | Critical  | Registration + change password |
| BR-AUTH-02 | Session Expiry    | Sesi berakhir setelah periode inaktivitas yang ditentukan              | High      | Token TTL                      |
| BR-AUTH-03 | Failed Login Lock | Akun dikunci sementara setelah 5x percobaan login gagal berturut-turut | High      | Counter + cooldown             |
| BR-AUTH-04 | Role Hierarchy    | Akses ditentukan oleh role: admin > editor > member > guest            | Critical  | Middleware guard               |
| BR-AUTH-05 | Token Refresh     | Access token di-refresh sebelum expired tanpa mengganggu user          | Medium    | Silent refresh                 |

{{/if}}

{{#if isEcommerce}}

---

## Aturan E-Commerce

### Pricing & Diskon

| ID       | Aturan          | Deskripsi                                                      | Prioritas | Validasi                       |
| -------- | --------------- | -------------------------------------------------------------- | --------- | ------------------------------ |
| BR-EC-01 | Harga Positif   | Harga produk harus > 0, tidak boleh negatif                    | Critical  | DB constraint + API validation |
| BR-EC-02 | Diskon Maksimal | Diskon tidak boleh melebihi 100% dari harga produk             | Critical  | Checkout calculation           |
| BR-EC-03 | Kode Promo Unik | Setiap kode promo hanya bisa digunakan sesuai batas penggunaan | High      | Counter per code               |
| BR-EC-04 | Harga Tampil    | Harga yang ditampilkan sudah termasuk pajak (jika berlaku)     | High      | Display logic                  |

### Inventory & Stok

| ID       | Aturan          | Deskripsi                                                     | Prioritas | Validasi         |
| -------- | --------------- | ------------------------------------------------------------- | --------- | ---------------- |
| BR-EC-05 | Stok Real-time  | Stok dikurangi saat checkout berhasil, bukan saat add to cart | Critical  | Transaction lock |
| BR-EC-06 | Out of Stock    | Produk dengan stok 0 tidak bisa ditambahkan ke keranjang      | High      | Cart validation  |
| BR-EC-07 | Low Stock Alert | Notifikasi dikirim ke admin saat stok di bawah threshold      | Medium    | Background job   |
| BR-EC-08 | Reserved Stock  | Stok di-reserve selama proses checkout (timeout 15 menit)     | High      | Temporary lock   |

### Keranjang & Checkout

| ID       | Aturan             | Deskripsi                                                                | Prioritas | Validasi                |
| -------- | ------------------ | ------------------------------------------------------------------------ | --------- | ----------------------- |
| BR-EC-09 | Cart Persistence   | Keranjang tersimpan meski user logout (merge saat login kembali)         | Medium    | Local storage + DB sync |
| BR-EC-10 | Minimum Order      | Pesanan minimum sesuai kebijakan toko (jika ada)                         | Low       | Checkout validation     |
| BR-EC-11 | Checkout Timeout   | Sesi checkout expired setelah 30 menit inaktivitas                       | High      | Session timer           |
| BR-EC-12 | Order Confirmation | Order baru dibuat dengan status "pending" hingga pembayaran dikonfirmasi | Critical  | State machine           |

{{/if}}

{{#if isSaas}}

---

## Aturan SaaS

### Subscription & Plan

| ID         | Aturan         | Deskripsi                                                                           | Prioritas | Validasi                |
| ---------- | -------------- | ----------------------------------------------------------------------------------- | --------- | ----------------------- |
| BR-SAAS-01 | Plan Limit     | Fitur dibatasi sesuai plan yang aktif (free/pro/enterprise)                         | Critical  | Feature flag check      |
| BR-SAAS-02 | Trial Period   | Masa trial berakhir otomatis, user diminta upgrade atau kehilangan akses premium    | High      | Cron job + notification |
| BR-SAAS-03 | Plan Upgrade   | Upgrade plan berlaku langsung, biaya dihitung prorata                               | High      | Billing calculation     |
| BR-SAAS-04 | Plan Downgrade | Downgrade berlaku di akhir billing period, fitur premium tetap aktif sampai expired | Medium    | Scheduled job           |

### Billing & Invoice

| ID         | Aturan             | Deskripsi                                                 | Prioritas | Validasi                   |
| ---------- | ------------------ | --------------------------------------------------------- | --------- | -------------------------- |
| BR-SAAS-05 | Auto Renewal       | Subscription di-renew otomatis kecuali user membatalkan   | Critical  | Payment gateway webhook    |
| BR-SAAS-06 | Failed Payment     | 3x gagal bayar berturut-turut → akun di-downgrade ke free | High      | Retry logic + grace period |
| BR-SAAS-07 | Invoice Generation | Invoice dibuat otomatis setelah pembayaran berhasil       | High      | Post-payment hook          |
| BR-SAAS-08 | Refund Policy      | Refund tersedia dalam 7 hari pertama subscription baru    | Medium    | Date check                 |

### Usage & Quota

| ID         | Aturan         | Deskripsi                                            | Prioritas | Validasi        |
| ---------- | -------------- | ---------------------------------------------------- | --------- | --------------- |
| BR-SAAS-09 | Usage Tracking | Penggunaan resource dihitung real-time per tenant    | Critical  | Meter + counter |
| BR-SAAS-10 | Quota Warning  | Peringatan dikirim saat usage mencapai 80% quota     | Medium    | Threshold check |
| BR-SAAS-11 | Quota Exceeded | Akses ditolak atau di-throttle saat quota terlampaui | High      | Rate limiter    |

{{/if}}

{{#if isBooking}}

---

## Aturan Booking & Reservasi

### Ketersediaan

| ID       | Aturan            | Deskripsi                                                          | Prioritas | Validasi              |
| -------- | ----------------- | ------------------------------------------------------------------ | --------- | --------------------- |
| BR-BK-01 | Slot Availability | Slot hanya bisa dipesan jika tersedia (no double booking)          | Critical  | Optimistic lock       |
| BR-BK-02 | Booking Window    | Pemesanan hanya bisa dilakukan dalam rentang waktu yang ditentukan | High      | Date range validation |
| BR-BK-03 | Minimum Lead Time | Pemesanan minimal H-X jam/hari sebelum jadwal                      | Medium    | Time check            |
| BR-BK-04 | Operating Hours   | Booking hanya tersedia dalam jam operasional                       | High      | Schedule config       |

### Pembatalan & Reschedule

| ID       | Aturan              | Deskripsi                                                    | Prioritas | Validasi               |
| -------- | ------------------- | ------------------------------------------------------------ | --------- | ---------------------- |
| BR-BK-05 | Cancellation Policy | Pembatalan gratis jika H-24 jam, setelah itu dikenakan biaya | High      | Time-based calculation |
| BR-BK-06 | Reschedule Limit    | Maksimal 2x reschedule per booking                           | Medium    | Counter per booking    |
| BR-BK-07 | No Show             | Booking otomatis dibatalkan jika user tidak hadir (no-show)  | High      | Status update          |
| BR-BK-08 | Refund on Cancel    | Refund otomatis sesuai kebijakan pembatalan yang berlaku     | High      | Refund calculation     |

{{/if}}

{{#if hasPayments}}

---

## Aturan Pembayaran

| ID        | Aturan               | Deskripsi                                                          | Prioritas | Validasi                 |
| --------- | -------------------- | ------------------------------------------------------------------ | --------- | ------------------------ |
| BR-PAY-01 | Idempotent Payment   | Setiap transaksi memiliki idempotency key untuk mencegah duplikasi | Critical  | Unique constraint        |
| BR-PAY-02 | Payment Verification | Status pembayaran diverifikasi via webhook, bukan client-side      | Critical  | Server-side verification |
| BR-PAY-03 | Currency Consistency | Mata uang konsisten dalam satu transaksi (default: IDR)            | High      | Validation               |
| BR-PAY-04 | Payment Timeout      | Pembayaran pending expired setelah waktu yang ditentukan           | High      | Scheduled check          |
| BR-PAY-05 | Reconciliation       | Rekonsiliasi otomatis antara data internal dan payment gateway     | Critical  | Daily batch job          |

{{/if}}

{{#if hasUploads}}

---

## Aturan Upload File

| ID        | Aturan              | Deskripsi                                                      | Prioritas | Validasi              |
| --------- | ------------------- | -------------------------------------------------------------- | --------- | --------------------- |
| BR-UPL-01 | File Type Whitelist | Hanya tipe file yang diizinkan yang bisa diupload              | Critical  | MIME type check       |
| BR-UPL-02 | File Size Limit     | Ukuran file dibatasi sesuai konfigurasi per tipe               | High      | Size validation       |
| BR-UPL-03 | Malware Scan        | File di-scan sebelum disimpan ke storage                       | Critical  | Antivirus integration |
| BR-UPL-04 | Unique Filename     | File disimpan dengan nama unik (UUID) untuk mencegah collision | Medium    | UUID generation       |

{{/if}}

---

## Matriks Validasi

| Layer              | Tanggung Jawab                  | Contoh                                           |
| ------------------ | ------------------------------- | ------------------------------------------------ |
| **Frontend**       | UX feedback cepat, format input | Disable tombol jika form invalid                 |
| **API**            | Validasi bisnis, autentikasi    | Reject request jika quota terlampaui             |
| **Database**       | Constraint integritas data      | Unique constraint, foreign key, check constraint |
| **Background Job** | Konsistensi eventual            | Reconciliation, cleanup expired data             |

---

## Catatan Implementasi

{{#each assumptions}}
- {{this}}
{{/each}}

> Aturan bisnis ini harus di-review berkala dan diperbarui sesuai perubahan kebutuhan bisnis **{{projectName}}**.
