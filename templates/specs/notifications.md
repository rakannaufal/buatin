# Spesifikasi Notifikasi — {{projectName}}

> Dokumen ini mendefinisikan sistem notifikasi termasuk channel, trigger, template, dan preferensi pengguna untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Channel Notifikasi

| Channel    | Deskripsi                        | Real-time | Persist    | Prioritas     |
| ---------- | -------------------------------- | --------- | ---------- | ------------- |
| **In-App** | Notifikasi di dalam aplikasi     | Ya        | Ya         | Default       |
| **Email**  | Email transactional              | Tidak     | Ya (inbox) | High          |
| **Push**   | Browser/mobile push notification | Ya        | Tidak      | Medium        |
| **SMS**    | Pesan teks (urgent only)         | Ya        | Tidak      | Critical only |

---

## Trigger & Template Notifikasi

### Notifikasi Sistem

| ID         | Event                 | Channel       | Penerima   | Template                                                           |
| ---------- | --------------------- | ------------- | ---------- | ------------------------------------------------------------------ |
| NTF-SYS-01 | Maintenance terjadwal | In-App, Email | Semua user | "{{projectName}} akan maintenance pada {date} pukul {time}."       |
| NTF-SYS-02 | Update fitur baru     | In-App        | Semua user | "Fitur baru: {feature_name}. Coba sekarang!"                       |
| NTF-SYS-03 | Downtime alert        | Email         | Admin      | "Sistem {{projectName}} mengalami gangguan. Tim sedang menangani." |

