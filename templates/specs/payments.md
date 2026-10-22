# Spesifikasi Pembayaran — {{projectName}}

> Dokumen ini mendefinisikan integrasi pembayaran, metode, alur checkout, dan penanganan webhook untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Payment Gateway

### Gateway Utama

| Aspek           | Detail                                    |
| --------------- | ----------------------------------------- |
| **Gateway**     | Midtrans (rekomendasi untuk Indonesia)    |
| **Environment** | Sandbox (development) → Production (live) |
| **Integrasi**   | Server-side API (Snap / Core API)         |
| **Dashboard**   | dashboard.midtrans.com                    |
| **Dokumentasi** | docs.midtrans.com                         |

### Gateway Alternatif

| Gateway      | Kelebihan                               | Use Case                        |
| ------------ | --------------------------------------- | ------------------------------- |
| **Midtrans** | Lengkap, lokal Indonesia, QRIS built-in | Default untuk pasar Indonesia   |
| **Xendit**   | API modern, disbursement                | Alternatif, jika butuh payout   |
| **Stripe**   | Global, developer-friendly              | Jika target pasar internasional |
| **Doku**     | Bank lokal lengkap                      | Fallback                        |

---

## Metode Pembayaran

### Metode yang Didukung

| Metode                  | Kategori       | Estimasi Settlement | Prioritas |
| ----------------------- | -------------- | ------------------- | --------- |
| **QRIS**                | Digital Wallet | Instan              | Tinggi    |
| **GoPay**               | E-Wallet       | Instan              | Tinggi    |
| **OVO**                 | E-Wallet       | Instan              | Tinggi    |
| **ShopeePay**           | E-Wallet       | Instan              | Tinggi    |
| **Dana**                | E-Wallet       | Instan              | Tinggi    |
| **BCA Virtual Account** | Bank Transfer  | 1 hari kerja        | Tinggi    |
| **BNI Virtual Account** | Bank Transfer  | 1 hari kerja        | Medium    |
| **BRI Virtual Account** | Bank Transfer  | 1 hari kerja        | Medium    |
| **Mandiri Bill**        | Bank Transfer  | 1 hari kerja        | Medium    |
| **Kartu Kredit/Debit**  | Card           | 1-3 hari kerja      | Medium    |
| **Alfamart**            | Retail         | 1 hari kerja        | Low       |
| **Indomaret**           | Retail         | 1 hari kerja        | Low       |

### Konfigurasi per Metode

| Metode       | Timeout  | Min Amount | Max Amount     | Fee            |
| ------------ | -------- | ---------- | -------------- | -------------- |
| QRIS         | 15 menit | Rp 1.000   | Rp 10.000.000  | ~0.7%          |
| E-Wallet     | 15 menit | Rp 1.000   | Sesuai limit   | ~2%            |
| VA Bank      | 24 jam   | Rp 10.000  | Rp 999.999.999 | Rp 4.000-4.500 |
| Kartu Kredit | 15 menit | Rp 10.000  | Sesuai limit   | ~2.9%          |
| Retail       | 24 jam   | Rp 10.000  | Rp 5.000.000   | Rp 5.000       |

---

## Alur Pembayaran

### Checkout Flow

```
1. User klik "Bayar"
   │
2. Frontend kirim order ke Backend
   │
3. Backend validasi order:
   ├─ Stok tersedia? ─── No → Error "Stok habis"
   ├─ Harga valid? ──── No → Error "Harga berubah"
   └─ Yes
       │
4. Backend buat transaksi di Payment Gateway
   │
5. Backend simpan payment record (status: pending)
   │
6. Backend return payment URL/token ke Frontend
   │
7. Frontend redirect/tampilkan payment page
   │
8. User pilih metode & selesaikan pembayaran
   │
9. Gateway kirim webhook ke Backend
   │
10. Backend verifikasi webhook signature
    ├─ Invalid → Log & reject
    └─ Valid
        │
11. Backend update status payment & order
    │
12. Backend kirim notifikasi ke user
    │
13. User redirect ke halaman sukses/gagal
```

### State Machine Pembayaran

```
[Created] → [Pending] → [Success] → [Refunded]
                │              │
                ├→ [Failed]    └→ [Partially Refunded]
                │
                └→ [Expired]
```

| Status               | Deskripsi                | Aksi                |
| -------------------- | ------------------------ | ------------------- |
| `created`            | Payment record dibuat    | —                   |
| `pending`            | Menunggu pembayaran user | Tampilkan instruksi |
| `success`            | Pembayaran berhasil      | Proses order        |
| `failed`             | Pembayaran gagal         | Opsi retry          |
| `expired`            | Melewati batas waktu     | Buat ulang          |
| `refunded`           | Dana dikembalikan        | Update order        |
| `partially_refunded` | Sebagian dikembalikan    | Update order        |

---

## Webhook Handling

### Endpoint

| Path                                | Method | Auth                   |
| ----------------------------------- | ------ | ---------------------- |
| `/api/v1/payments/webhook/midtrans` | `POST` | Signature verification |
| `/api/v1/payments/webhook/stripe`   | `POST` | Signature verification |

