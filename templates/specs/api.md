# API Specification — {{projectName}}

> Dokumen ini mendefinisikan seluruh API endpoint untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Konvensi API

| Aspek            | Standar                                                 |
| ---------------- | ------------------------------------------------------- |
| **Base URL**     | `/api/v1`                                               |
| **Format**       | JSON (request & response)                               |
| **Auth**         | Bearer Token (JWT) di header `Authorization`            |
| **Pagination**   | Query param `?page=1&per_page=20`                       |
| **Sorting**      | Query param `?sort=created_at&order=desc`               |
| **Filtering**    | Query param `?status=active&category=xxx`               |
| **Error Format** | `{ "error": { "code": "ERR_CODE", "message": "..." } }` |
| **Rate Limit**   | Header `X-RateLimit-Limit`, `X-RateLimit-Remaining`     |

### HTTP Status Code

| Code  | Penggunaan                                 |
| ----- | ------------------------------------------ |
| `200` | OK — request berhasil                      |
| `201` | Created — resource berhasil dibuat         |
| `204` | No Content — berhasil tanpa response body  |
| `400` | Bad Request — input tidak valid            |
| `401` | Unauthorized — belum login / token invalid |
| `403` | Forbidden — tidak punya akses              |
| `404` | Not Found — resource tidak ditemukan       |
| `409` | Conflict — duplikasi / konflik data        |
| `422` | Unprocessable Entity — validasi gagal      |
| `429` | Too Many Requests — rate limit             |
| `500` | Internal Server Error                      |

---

## Endpoint Umum

### Health & Info

| Method | Path           | Auth | Deskripsi      |
| ------ | -------------- | ---- | -------------- |
| `GET`  | `/api/health`  | No   | Status server  |
| `GET`  | `/api/v1/info` | No   | Info versi API |

#### `GET /api/health`

**Response 200:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

