# Spesifikasi Analytics — {{projectName}}

> Dokumen ini mendefinisikan strategi analytics termasuk event tracking, funnel, tools, dan kepatuhan privasi untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Tools & Stack

### Analytics Tools

| Tool                   | Tujuan                       | Tipe               | Prioritas         |
| ---------------------- | ---------------------------- | ------------------ | ----------------- |
| **Google Analytics 4** | Web analytics umum           | Third-party        | High              |
| **Plausible / Umami**  | Privacy-friendly analytics   | Self-hosted / SaaS | Alternatif        |
| **Mixpanel**           | Product analytics & funnel   | Third-party        | Opsional          |
| **Sentry**             | Error tracking & performance | Third-party        | High              |
| **Vercel Analytics**   | Web Vitals & performance     | Platform           | Jika pakai Vercel |
| **Hotjar / Clarity**   | Session recording & heatmap  | Third-party        | Opsional          |

**Rekomendasi:** GA4 untuk traffic analytics + Sentry untuk error tracking. Pertimbangkan Plausible/Umami jika privasi jadi prioritas.

---

## Event Tracking

### Konvensi Penamaan Event

| Konvensi | Contoh                                          |
| -------- | ----------------------------------------------- |
| Format   | `{object}_{action}` (snake_case)                |
| Object   | `page`, `button`, `form`, `product`, `user`     |
| Action   | `view`, `click`, `submit`, `search`, `purchase` |

### Event Umum (Semua Halaman)

| Event            | Trigger               | Properties                                 |
| ---------------- | --------------------- | ------------------------------------------ |
| `page_view`      | Setiap halaman dimuat | `page_path`, `page_title`, `referrer`      |
| `button_click`   | Klik CTA utama        | `button_id`, `button_text`, `page_path`    |
| `form_submit`    | Form dikirim          | `form_id`, `form_name`, `success`          |
| `form_error`     | Validasi form gagal   | `form_id`, `field`, `error_type`           |
| `error_occur`    | Error terjadi         | `error_code`, `error_message`, `page_path` |
| `outbound_click` | Klik link eksternal   | `url`, `link_text`                         |
| `scroll_depth`   | Scroll milestone      | `depth` (25%, 50%, 75%, 100%)              |
| `time_on_page`   | Waktu di halaman      | `duration_seconds`, `page_path`            |