{{#if hasAuth}}

### Notifikasi Autentikasi

| ID          | Event                  | Channel     | Penerima  | Template                                                    |
| ----------- | ---------------------- | ----------- | --------- | ----------------------------------------------------------- |
| NTF-AUTH-01 | Registrasi berhasil    | Email       | User baru | "Selamat datang di {{projectName}}! Verifikasi email Anda." |
| NTF-AUTH-02 | Email terverifikasi    | In-App      | User      | "Email Anda berhasil diverifikasi."                         |
| NTF-AUTH-03 | Password direset       | Email       | User      | "Password Anda berhasil diubah."                            |
| NTF-AUTH-04 | Login dari device baru | Email, Push | User      | "Login terdeteksi dari {device} di {location}."             |
| NTF-AUTH-05 | Akun terkunci          | Email       | User      | "Akun Anda dikunci sementara karena percobaan login gagal." |

{{/if}}

{{#if isEcommerce}}

### Notifikasi E-Commerce

| ID        | Event               | Channel             | Penerima | Template                                                               |
| --------- | ------------------- | ------------------- | -------- | ---------------------------------------------------------------------- |
| NTF-EC-01 | Order dibuat        | Email, In-App       | Buyer    | "Pesanan #{order_number} berhasil dibuat. Silakan lakukan pembayaran." |
| NTF-EC-02 | Pembayaran berhasil | Email, In-App, Push | Buyer    | "Pembayaran pesanan #{order_number} dikonfirmasi."                     |
| NTF-EC-03 | Pesanan dikirim     | Email, Push         | Buyer    | "Pesanan #{order_number} dalam perjalanan. Resi: {tracking}."          |
| NTF-EC-04 | Pesanan diterima    | In-App              | Buyer    | "Pesanan #{order_number} telah sampai. Beri ulasan!"                   |
| NTF-EC-05 | Stok menipis        | In-App, Email       | Admin    | "Stok {product_name} tersisa {stock} unit."                            |
| NTF-EC-06 | Order baru (admin)  | In-App, Push        | Admin    | "Pesanan baru #{order_number} dari {buyer_name}."                      |
| NTF-EC-07 | Pembayaran expired  | Email               | Buyer    | "Pembayaran pesanan #{order_number} telah expired."                    |
| NTF-EC-08 | Refund diproses     | Email, In-App       | Buyer    | "Refund untuk pesanan #{order_number} sedang diproses."                |

{{/if}}

{{#if isSaas}}

### Notifikasi SaaS

| ID          | Event                | Channel             | Penerima      | Template                                                                     |
| ----------- | -------------------- | ------------------- | ------------- | ---------------------------------------------------------------------------- |
| NTF-SAAS-01 | Trial hampir habis   | Email, In-App, Push | Account Owner | "Trial Anda berakhir dalam {days} hari. Upgrade sekarang."                   |
| NTF-SAAS-02 | Trial berakhir       | Email               | Account Owner | "Masa trial telah berakhir. Upgrade untuk lanjut menggunakan fitur premium." |
| NTF-SAAS-03 | Subscription renewed | Email               | Account Owner | "Subscription berhasil di-renew. Invoice: {invoice_url}."                    |
| NTF-SAAS-04 | Payment failed       | Email, In-App       | Account Owner | "Pembayaran subscription gagal. Update payment method Anda."                 |
| NTF-SAAS-05 | Undangan tim         | Email               | Invitee       | "{inviter} mengundang Anda bergabung ke {org_name} di {{projectName}}."      |
| NTF-SAAS-06 | Quota 80%            | In-App, Email       | Account Owner | "Penggunaan {resource} mencapai 80% dari quota."                             |
| NTF-SAAS-07 | Quota exceeded       | Email, In-App       | Account Owner | "Quota {resource} terlampaui. Upgrade plan atau kurangi penggunaan."         |

{{/if}}

{{#if isBooking}}

### Notifikasi Booking

| ID        | Event                | Channel             | Penerima | Template                                                            |
| --------- | -------------------- | ------------------- | -------- | ------------------------------------------------------------------- |
| NTF-BK-01 | Booking confirmed    | Email, In-App, Push | User     | "Booking #{booking_number} dikonfirmasi untuk {date} pukul {time}." |
| NTF-BK-02 | Reminder H-1         | Email, Push         | User     | "Pengingat: Anda memiliki jadwal besok {date} pukul {time}."        |
| NTF-BK-03 | Reminder H-1jam      | Push                | User     | "Jadwal Anda dimulai dalam 1 jam."                                  |
| NTF-BK-04 | Booking dibatalkan   | Email, In-App       | User     | "Booking #{booking_number} telah dibatalkan."                       |
| NTF-BK-05 | Reschedule berhasil  | Email, In-App       | User     | "Jadwal berhasil diubah ke {new_date} pukul {new_time}."            |
| NTF-BK-06 | Booking baru (admin) | In-App, Push        | Admin    | "Booking baru #{booking_number} dari {user_name}."                  |

{{/if}}

{{#if hasUploads}}

### Notifikasi Upload

| ID         | Event           | Channel       | Penerima | Template                                              |
| ---------- | --------------- | ------------- | -------- | ----------------------------------------------------- |
| NTF-UPL-01 | Upload berhasil | In-App        | User     | "File {filename} berhasil diupload."                  |
| NTF-UPL-02 | Upload ditolak  | In-App        | User     | "File {filename} ditolak: {reason}."                  |
| NTF-UPL-03 | Quota storage   | In-App, Email | User     | "Storage Anda hampir penuh ({percentage}% terpakai)." |

{{/if}}

---

## Preferensi Notifikasi

### Default per Channel

| Kategori      | In-App | Email      | Push  | SMS      |
| ------------- | ------ | ---------- | ----- | -------- |
| Keamanan      | ✅ On  | ✅ On      | ✅ On | Opsional |
| Transaksi     | ✅ On  | ✅ On      | ✅ On | Off      |
| Update produk | ✅ On  | Opsional   | Off   | Off      |
| Marketing     | Off    | Opsional   | Off   | Off      |
| Sistem        | ✅ On  | Admin only | Off   | Off      |

### User Preference UI

Pengguna bisa mengatur preferensi di **Pengaturan → Notifikasi**:

| Opsi         | Deskripsi                                                |
| ------------ | -------------------------------------------------------- |
| Per kategori | Toggle on/off per kategori notifikasi                    |
| Per channel  | Pilih channel untuk tiap kategori                        |
| Quiet hours  | Tidak mengirim push di jam tertentu (misal: 22:00-07:00) |
| Email digest | Rangkuman harian alih-alih per event                     |
| Unsubscribe  | Link unsubscribe di setiap email                         |

---

## Arsitektur Notifikasi

```
Event Trigger
  │
  ├─ Event Bus / Queue
  │
  ├─ Notification Service
  │   ├─ Check user preferences
  │   ├─ Render template
  │   ├─ Route ke channel:
  │   │   ├─ In-App → Database insert + WebSocket push
  │   │   ├─ Email → Email queue → SMTP/API
  │   │   ├─ Push → FCM / OneSignal
  │   │   └─ SMS → SMS provider
  │   └─ Log delivery status
  │
  └─ Track: sent, delivered, read, failed
```

### Delivery Guarantees

| Channel | Guarantee     | Retry                         |
| ------- | ------------- | ----------------------------- |
| In-App  | At least once | No (real-time + persist)      |
| Email   | At least once | 3x dengan exponential backoff |
| Push    | Best effort   | 1x retry                      |
| SMS     | At least once | 2x retry                      |

---

## Email Template

### Struktur Email

```
┌──────────────────────────┐
│ Logo {{projectName}}     │
├──────────────────────────┤
│                          │
│  Halo {user_name},       │
│                          │
│  {konten_notifikasi}     │
│                          │
│  [CTA Button]            │
│                          │
├──────────────────────────┤
│ Footer:                  │
│ - Unsubscribe link       │
│ - Alamat perusahaan      │
│ - Link kebijakan privasi │
└──────────────────────────┘
```

### Design Guidelines

| Aspek          | Standar                                   |
| -------------- | ----------------------------------------- |
| **Width**      | 600px max                                 |
| **Font**       | System font stack                         |
| **CTA Button** | Background: {{primaryColor}}, teks putih  |
| **Footer**     | Include unsubscribe, alamat, privacy link |
| **Responsive** | Mobile-friendly (single column)           |
| **Plain Text** | Selalu sertakan versi plain text          |

---

## Rate Limiting Notifikasi

| Channel | Limit per User | Window   |
| ------- | -------------- | -------- |
| In-App  | 100            | Per hari |
| Email   | 10             | Per jam  |
| Push    | 5              | Per jam  |
| SMS     | 2              | Per hari |

---

## Environment Variables

| Variable             | Deskripsi                    |
| -------------------- | ---------------------------- |
| `NOTIFICATION_QUEUE` | Queue service (Redis/SQS)    |
| `EMAIL_FROM`         | Alamat pengirim default      |
| `EMAIL_FROM_NAME`    | Nama pengirim                |
| `FCM_SERVER_KEY`     | Firebase Cloud Messaging key |
| `ONESIGNAL_APP_ID`   | OneSignal App ID             |
| `ONESIGNAL_API_KEY`  | OneSignal API key            |
| `SMS_PROVIDER`       | Provider SMS                 |
| `SMS_API_KEY`        | API key SMS                  |

---

> Sistem notifikasi harus dites end-to-end sebelum launch, termasuk edge case seperti user tanpa email terverifikasi atau push permission ditolak **{{projectName}}**.