### Webhook Events

| Event                    | Aksi Backend                             |
| ------------------------ | ---------------------------------------- |
| `transaction.settlement` | Update payment → success, proses order   |
| `transaction.pending`    | Update payment → pending                 |
| `transaction.deny`       | Update payment → failed                  |
| `transaction.cancel`     | Update payment → failed, lepas stok      |
| `transaction.expire`     | Update payment → expired, lepas stok     |
| `transaction.refund`     | Update payment → refunded, proses refund |

### Keamanan Webhook

| Aspek                      | Implementasi                                     |
| -------------------------- | ------------------------------------------------ |
| **Signature Verification** | Verifikasi SHA512 signature dari gateway         |
| **Idempotency**            | Cek `idempotency_key` — skip jika sudah diproses |
| **IP Whitelist**           | Hanya terima dari IP gateway (jika tersedia)     |
| **HTTPS**                  | Webhook URL harus HTTPS                          |
| **Retry**                  | Gateway retry jika non-200 response              |
| **Timeout**                | Respond dalam 5 detik, proses async              |
| **Logging**                | Log semua webhook request untuk debugging        |

### Webhook Processing

```
Webhook Received
  → Verify Signature
  → Parse Payload
  → Check Idempotency
    ├─ Already processed → 200 OK (skip)
    └─ New
        → Update Payment Status
        → Update Order/Subscription Status
        → Send Notification
        → 200 OK
```

---

## Keamanan Pembayaran

| Aspek                        | Implementasi                                          |
| ---------------------------- | ----------------------------------------------------- |
| **PCI DSS**                  | Tidak menyimpan data kartu — tokenization via gateway |
| **Idempotency**              | Setiap request pembayaran memiliki unique key         |
| **Double Charge Prevention** | Lock optimistic + idempotency check                   |
| **Amount Validation**        | Server-side recalculation, jangan trust client        |
| **Currency**                 | Hardcode IDR, validasi di server                      |
| **Fraud Detection**          | Monitor anomali (velocity check, amount threshold)    |
| **Logging**                  | Log transaksi tanpa data sensitif                     |

---

## Rekonsiliasi

| Aspek         | Detail                                     |
| ------------- | ------------------------------------------ |
| **Frekuensi** | Harian (otomatis)                          |
| **Sumber**    | Data internal vs settlement report gateway |
| **Alert**     | Notifikasi jika ada discrepancy            |
| **Handling**  | Discrepancy di-review manual oleh finance  |

### Data Rekonsiliasi

| Field          | Internal          | Gateway                  |
| -------------- | ----------------- | ------------------------ |
| Transaction ID | `payment.id`      | `gateway_transaction_id` |
| Amount         | `payment.amount`  | Settlement amount        |
| Status         | `payment.status`  | Gateway status           |
| Timestamp      | `payment.paid_at` | Settlement time          |

---

## Refund

| Aspek               | Detail                                   |
| ------------------- | ---------------------------------------- |
| **Eligible Period** | Sesuai kebijakan (misal: 7 hari)         |
| **Full Refund**     | Seluruh amount dikembalikan              |
| **Partial Refund**  | Sebagian amount dikembalikan             |
| **Processing Time** | 3-14 hari kerja (tergantung metode)      |
| **Initiation**      | Admin via dashboard / auto via kebijakan |

### Refund Flow

1. Admin/sistem inisiasi refund
2. Backend validasi eligibility
3. Backend request refund ke gateway
4. Gateway proses refund
5. Webhook `refund.success` diterima
6. Backend update status payment & order
7. Notifikasi ke user

---

## Environment Variables

| Variable                 | Deskripsi                              |
| ------------------------ | -------------------------------------- |
| `PAYMENT_GATEWAY`        | Gateway aktif (midtrans/stripe/xendit) |
| `MIDTRANS_SERVER_KEY`    | Server key Midtrans                    |
| `MIDTRANS_CLIENT_KEY`    | Client key Midtrans                    |
| `MIDTRANS_IS_PRODUCTION` | true/false                             |
| `STRIPE_SECRET_KEY`      | Stripe secret key                      |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                 |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook signing secret          |
| `PAYMENT_WEBHOOK_URL`    | URL webhook (untuk registrasi)         |

---

## Testing

| Skenario        | Test Case                            |
| --------------- | ------------------------------------ |
| Payment sukses  | Gunakan test card/account gateway    |
| Payment gagal   | Gunakan test card yang ditolak       |
| Payment expired | Biarkan timeout                      |
| Webhook retry   | Simulasi non-200 response            |
| Double payment  | Kirim 2x dengan idempotency key sama |
| Refund          | Refund setelah settlement            |
| Reconciliation  | Inject discrepancy, cek alert        |

---

> Integrasi pembayaran harus diuji menyeluruh di sandbox sebelum go-live. Semua credential harus disimpan di environment variables, bukan di source code **{{projectName}}**.