{{#if hasAuth}}

### Event Autentikasi

| Event                     | Trigger                   | Properties                     |
| ------------------------- | ------------------------- | ------------------------------ |
| `user_register`           | Registrasi berhasil       | `method` (email/google/github) |
| `user_login`              | Login berhasil            | `method`                       |
| `user_logout`             | Logout                    | —                              |
| `password_reset_request`  | Request reset password    | —                              |
| `password_reset_complete` | Password berhasil direset | —                              |
| `profile_update`          | Update profil             | `fields_updated`               |

{{/if}}

{{#if isEcommerce}}

### Event E-Commerce (Enhanced Ecommerce)

| Event               | Trigger                 | Properties                                        |
| ------------------- | ----------------------- | ------------------------------------------------- |
| `product_view`      | Lihat detail produk     | `product_id`, `product_name`, `price`, `category` |
| `product_list_view` | Lihat listing produk    | `list_name`, `products[]`                         |
| `add_to_cart`       | Tambah ke keranjang     | `product_id`, `quantity`, `price`                 |
| `remove_from_cart`  | Hapus dari keranjang    | `product_id`, `quantity`                          |
| `cart_view`         | Buka keranjang          | `items_count`, `cart_total`                       |
| `checkout_begin`    | Mulai checkout          | `items_count`, `cart_total`                       |
| `checkout_shipping` | Isi alamat pengiriman   | `shipping_method`                                 |
| `checkout_payment`  | Pilih metode pembayaran | `payment_method`                                  |
| `purchase`          | Pembelian berhasil      | `order_id`, `total`, `items[]`, `payment_method`  |
| `refund`            | Refund diproses         | `order_id`, `amount`, `reason`                    |
| `product_search`    | Cari produk             | `query`, `results_count`                          |
| `product_filter`    | Filter produk           | `filter_type`, `filter_value`                     |
| `wishlist_add`      | Tambah ke wishlist      | `product_id`                                      |
| `promo_code_apply`  | Apply kode promo        | `code`, `success`, `discount`                     |

{{/if}}

{{#if isSaas}}

### Event SaaS

| Event                 | Trigger               | Properties                       |
| --------------------- | --------------------- | -------------------------------- |
| `onboarding_start`    | Mulai onboarding      | —                                |
| `onboarding_step`     | Selesaikan step       | `step_number`, `step_name`       |
| `onboarding_complete` | Selesaikan onboarding | `duration_seconds`               |
| `onboarding_skip`     | Skip onboarding       | `last_step`                      |
| `feature_use`         | Gunakan fitur         | `feature_name`, `context`        |
| `plan_view`           | Lihat pricing page    | `current_plan`                   |
| `plan_upgrade`        | Upgrade plan          | `from_plan`, `to_plan`, `amount` |
| `plan_downgrade`      | Downgrade plan        | `from_plan`, `to_plan`           |
| `plan_cancel`         | Cancel subscription   | `plan`, `reason`                 |
| `team_invite`         | Undang anggota        | `role`                           |
| `team_accept`         | Terima undangan       | —                                |
| `api_key_create`      | Buat API key          | —                                |
| `quota_warning`       | Kuota hampir penuh    | `resource`, `percentage`         |

{{/if}}

{{#if isBooking}}

### Event Booking

| Event                | Trigger              | Properties                           |
| -------------------- | -------------------- | ------------------------------------ |
| `service_view`       | Lihat detail layanan | `service_id`, `service_name`         |
| `availability_check` | Cek ketersediaan     | `service_id`, `date`                 |
| `booking_start`      | Mulai booking        | `service_id`, `date`, `time`         |
| `booking_complete`   | Booking berhasil     | `booking_id`, `service_id`, `amount` |
| `booking_cancel`     | Batalkan booking     | `booking_id`, `reason`               |
| `booking_reschedule` | Reschedule           | `booking_id`, `old_date`, `new_date` |

{{/if}}

---

## Funnel Analysis

### Funnel Utama

{{#if isEcommerce}}

#### Purchase Funnel

```
1. Homepage Visit
   ↓ (drop-off rate)
2. Product View
   ↓
3. Add to Cart
   ↓
4. Begin Checkout
   ↓
5. Complete Payment
   ↓
6. Order Confirmed
```

| Step                         | Target Conversion |
| ---------------------------- | ----------------- |
| Visit → Product View         | > 40%             |
| Product View → Add to Cart   | > 10%             |
| Add to Cart → Begin Checkout | > 50%             |
| Begin Checkout → Payment     | > 60%             |
| Payment → Confirmed          | > 90%             |
| **Overall**                  | **> 2%**          |

{{/if}}

{{#if isSaas}}

#### Activation Funnel

```
1. Landing Page Visit
   ↓
2. Register
   ↓
3. Email Verified
   ↓
4. Onboarding Complete
   ↓
5. First Value Action (Aha moment)
   ↓
6. Paid Conversion
```

| Step                     | Target Conversion |
| ------------------------ | ----------------- |
| Visit → Register         | > 5%              |
| Register → Verified      | > 70%             |
| Verified → Onboarding    | > 80%             |
| Onboarding → First Value | > 50%             |
| First Value → Paid       | > 10%             |

{{/if}}

{{#if hasAuth}}

#### Registration Funnel

```
1. Landing Page
   ↓
2. Click Register
   ↓
3. Fill Form
   ↓
4. Submit
   ↓
5. Verify Email
   ↓
6. First Login
```

{{/if}}

---

## Dashboard & Reporting

### KPI Dashboard

| Metrik                | Deskripsi                     | Frekuensi |
| --------------------- | ----------------------------- | --------- |
| **DAU/MAU**           | Daily/Monthly Active Users    | Harian    |
| **Bounce Rate**       | % visitor yang langsung pergi | Harian    |
| **Session Duration**  | Rata-rata durasi sesi         | Harian    |
| **Pages per Session** | Rata-rata halaman per sesi    | Harian    |
{{#if isEcommerce}}
| **Conversion Rate** | % visitor yang purchase | Harian |
| **AOV** | Average Order Value | Harian |
| **Cart Abandonment** | % cart yang tidak checkout | Harian |
| **Revenue** | Total pendapatan | Harian |
{{/if}}
{{#if isSaas}}
| **MRR** | Monthly Recurring Revenue | Bulanan |
| **Churn Rate** | % user yang berhenti | Bulanan |
| **LTV** | Lifetime Value per customer | Bulanan |
| **Activation Rate** | % user yang reach aha moment | Mingguan |
{{/if}}
| **Error Rate** | % request yang error | Real-time |
| **Performance** | Core Web Vitals | Harian |

---

## Kepatuhan Privasi

### Prinsip

| Prinsip               | Implementasi                                       |
| --------------------- | -------------------------------------------------- |
| **Consent First**     | Analytics cookie hanya dimuat setelah user consent |
| **Data Minimization** | Hanya track event yang benar-benar dibutuhkan      |
| **Anonymization**     | IP address di-mask, no PII di event properties     |
| **Retention**         | Data analytics dihapus setelah 26 bulan            |
| **Opt-out**           | User bisa menonaktifkan tracking di settings       |

### Cookie Consent Integration

```
Consent Status:
  ├─ Accepted → Load analytics scripts, start tracking
  ├─ Rejected → No analytics scripts, no tracking
  └─ Not yet → Show consent banner, no tracking
```

### Data yang TIDAK Boleh di-Track

| Data               | Alasan        |
| ------------------ | ------------- |
| Password           | Sensitif      |
| Nomor kartu kredit | PCI DSS       |
| Data kesehatan     | Regulasi      |
| Percakapan pribadi | Privasi       |
| PII tanpa consent  | UU PDP / GDPR |

---

## Implementasi Teknis

### Event Layer

```javascript
// Analytics service abstraction
analytics.track("product_view", {
  product_id: "xxx",
  product_name: "Produk A",
  price: 150000,
  category: "Elektronik",
});

// Dikirim ke semua provider yang aktif
// GA4 + Mixpanel + custom backend
```

### Server-Side Events

| Event                | Kenapa Server-Side                      |
| -------------------- | --------------------------------------- |
| `purchase`           | Akurasi — tidak bergantung pada browser |
| `refund`             | Terjadi di backend                      |
| `subscription_renew` | Webhook-driven                          |
| `payment_failed`     | Server event                            |

---

## Environment Variables

| Variable            | Deskripsi                          |
| ------------------- | ---------------------------------- |
| `GA_MEASUREMENT_ID` | Google Analytics 4 Measurement ID  |
| `GA_API_SECRET`     | GA4 API secret (server-side)       |
| `MIXPANEL_TOKEN`    | Mixpanel project token             |
| `SENTRY_DSN`        | Sentry DSN                         |
| `ANALYTICS_ENABLED` | true/false (global kill switch)    |
| `ANALYTICS_DEBUG`   | true/false (log events to console) |

---

> Analytics harus di-setup sebelum launch agar ada baseline data dari hari pertama **{{projectName}}**.
