# Spesifikasi Integrasi Eksternal — {{projectName}}

> Dokumen ini mendefinisikan seluruh integrasi layanan pihak ketiga yang digunakan oleh **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Inventaris Integrasi

### Integrasi Inti

| ID     | Layanan             | Tujuan               | Provider                         | Auth Method       | Prioritas |
| ------ | ------------------- | -------------------- | -------------------------------- | ----------------- | --------- |
| INT-01 | Hosting             | Deployment & serving | Vercel / AWS / GCP               | API Key           | Critical  |
| INT-02 | Database            | Data persistence     | Supabase / PlanetScale / AWS RDS | Connection string | Critical  |
| INT-03 | Email Transactional | Kirim email otomatis | Resend / SendGrid / AWS SES      | API Key           | Critical  |
| INT-04 | DNS                 | Domain management    | Cloudflare / Route53             | API Key           | Critical  |

{{#if hasAuth}}

### Integrasi Autentikasi

| ID          | Layanan        | Tujuan                   | Provider         | Auth Method         | Prioritas |
| ----------- | -------------- | ------------------------ | ---------------- | ------------------- | --------- |
| INT-AUTH-01 | OAuth Provider | Social login             | Google OAuth 2.0 | Client ID + Secret  | High      |
| INT-AUTH-02 | OAuth Provider | Social login (opsional)  | GitHub OAuth     | Client ID + Secret  | Low       |
| INT-AUTH-03 | SMTP           | Email verifikasi & reset | SMTP provider    | Username + Password | High      |

{{/if}}

{{#if hasPayments}}

### Integrasi Pembayaran

| ID         | Layanan         | Tujuan                     | Provider          | Auth Method                  | Prioritas |
| ---------- | --------------- | -------------------------- | ----------------- | ---------------------------- | --------- |
| INT-PAY-01 | Payment Gateway | Proses pembayaran          | Midtrans          | Server Key + Client Key      | Critical  |
| INT-PAY-02 | Payment Gateway | Alternatif / internasional | Stripe            | Secret Key + Publishable Key | Medium    |
| INT-PAY-03 | Invoice         | Generate invoice PDF       | Internal / Xendit | API Key                      | Medium    |

{{/if}}

{{#if hasUploads}}

### Integrasi Storage

| ID         | Layanan          | Tujuan                  | Provider                                  | Auth Method         | Prioritas |
| ---------- | ---------------- | ----------------------- | ----------------------------------------- | ------------------- | --------- |
| INT-STR-01 | Object Storage   | File upload & serving   | AWS S3 / Cloudflare R2 / Supabase Storage | Access Key + Secret | High      |
| INT-STR-02 | CDN              | Asset delivery          | Cloudflare / CloudFront                   | API Key             | High      |
| INT-STR-03 | Image Processing | Resize, optimize gambar | Cloudinary / imgproxy                     | API Key             | Medium    |

{{/if}}

{{#if hasAnalytics}}

### Integrasi Analitik

| ID         | Layanan        | Tujuan              | Provider                             | Auth Method              | Prioritas |
| ---------- | -------------- | ------------------- | ------------------------------------ | ------------------------ | --------- |
| INT-ANA-01 | Web Analytics  | Tracking penggunaan | Google Analytics / Plausible / Umami | Measurement ID / API Key | Medium    |
| INT-ANA-02 | Error Tracking | Monitor error       | Sentry                               | DSN                      | High      |
| INT-ANA-03 | Performance    | Monitor performa    | Vercel Analytics / New Relic         | API Key                  | Medium    |

{{/if}}

{{#if hasNotifications}}

### Integrasi Notifikasi

| ID         | Layanan           | Tujuan                 | Provider                             | Auth Method      | Prioritas |
| ---------- | ----------------- | ---------------------- | ------------------------------------ | ---------------- | --------- |
| INT-NTF-01 | Push Notification | Browser/mobile push    | Firebase Cloud Messaging / OneSignal | API Key          | Medium    |
| INT-NTF-02 | SMS               | OTP, notifikasi urgent | Twilio / Zenziva                     | API Key + Secret | Low       |
| INT-NTF-03 | Email Marketing   | Newsletter, campaign   | Mailchimp / ConvertKit               | API Key          | Low       |

{{/if}}

{{#if hasSearch}}

### Integrasi Pencarian

| ID         | Layanan       | Tujuan           | Provider                          | Auth Method | Prioritas |
| ---------- | ------------- | ---------------- | --------------------------------- | ----------- | --------- |
| INT-SRC-01 | Search Engine | Full-text search | Algolia / Meilisearch / Typesense | API Key     | High      |

{{/if}}

{{#if hasAiFeatures}}

### Integrasi AI

| ID        | Layanan         | Tujuan                     | Provider                              | Auth Method | Prioritas |
| --------- | --------------- | -------------------------- | ------------------------------------- | ----------- | --------- |
| INT-AI-01 | LLM API         | Fitur AI utama             | OpenAI / Anthropic                    | API Key     | High      |
| INT-AI-02 | Embedding       | Vector search / similarity | OpenAI Embeddings                     | API Key     | Medium    |
| INT-AI-03 | Vector Database | Simpan embedding           | Pinecone / Qdrant / Supabase pgvector | API Key     | Medium    |

{{/if}}

{{#if hasRealtime}}

### Integrasi Realtime

| ID        | Layanan   | Tujuan           | Provider                          | Auth Method | Prioritas |
| --------- | --------- | ---------------- | --------------------------------- | ----------- | --------- |
| INT-RT-01 | WebSocket | Realtime updates | Supabase Realtime / Pusher / Ably | API Key     | High      |

{{/if}}

{{#if hasI18n}}

### Integrasi Internationalization

| ID          | Layanan                | Tujuan            | Provider           | Auth Method | Prioritas |
| ----------- | ---------------------- | ----------------- | ------------------ | ----------- | --------- |
| INT-I18N-01 | Translation Management | Kelola terjemahan | Crowdin / Lokalise | API Key     | Medium    |

{{/if}}

---

## Arsitektur Integrasi

```
{{projectName}} Backend
    │
    ├── Auth ──────── OAuth Providers (Google, GitHub)
    ├── Database ──── PostgreSQL / MySQL
    ├── Cache ─────── Redis
    ├── Storage ────── S3 / R2 / Supabase Storage
    ├── Email ─────── Resend / SendGrid
    │{{#if hasPayments}}
    ├── Payment ────── Midtrans / Stripe (webhook)
    │{{/if}}{{#if hasAnalytics}}
    ├── Analytics ──── GA / Plausible
    │{{/if}}{{#if hasNotifications}}
    ├── Push ───────── FCM / OneSignal
    │{{/if}}{{#if hasSearch}}
    ├── Search ─────── Algolia / Meilisearch
    │{{/if}}{{#if hasAiFeatures}}
    ├── AI ──────────── OpenAI / Anthropic
    │{{/if}}
    └── Monitoring ──── Sentry / Logging
```

---

## Strategi Integrasi

### Error Handling

| Strategi            | Implementasi                                     |
| ------------------- | ------------------------------------------------ |
| **Retry**           | Exponential backoff (3 attempts, 1s → 2s → 4s)   |
| **Circuit Breaker** | Open setelah 5 failures, half-open setelah 30s   |
| **Fallback**        | Graceful degradation jika service tidak tersedia |
| **Timeout**         | Maks 10s per external call                       |
| **Logging**         | Log semua external call (tanpa sensitive data)   |

### Rate Limit Awareness

| Provider     | Rate Limit            | Strategi             |
| ------------ | --------------------- | -------------------- |
| OpenAI       | Per model, per minute | Queue + rate limiter |
| Midtrans     | 100 req/s             | Unlikely to hit      |
| Google OAuth | 10,000/day            | Unlikely to hit      |
| Resend       | 100 email/day (free)  | Queue + batch        |
| Sentry       | 5,000 events/hour     | Sampling             |

---

## Environment Variables

| Variable         | Integrasi  | Deskripsi         |
| ---------------- | ---------- | ----------------- |
| `DATABASE_URL`   | Database   | Connection string |
| `REDIS_URL`      | Cache      | Redis connection  |
| `SMTP_HOST`      | Email      | SMTP server       |
| `SMTP_PORT`      | Email      | SMTP port         |
| `SMTP_USER`      | Email      | SMTP username     |
| `SMTP_PASS`      | Email      | SMTP password     |
| `RESEND_API_KEY` | Email      | Resend API key    |
| `SENTRY_DSN`     | Monitoring | Sentry DSN        |
{{#if hasAuth}}
| `GOOGLE_CLIENT_ID` | OAuth | Google client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google client secret |
{{/if}}
{{#if hasPayments}}
| `MIDTRANS_SERVER_KEY` | Payment | Midtrans server key |
| `MIDTRANS_CLIENT_KEY` | Payment | Midtrans client key |
{{/if}}
{{#if hasUploads}}
| `S3_BUCKET` | Storage | Bucket name |
| `S3_REGION` | Storage | Region |
| `S3_ACCESS_KEY` | Storage | Access key |
| `S3_SECRET_KEY` | Storage | Secret key |
{{/if}}
{{#if hasAnalytics}}
| `GA_MEASUREMENT_ID` | Analytics | Google Analytics ID |
{{/if}}
{{#if hasAiFeatures}}
| `OPENAI_API_KEY` | AI | OpenAI API key |
{{/if}}

---

## Health Check

Semua integrasi harus memiliki health check:

| Integrasi    | Check                    | Interval | Timeout |
| ------------ | ------------------------ | -------- | ------- |
| Database     | `SELECT 1`               | 30s      | 5s      |
| Redis        | `PING`                   | 30s      | 3s      |
| External API | HTTP GET health endpoint | 60s      | 10s     |
| Storage      | List bucket              | 300s     | 10s     |

**Endpoint:** `GET /api/health` menampilkan status semua integrasi.

---

> Semua API key dan credential harus disimpan di environment variables atau secret manager, bukan di source code **{{projectName}}**.