{{#if hasAuth}}

---

## Endpoint Autentikasi

| Method | Path                           | Auth | Deskripsi                   |
| ------ | ------------------------------ | ---- | --------------------------- |
| `POST` | `/api/v1/auth/register`        | No   | Registrasi user baru        |
| `POST` | `/api/v1/auth/login`           | No   | Login                       |
| `POST` | `/api/v1/auth/logout`          | Yes  | Logout                      |
| `POST` | `/api/v1/auth/refresh`         | Yes  | Refresh token               |
| `POST` | `/api/v1/auth/forgot-password` | No   | Request reset password      |
| `POST` | `/api/v1/auth/reset-password`  | No   | Reset password dengan token |
| `POST` | `/api/v1/auth/verify-email`    | No   | Verifikasi email            |
| `GET`  | `/api/v1/auth/me`              | Yes  | Profil user yang login      |
| `PUT`  | `/api/v1/auth/me`              | Yes  | Update profil               |
| `PUT`  | `/api/v1/auth/change-password` | Yes  | Ganti password              |

#### `POST /api/v1/auth/register`

**Request:**

```json
{
  "name": "string (required)",
  "email": "string (required, email format)",
  "password": "string (required, min 8 chars)"
}
```

**Response 201:**

```json
{
  "data": {
    "user": { "id": "uuid", "name": "...", "email": "..." },
    "message": "Silakan verifikasi email Anda"
  }
}
```

#### `POST /api/v1/auth/login`

**Request:**

```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response 200:**

```json
{
  "data": {
    "user": { "id": "uuid", "name": "...", "email": "...", "role": "..." },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

**Error 401:**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email atau password salah"
  }
}
```

{{/if}}

{{#if isEcommerce}}

---

## Endpoint E-Commerce

### Produk

| Method   | Path                     | Auth  | Deskripsi                 |
| -------- | ------------------------ | ----- | ------------------------- |
| `GET`    | `/api/v1/products`       | No    | Daftar produk (paginated) |
| `GET`    | `/api/v1/products/:slug` | No    | Detail produk             |
| `POST`   | `/api/v1/products`       | Admin | Buat produk baru          |
| `PUT`    | `/api/v1/products/:id`   | Admin | Update produk             |
| `DELETE` | `/api/v1/products/:id`   | Admin | Hapus produk (soft)       |
| `GET`    | `/api/v1/categories`     | No    | Daftar kategori           |

#### `GET /api/v1/products`

**Query Parameters:**

- `page` (int) — Halaman, default 1
- `per_page` (int) — Item per halaman, default 20, max 100
- `category` (string) — Filter kategori slug
- `search` (string) — Cari berdasarkan nama
- `sort` (string) — `price`, `created_at`, `name`
- `order` (string) — `asc`, `desc`
- `min_price` (number) — Harga minimum
- `max_price` (number) — Harga maksimum

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "...",
      "slug": "...",
      "price": 150000,
      "discount_price": null,
      "image": "url",
      "category": { "id": "uuid", "name": "..." },
      "in_stock": true
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Keranjang

| Method   | Path                     | Auth | Deskripsi           |
| -------- | ------------------------ | ---- | ------------------- |
| `GET`    | `/api/v1/cart`           | Yes  | Ambil keranjang     |
| `POST`   | `/api/v1/cart/items`     | Yes  | Tambah item         |
| `PUT`    | `/api/v1/cart/items/:id` | Yes  | Update quantity     |
| `DELETE` | `/api/v1/cart/items/:id` | Yes  | Hapus item          |
| `DELETE` | `/api/v1/cart`           | Yes  | Kosongkan keranjang |

### Pesanan

| Method | Path                              | Auth  | Deskripsi               |
| ------ | --------------------------------- | ----- | ----------------------- |
| `POST` | `/api/v1/orders`                  | Yes   | Buat pesanan (checkout) |
| `GET`  | `/api/v1/orders`                  | Yes   | Daftar pesanan user     |
| `GET`  | `/api/v1/orders/:id`              | Owner | Detail pesanan          |
| `PUT`  | `/api/v1/orders/:id/cancel`       | Owner | Batalkan pesanan        |
| `GET`  | `/api/v1/admin/orders`            | Admin | Semua pesanan           |
| `PUT`  | `/api/v1/admin/orders/:id/status` | Admin | Update status           |

{{/if}}

{{#if isSaas}}

---

## Endpoint SaaS

### Organisasi

| Method   | Path                        | Auth   | Deskripsi         |
| -------- | --------------------------- | ------ | ----------------- |
| `POST`   | `/api/v1/organizations`     | Yes    | Buat organisasi   |
| `GET`    | `/api/v1/organizations/:id` | Member | Detail organisasi |
| `PUT`    | `/api/v1/organizations/:id` | Admin  | Update organisasi |
| `DELETE` | `/api/v1/organizations/:id` | Owner  | Hapus organisasi  |

### Anggota Tim

| Method   | Path                                        | Auth   | Deskripsi      |
| -------- | ------------------------------------------- | ------ | -------------- |
| `GET`    | `/api/v1/organizations/:id/members`         | Member | Daftar anggota |
| `POST`   | `/api/v1/organizations/:id/invitations`     | Admin  | Undang anggota |
| `PUT`    | `/api/v1/organizations/:id/members/:userId` | Admin  | Update role    |
| `DELETE` | `/api/v1/organizations/:id/members/:userId` | Admin  | Hapus anggota  |

### Subscription & Billing

| Method   | Path                           | Auth   | Deskripsi           |
| -------- | ------------------------------ | ------ | ------------------- |
| `GET`    | `/api/v1/billing/subscription` | Owner  | Detail subscription |
| `POST`   | `/api/v1/billing/subscribe`    | Owner  | Mulai subscription  |
| `PUT`    | `/api/v1/billing/subscription` | Owner  | Update plan         |
| `DELETE` | `/api/v1/billing/subscription` | Owner  | Cancel subscription |
| `GET`    | `/api/v1/billing/invoices`     | Owner  | Daftar invoice      |
| `GET`    | `/api/v1/billing/usage`        | Member | Statistik usage     |

{{/if}}

{{#if isBooking}}

---

## Endpoint Booking

| Method | Path                                | Auth  | Deskripsi           |
| ------ | ----------------------------------- | ----- | ------------------- |
| `GET`  | `/api/v1/services`                  | No    | Daftar layanan      |
| `GET`  | `/api/v1/services/:slug`            | No    | Detail layanan      |
| `GET`  | `/api/v1/services/:id/availability` | No    | Cek ketersediaan    |
| `POST` | `/api/v1/bookings`                  | Yes   | Buat booking        |
| `GET`  | `/api/v1/bookings`                  | Yes   | Daftar booking user |
| `GET`  | `/api/v1/bookings/:id`              | Owner | Detail booking      |
| `PUT`  | `/api/v1/bookings/:id/reschedule`   | Owner | Reschedule          |
| `PUT`  | `/api/v1/bookings/:id/cancel`       | Owner | Batalkan booking    |

#### `GET /api/v1/services/:id/availability`

**Query Parameters:**

- `date` (string, YYYY-MM-DD) — Tanggal yang dicek

**Response 200:**

```json
{
  "data": {
    "date": "2024-03-15",
    "slots": [
      { "start": "09:00", "end": "10:00", "available": true, "remaining": 3 },
      { "start": "10:00", "end": "11:00", "available": false, "remaining": 0 }
    ]
  }
}
```

{{/if}}

{{#if hasPayments}}

---

## Endpoint Pembayaran

| Method | Path                       | Auth  | Deskripsi            |
| ------ | -------------------------- | ----- | -------------------- |
| `POST` | `/api/v1/payments`         | Yes   | Inisiasi pembayaran  |
| `GET`  | `/api/v1/payments/:id`     | Owner | Status pembayaran    |
| `GET`  | `/api/v1/payments`         | Yes   | Riwayat pembayaran   |
| `POST` | `/api/v1/payments/webhook` | No*   | Webhook dari gateway |

> *Webhook divalidasi via signature verification, bukan Bearer token.

#### `POST /api/v1/payments`

**Request:**

```json
{
  "payable_type": "order",
  "payable_id": "uuid",
  "method": "bank_transfer",
  "idempotency_key": "unique-key-xxx"
}
```

**Response 201:**

```json
{
  "data": {
    "payment_id": "uuid",
    "gateway_url": "https://payment-gateway.com/checkout/xxx",
    "expires_at": "2024-03-15T12:00:00Z"
  }
}
```

{{/if}}

{{#if hasCms}}

---

## Endpoint CMS

| Method   | Path                              | Auth  | Deskripsi               |
| -------- | --------------------------------- | ----- | ----------------------- |
| `GET`    | `/api/v1/posts`                   | No    | Daftar post (published) |
| `GET`    | `/api/v1/posts/:slug`             | No    | Detail post             |
| `POST`   | `/api/v1/admin/posts`             | Admin | Buat post               |
| `PUT`    | `/api/v1/admin/posts/:id`         | Admin | Update post             |
| `DELETE` | `/api/v1/admin/posts/:id`         | Admin | Hapus post              |
| `PUT`    | `/api/v1/admin/posts/:id/publish` | Admin | Publish post            |
| `GET`    | `/api/v1/post-categories`         | No    | Daftar kategori         |
| `GET`    | `/api/v1/tags`                    | No    | Daftar tag              |

{{/if}}

{{#if hasUploads}}

---

## Endpoint Upload

| Method   | Path                  | Auth  | Deskripsi   |
| -------- | --------------------- | ----- | ----------- |
| `POST`   | `/api/v1/uploads`     | Yes   | Upload file |
| `GET`    | `/api/v1/uploads/:id` | Owner | Detail file |
| `DELETE` | `/api/v1/uploads/:id` | Owner | Hapus file  |

#### `POST /api/v1/uploads`

**Request:** `multipart/form-data`

- `file` — File yang diupload
- `context` (string, optional) — avatar/document/image

**Response 201:**

```json
{
  "data": {
    "id": "uuid",
    "url": "https://storage.example.com/files/xxx.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 245000,
    "original_name": "photo.jpg"
  }
}
```

{{/if}}

{{#if hasSearch}}

---

## Endpoint Pencarian

| Method | Path             | Auth | Deskripsi        |
| ------ | ---------------- | ---- | ---------------- |
| `GET`  | `/api/v1/search` | No   | Pencarian global |

#### `GET /api/v1/search`

**Query Parameters:**

- `q` (string, required) — Query pencarian
- `type` (string) — Filter tipe (product/post/service)
- `page` (int) — Halaman
- `per_page` (int) — Per halaman

**Response 200:**

```json
{
  "data": {
    "results": [
      {
        "type": "product",
        "id": "uuid",
        "title": "...",
        "url": "/products/...",
        "snippet": "..."
      }
    ],
    "meta": { "total": 42, "query": "...", "took_ms": 15 }
  }
}
```

{{/if}}

{{#if hasNotifications}}

---

## Endpoint Notifikasi

| Method   | Path                                 | Auth | Deskripsi           |
| -------- | ------------------------------------ | ---- | ------------------- |
| `GET`    | `/api/v1/notifications`              | Yes  | Daftar notifikasi   |
| `GET`    | `/api/v1/notifications/unread-count` | Yes  | Jumlah belum dibaca |
| `PUT`    | `/api/v1/notifications/:id/read`     | Yes  | Tandai dibaca       |
| `PUT`    | `/api/v1/notifications/read-all`     | Yes  | Tandai semua dibaca |
| `DELETE` | `/api/v1/notifications/:id`          | Yes  | Hapus notifikasi    |

{{/if}}

{{#if hasAdmin}}

---

## Endpoint Admin

| Method | Path                          | Auth  | Deskripsi           |
| ------ | ----------------------------- | ----- | ------------------- |
| `GET`  | `/api/v1/admin/dashboard`     | Admin | Statistik dashboard |
| `GET`  | `/api/v1/admin/users`         | Admin | Daftar user         |
| `GET`  | `/api/v1/admin/users/:id`     | Admin | Detail user         |
| `PUT`  | `/api/v1/admin/users/:id`     | Admin | Update user         |
| `PUT`  | `/api/v1/admin/users/:id/ban` | Admin | Ban user            |
| `GET`  | `/api/v1/admin/audit-logs`    | Admin | Audit log           |
| `GET`  | `/api/v1/admin/settings`      | Admin | Pengaturan sistem   |
| `PUT`  | `/api/v1/admin/settings`      | Admin | Update pengaturan   |

{{/if}}

---

## Webhook

{{#if hasPayments}}
### Payment Gateway Webhook

| Event             | Deskripsi           |
| ----------------- | ------------------- |
| `payment.success` | Pembayaran berhasil |
| `payment.failed`  | Pembayaran gagal    |
| `payment.expired` | Pembayaran expired  |
| `refund.success`  | Refund berhasil     |

**Validasi:** Setiap webhook harus divalidasi menggunakan signature dari payment gateway.
{{/if}}

---

## Rate Limiting

| Endpoint Group        | Limit    | Window   |
| --------------------- | -------- | -------- |
| Auth (login/register) | 10 req   | 15 menit |
| Public API            | 100 req  | 1 menit  |
| Authenticated API     | 300 req  | 1 menit  |
| Admin API             | 500 req  | 1 menit  |
| Upload                | 20 req   | 1 menit  |
| Webhook               | 1000 req | 1 menit  |

---

> Dokumentasi API ini harus di-sync dengan implementasi aktual. Gunakan OpenAPI/Swagger untuk auto-generate documentation **{{projectName}}**.
