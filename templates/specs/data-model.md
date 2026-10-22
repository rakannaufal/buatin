# Data Model — {{projectName}}

> Dokumen ini mendefinisikan model data (database schema) untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

Model data dirancang berdasarkan kebutuhan fitur yang teridentifikasi. Setiap entitas didokumentasikan dengan field, tipe data, dan relasi.

---

## Konvensi

| Konvensi           | Detail                                             |
| ------------------ | -------------------------------------------------- |
| **Penamaan Tabel** | `snake_case`, plural (misal: `users`, `orders`)    |
| **Primary Key**    | `id` — UUID v4 (default) atau auto-increment       |
| **Timestamps**     | Semua tabel memiliki `created_at` dan `updated_at` |
| **Soft Delete**    | Tabel penting memiliki `deleted_at` (nullable)     |
| **Foreign Key**    | `{table_singular}_id` (misal: `user_id`)           |
| **Index**          | Kolom yang sering di-query harus di-index          |

---

## Entitas Inti

### `settings` — Konfigurasi Aplikasi

| Kolom        | Tipe         | Nullable | Default  | Keterangan                 |
| ------------ | ------------ | -------- | -------- | -------------------------- |
| `id`         | UUID         | No       | gen      | Primary key                |
| `key`        | VARCHAR(255) | No       | —        | Unique config key          |
| `value`      | TEXT         | Yes      | NULL     | Config value               |
| `type`       | VARCHAR(50)  | No       | 'string' | string/number/boolean/json |
| `created_at` | TIMESTAMP    | No       | NOW()    | —                          |
| `updated_at` | TIMESTAMP    | No       | NOW()    | —                          |

**Index:** `UNIQUE(key)`

{{#if hasAuth}}

---

## Entitas Autentikasi

### `users` — Pengguna

| Kolom               | Tipe         | Nullable | Default  | Keterangan             |
| ------------------- | ------------ | -------- | -------- | ---------------------- |
| `id`                | UUID         | No       | gen      | Primary key            |
| `name`              | VARCHAR(255) | No       | —        | Nama lengkap           |
| `email`             | VARCHAR(255) | No       | —        | Email (unique)         |
| `email_verified_at` | TIMESTAMP    | Yes      | NULL     | Waktu verifikasi       |
| `password_hash`     | VARCHAR(255) | No       | —        | Bcrypt hash            |
| `avatar_url`        | VARCHAR(500) | Yes      | NULL     | URL foto profil        |
| `role`              | ENUM         | No       | 'member' | admin/editor/member    |
| `status`            | ENUM         | No       | 'active' | active/inactive/banned |
| `last_login_at`     | TIMESTAMP    | Yes      | NULL     | Login terakhir         |
| `login_attempts`    | INT          | No       | 0        | Counter gagal login    |
| `locked_until`      | TIMESTAMP    | Yes      | NULL     | Lock sementara         |
| `created_at`        | TIMESTAMP    | No       | NOW()    | —                      |
| `updated_at`        | TIMESTAMP    | No       | NOW()    | —                      |
| `deleted_at`        | TIMESTAMP    | Yes      | NULL     | Soft delete            |

**Index:** `UNIQUE(email)`, `INDEX(role)`, `INDEX(status)`

### `sessions` — Sesi Aktif

| Kolom        | Tipe         | Nullable | Default | Keterangan         |
| ------------ | ------------ | -------- | ------- | ------------------ |
| `id`         | UUID         | No       | gen     | Primary key        |
| `user_id`    | UUID         | No       | —       | FK → users         |
| `token_hash` | VARCHAR(255) | No       | —       | Hash refresh token |
| `ip_address` | VARCHAR(45)  | Yes      | NULL    | IP saat login      |
| `user_agent` | TEXT         | Yes      | NULL    | Browser/device     |
| `expires_at` | TIMESTAMP    | No       | —       | Masa berlaku       |
| `created_at` | TIMESTAMP    | No       | NOW()   | —                  |

**Index:** `INDEX(user_id)`, `INDEX(expires_at)`

### `password_resets` — Token Reset Password

| Kolom        | Tipe         | Nullable | Default | Keterangan      |
| ------------ | ------------ | -------- | ------- | --------------- |
| `id`         | UUID         | No       | gen     | Primary key     |
| `email`      | VARCHAR(255) | No       | —       | Email user      |
| `token_hash` | VARCHAR(255) | No       | —       | Hash token      |
| `expires_at` | TIMESTAMP    | No       | —       | Masa berlaku    |
| `used_at`    | TIMESTAMP    | Yes      | NULL    | Waktu digunakan |
| `created_at` | TIMESTAMP    | No       | NOW()   | —               |

**Index:** `INDEX(email)`, `INDEX(token_hash)`

{{/if}}

{{#if isEcommerce}}

---

## Entitas E-Commerce

### `categories` — Kategori Produk

| Kolom         | Tipe         | Nullable | Default | Keterangan                 |
| ------------- | ------------ | -------- | ------- | -------------------------- |
| `id`          | UUID         | No       | gen     | Primary key                |
| `parent_id`   | UUID         | Yes      | NULL    | FK → categories (self-ref) |
| `name`        | VARCHAR(255) | No       | —       | Nama kategori              |
| `slug`        | VARCHAR(255) | No       | —       | URL slug                   |
| `description` | TEXT         | Yes      | NULL    | Deskripsi                  |
| `image_url`   | VARCHAR(500) | Yes      | NULL    | Gambar kategori            |
| `sort_order`  | INT          | No       | 0       | Urutan tampil              |
| `is_active`   | BOOLEAN      | No       | TRUE    | Status aktif               |
| `created_at`  | TIMESTAMP    | No       | NOW()   | —                          |
| `updated_at`  | TIMESTAMP    | No       | NOW()   | —                          |

**Index:** `UNIQUE(slug)`, `INDEX(parent_id)`

### `products` — Produk

| Kolom            | Tipe          | Nullable | Default | Keterangan         |
| ---------------- | ------------- | -------- | ------- | ------------------ |
| `id`             | UUID          | No       | gen     | Primary key        |
| `category_id`    | UUID          | Yes      | NULL    | FK → categories    |
| `name`           | VARCHAR(255)  | No       | —       | Nama produk        |
| `slug`           | VARCHAR(255)  | No       | —       | URL slug           |
| `description`    | TEXT          | Yes      | NULL    | Deskripsi          |
| `price`          | DECIMAL(15,2) | No       | —       | Harga (IDR)        |
| `discount_price` | DECIMAL(15,2) | Yes      | NULL    | Harga diskon       |
| `sku`            | VARCHAR(100)  | Yes      | NULL    | Stock Keeping Unit |
| `stock`          | INT           | No       | 0       | Jumlah stok        |
| `weight`         | DECIMAL(10,2) | Yes      | NULL    | Berat (gram)       |
| `is_active`      | BOOLEAN       | No       | TRUE    | Status aktif       |
| `featured`       | BOOLEAN       | No       | FALSE   | Produk unggulan    |
| `created_at`     | TIMESTAMP     | No       | NOW()   | —                  |
| `updated_at`     | TIMESTAMP     | No       | NOW()   | —                  |
| `deleted_at`     | TIMESTAMP     | Yes      | NULL    | Soft delete        |

**Index:** `UNIQUE(slug)`, `UNIQUE(sku)`, `INDEX(category_id)`, `INDEX(is_active, featured)`

### `product_images` — Gambar Produk

| Kolom        | Tipe         | Nullable | Default | Keterangan    |
| ------------ | ------------ | -------- | ------- | ------------- |
| `id`         | UUID         | No       | gen     | Primary key   |
| `product_id` | UUID         | No       | —       | FK → products |
| `url`        | VARCHAR(500) | No       | —       | URL gambar    |
| `alt_text`   | VARCHAR(255) | Yes      | NULL    | Alt text      |
| `sort_order` | INT          | No       | 0       | Urutan        |
| `is_primary` | BOOLEAN      | No       | FALSE   | Gambar utama  |
| `created_at` | TIMESTAMP    | No       | NOW()   | —             |

**Index:** `INDEX(product_id)`

### `orders` — Pesanan

| Kolom              | Tipe          | Nullable | Default   | Keterangan                                                   |
| ------------------ | ------------- | -------- | --------- | ------------------------------------------------------------ |
| `id`               | UUID          | No       | gen       | Primary key                                                  |
| `user_id`          | UUID          | No       | —         | FK → users                                                   |
| `order_number`     | VARCHAR(50)   | No       | —         | Nomor pesanan (unique)                                       |
| `status`           | ENUM          | No       | 'pending' | pending/paid/processing/shipped/delivered/cancelled/refunded |
| `subtotal`         | DECIMAL(15,2) | No       | —         | Subtotal                                                     |
| `shipping_cost`    | DECIMAL(15,2) | No       | 0         | Ongkos kirim                                                 |
| `tax`              | DECIMAL(15,2) | No       | 0         | Pajak                                                        |
| `discount`         | DECIMAL(15,2) | No       | 0         | Diskon                                                       |
| `total`            | DECIMAL(15,2) | No       | —         | Total bayar                                                  |
| `shipping_address` | JSON          | No       | —         | Alamat kirim                                                 |
| `notes`            | TEXT          | Yes      | NULL      | Catatan pembeli                                              |
| `paid_at`          | TIMESTAMP     | Yes      | NULL      | Waktu bayar                                                  |
| `shipped_at`       | TIMESTAMP     | Yes      | NULL      | Waktu kirim                                                  |
| `delivered_at`     | TIMESTAMP     | Yes      | NULL      | Waktu terima                                                 |
| `cancelled_at`     | TIMESTAMP     | Yes      | NULL      | Waktu batal                                                  |
| `created_at`       | TIMESTAMP     | No       | NOW()     | —                                                            |
| `updated_at`       | TIMESTAMP     | No       | NOW()     | —                                                            |

**Index:** `UNIQUE(order_number)`, `INDEX(user_id)`, `INDEX(status)`

### `order_items` — Item Pesanan

| Kolom          | Tipe          | Nullable | Default | Keterangan                   |
| -------------- | ------------- | -------- | ------- | ---------------------------- |
| `id`           | UUID          | No       | gen     | Primary key                  |
| `order_id`     | UUID          | No       | —       | FK → orders                  |
| `product_id`   | UUID          | No       | —       | FK → products                |
| `product_name` | VARCHAR(255)  | No       | —       | Snapshot nama (denormalized) |
| `price`        | DECIMAL(15,2) | No       | —       | Harga saat beli              |
| `quantity`     | INT           | No       | —       | Jumlah                       |
| `subtotal`     | DECIMAL(15,2) | No       | —       | price × quantity             |
| `created_at`   | TIMESTAMP     | No       | NOW()   | —                            |

**Index:** `INDEX(order_id)`, `INDEX(product_id)`

### `carts` — Keranjang

| Kolom        | Tipe         | Nullable | Default | Keterangan                |
| ------------ | ------------ | -------- | ------- | ------------------------- |
| `id`         | UUID         | No       | gen     | Primary key               |
| `user_id`    | UUID         | Yes      | NULL    | FK → users (null = guest) |
| `session_id` | VARCHAR(255) | Yes      | NULL    | Guest cart identifier     |
| `created_at` | TIMESTAMP    | No       | NOW()   | —                         |
| `updated_at` | TIMESTAMP    | No       | NOW()   | —                         |

### `cart_items` — Item Keranjang

| Kolom        | Tipe      | Nullable | Default | Keterangan    |
| ------------ | --------- | -------- | ------- | ------------- |
| `id`         | UUID      | No       | gen     | Primary key   |
| `cart_id`    | UUID      | No       | —       | FK → carts    |
| `product_id` | UUID      | No       | —       | FK → products |
| `quantity`   | INT       | No       | 1       | Jumlah        |
| `created_at` | TIMESTAMP | No       | NOW()   | —             |
| `updated_at` | TIMESTAMP | No       | NOW()   | —             |

**Index:** `INDEX(cart_id)`, `UNIQUE(cart_id, product_id)`

{{/if}}

{{#if isSaas}}

---

## Entitas SaaS

### `organizations` — Organisasi/Workspace

| Kolom           | Tipe         | Nullable | Default | Keterangan          |
| --------------- | ------------ | -------- | ------- | ------------------- |
| `id`            | UUID         | No       | gen     | Primary key         |
| `name`          | VARCHAR(255) | No       | —       | Nama organisasi     |
| `slug`          | VARCHAR(255) | No       | —       | URL slug            |
| `owner_id`      | UUID         | No       | —       | FK → users          |
| `plan`          | ENUM         | No       | 'free'  | free/pro/enterprise |
| `trial_ends_at` | TIMESTAMP    | Yes      | NULL    | Akhir masa trial    |
| `created_at`    | TIMESTAMP    | No       | NOW()   | —                   |
| `updated_at`    | TIMESTAMP    | No       | NOW()   | —                   |
| `deleted_at`    | TIMESTAMP    | Yes      | NULL    | Soft delete         |

**Index:** `UNIQUE(slug)`, `INDEX(owner_id)`, `INDEX(plan)`

### `organization_members` — Anggota Organisasi

| Kolom             | Tipe      | Nullable | Default  | Keterangan                |
| ----------------- | --------- | -------- | -------- | ------------------------- |
| `id`              | UUID      | No       | gen      | Primary key               |
| `organization_id` | UUID      | No       | —        | FK → organizations        |
| `user_id`         | UUID      | No       | —        | FK → users                |
| `role`            | ENUM      | No       | 'member' | owner/admin/member/viewer |
| `invited_at`      | TIMESTAMP | Yes      | NULL     | —                         |
| `joined_at`       | TIMESTAMP | Yes      | NULL     | —                         |
| `created_at`      | TIMESTAMP | No       | NOW()    | —                         |

**Index:** `UNIQUE(organization_id, user_id)`, `INDEX(user_id)`

### `subscriptions` — Langganan

| Kolom                     | Tipe         | Nullable | Default  | Keterangan                         |
| ------------------------- | ------------ | -------- | -------- | ---------------------------------- |
| `id`                      | UUID         | No       | gen      | Primary key                        |
| `organization_id`         | UUID         | No       | —        | FK → organizations                 |
| `plan`                    | VARCHAR(50)  | No       | —        | Kode plan                          |
| `status`                  | ENUM         | No       | 'active' | active/cancelled/past_due/trialing |
| `gateway`                 | VARCHAR(50)  | No       | —        | Payment gateway                    |
| `gateway_subscription_id` | VARCHAR(255) | Yes      | NULL     | ID di gateway                      |
| `current_period_start`    | TIMESTAMP    | No       | —        | Awal periode                       |
| `current_period_end`      | TIMESTAMP    | No       | —        | Akhir periode                      |
| `cancelled_at`            | TIMESTAMP    | Yes      | NULL     | —                                  |
| `created_at`              | TIMESTAMP    | No       | NOW()    | —                                  |
| `updated_at`              | TIMESTAMP    | No       | NOW()    | —                                  |

**Index:** `INDEX(organization_id)`, `INDEX(status)`

### `usage_records` — Catatan Penggunaan

| Kolom             | Tipe         | Nullable | Default | Keterangan          |
| ----------------- | ------------ | -------- | ------- | ------------------- |
| `id`              | UUID         | No       | gen     | Primary key         |
| `organization_id` | UUID         | No       | —       | FK → organizations  |
| `feature`         | VARCHAR(100) | No       | —       | Nama fitur/resource |
| `quantity`        | INT          | No       | —       | Jumlah penggunaan   |
| `recorded_at`     | TIMESTAMP    | No       | NOW()   | —                   |

**Index:** `INDEX(organization_id, feature, recorded_at)`

{{/if}}

{{#if isBooking}}

---

## Entitas Booking

### `services` — Layanan

| Kolom              | Tipe          | Nullable | Default | Keterangan         |
| ------------------ | ------------- | -------- | ------- | ------------------ |
| `id`               | UUID          | No       | gen     | Primary key        |
| `name`             | VARCHAR(255)  | No       | —       | Nama layanan       |
| `slug`             | VARCHAR(255)  | No       | —       | URL slug           |
| `description`      | TEXT          | Yes      | NULL    | Deskripsi          |
| `duration_minutes` | INT           | No       | —       | Durasi (menit)     |
| `price`            | DECIMAL(15,2) | No       | —       | Harga              |
| `max_capacity`     | INT           | No       | 1       | Kapasitas per slot |
| `is_active`        | BOOLEAN       | No       | TRUE    | Status aktif       |
| `created_at`       | TIMESTAMP     | No       | NOW()   | —                  |
| `updated_at`       | TIMESTAMP     | No       | NOW()   | —                  |

**Index:** `UNIQUE(slug)`

### `schedules` — Jadwal Operasional

| Kolom          | Tipe    | Nullable | Default | Keterangan        |
| -------------- | ------- | -------- | ------- | ----------------- |
| `id`           | UUID    | No       | gen     | Primary key       |
| `service_id`   | UUID    | No       | —       | FK → services     |
| `day_of_week`  | INT     | No       | —       | 0=Senin..6=Minggu |
| `start_time`   | TIME    | No       | —       | Jam mulai         |
| `end_time`     | TIME    | No       | —       | Jam selesai       |
| `is_available` | BOOLEAN | No       | TRUE    | —                 |

**Index:** `INDEX(service_id, day_of_week)`

### `bookings` — Pemesanan

| Kolom              | Tipe        | Nullable | Default     | Keterangan                            |
| ------------------ | ----------- | -------- | ----------- | ------------------------------------- |
| `id`               | UUID        | No       | gen         | Primary key                           |
| `user_id`          | UUID        | No       | —           | FK → users                            |
| `service_id`       | UUID        | No       | —           | FK → services                         |
| `booking_number`   | VARCHAR(50) | No       | —           | Nomor booking                         |
| `status`           | ENUM        | No       | 'confirmed' | confirmed/completed/cancelled/no_show |
| `date`             | DATE        | No       | —           | Tanggal booking                       |
| `start_time`       | TIME        | No       | —           | Jam mulai                             |
| `end_time`         | TIME        | No       | —           | Jam selesai                           |
| `notes`            | TEXT        | Yes      | NULL        | Catatan                               |
| `reschedule_count` | INT         | No       | 0           | Jumlah reschedule                     |
| `cancelled_at`     | TIMESTAMP   | Yes      | NULL        | —                                     |
| `created_at`       | TIMESTAMP   | No       | NOW()       | —                                     |
| `updated_at`       | TIMESTAMP   | No       | NOW()       | —                                     |

**Index:** `UNIQUE(booking_number)`, `INDEX(user_id)`, `INDEX(service_id, date)`

{{/if}}

{{#if hasPayments}}

---

## Entitas Pembayaran

### `payments` — Pembayaran

| Kolom                    | Tipe          | Nullable | Default   | Keterangan                                |
| ------------------------ | ------------- | -------- | --------- | ----------------------------------------- |
| `id`                     | UUID          | No       | gen       | Primary key                               |
| `user_id`                | UUID          | No       | —         | FK → users                                |
| `payable_type`           | VARCHAR(50)   | No       | —         | Tipe entitas (order/subscription/booking) |
| `payable_id`             | UUID          | No       | —         | ID entitas terkait                        |
| `gateway`                | VARCHAR(50)   | No       | —         | Payment gateway                           |
| `gateway_transaction_id` | VARCHAR(255)  | Yes      | NULL      | ID transaksi di gateway                   |
| `method`                 | VARCHAR(50)   | No       | —         | Metode bayar                              |
| `amount`                 | DECIMAL(15,2) | No       | —         | Jumlah bayar                              |
| `currency`               | VARCHAR(3)    | No       | 'IDR'     | Mata uang                                 |
| `status`                 | ENUM          | No       | 'pending' | pending/success/failed/expired/refunded   |
| `idempotency_key`        | VARCHAR(255)  | No       | —         | Idempotency key                           |
| `paid_at`                | TIMESTAMP     | Yes      | NULL      | —                                         |
| `expires_at`             | TIMESTAMP     | Yes      | NULL      | Batas waktu bayar                         |
| `metadata`               | JSON          | Yes      | NULL      | Data tambahan dari gateway                |
| `created_at`             | TIMESTAMP     | No       | NOW()     | —                                         |
| `updated_at`             | TIMESTAMP     | No       | NOW()     | —                                         |

**Index:** `UNIQUE(idempotency_key)`, `INDEX(user_id)`, `INDEX(payable_type, payable_id)`, `INDEX(status)`

### `refunds` — Pengembalian Dana

| Kolom               | Tipe          | Nullable | Default   | Keterangan               |
| ------------------- | ------------- | -------- | --------- | ------------------------ |
| `id`                | UUID          | No       | gen       | Primary key              |
| `payment_id`        | UUID          | No       | —         | FK → payments            |
| `amount`            | DECIMAL(15,2) | No       | —         | Jumlah refund            |
| `reason`            | TEXT          | Yes      | NULL      | Alasan refund            |
| `status`            | ENUM          | No       | 'pending' | pending/processed/failed |
| `gateway_refund_id` | VARCHAR(255)  | Yes      | NULL      | ID refund di gateway     |
| `processed_at`      | TIMESTAMP     | Yes      | NULL      | —                        |
| `created_at`        | TIMESTAMP     | No       | NOW()     | —                        |

**Index:** `INDEX(payment_id)`

{{/if}}

{{#if hasCms}}

---

## Entitas CMS

### `posts` — Artikel/Konten

| Kolom              | Tipe         | Nullable | Default | Keterangan               |
| ------------------ | ------------ | -------- | ------- | ------------------------ |
| `id`               | UUID         | No       | gen     | Primary key              |
| `author_id`        | UUID         | No       | —       | FK → users               |
| `category_id`      | UUID         | Yes      | NULL    | FK → post_categories     |
| `title`            | VARCHAR(255) | No       | —       | Judul                    |
| `slug`             | VARCHAR(255) | No       | —       | URL slug                 |
| `excerpt`          | TEXT         | Yes      | NULL    | Ringkasan                |
| `content`          | TEXT         | No       | —       | Konten (HTML/Markdown)   |
| `featured_image`   | VARCHAR(500) | Yes      | NULL    | Gambar utama             |
| `status`           | ENUM         | No       | 'draft' | draft/published/archived |
| `published_at`     | TIMESTAMP    | Yes      | NULL    | —                        |
| `meta_title`       | VARCHAR(255) | Yes      | NULL    | SEO title                |
| `meta_description` | TEXT         | Yes      | NULL    | SEO description          |
| `created_at`       | TIMESTAMP    | No       | NOW()   | —                        |
| `updated_at`       | TIMESTAMP    | No       | NOW()   | —                        |
| `deleted_at`       | TIMESTAMP    | Yes      | NULL    | Soft delete              |

**Index:** `UNIQUE(slug)`, `INDEX(author_id)`, `INDEX(category_id)`, `INDEX(status, published_at)`

### `post_categories` — Kategori Post

| Kolom         | Tipe         | Nullable | Default | Keterangan    |
| ------------- | ------------ | -------- | ------- | ------------- |
| `id`          | UUID         | No       | gen     | Primary key   |
| `name`        | VARCHAR(255) | No       | —       | Nama kategori |
| `slug`        | VARCHAR(255) | No       | —       | URL slug      |
| `description` | TEXT         | Yes      | NULL    | Deskripsi     |
| `created_at`  | TIMESTAMP    | No       | NOW()   | —             |
| `updated_at`  | TIMESTAMP    | No       | NOW()   | —             |

**Index:** `UNIQUE(slug)`

### `tags` — Tag

| Kolom        | Tipe         | Nullable | Default | Keterangan  |
| ------------ | ------------ | -------- | ------- | ----------- |
| `id`         | UUID         | No       | gen     | Primary key |
| `name`       | VARCHAR(100) | No       | —       | Nama tag    |
| `slug`       | VARCHAR(100) | No       | —       | URL slug    |
| `created_at` | TIMESTAMP    | No       | NOW()   | —           |

**Index:** `UNIQUE(slug)`

### `post_tags` — Relasi Post-Tag (M:N)

| Kolom     | Tipe | Nullable | Default | Keterangan |
| --------- | ---- | -------- | ------- | ---------- |
| `post_id` | UUID | No       | —       | FK → posts |
| `tag_id`  | UUID | No       | —       | FK → tags  |

**Index:** `PRIMARY(post_id, tag_id)`

{{/if}}

{{#if hasUploads}}

---

## Entitas Upload

### `files` — File Upload

| Kolom           | Tipe         | Nullable | Default | Keterangan            |
| --------------- | ------------ | -------- | ------- | --------------------- |
| `id`            | UUID         | No       | gen     | Primary key           |
| `user_id`       | UUID         | No       | —       | FK → users (uploader) |
| `original_name` | VARCHAR(255) | No       | —       | Nama file asli        |
| `stored_name`   | VARCHAR(255) | No       | —       | Nama file di storage  |
| `mime_type`     | VARCHAR(100) | No       | —       | MIME type             |
| `size_bytes`    | BIGINT       | No       | —       | Ukuran file           |
| `storage_path`  | VARCHAR(500) | No       | —       | Path di storage       |
| `public_url`    | VARCHAR(500) | Yes      | NULL    | URL publik            |
| `fileable_type` | VARCHAR(50)  | Yes      | NULL    | Tipe entitas pemilik  |
| `fileable_id`   | UUID         | Yes      | NULL    | ID entitas pemilik    |
| `created_at`    | TIMESTAMP    | No       | NOW()   | —                     |
| `deleted_at`    | TIMESTAMP    | Yes      | NULL    | Soft delete           |

**Index:** `INDEX(user_id)`, `INDEX(fileable_type, fileable_id)`

{{/if}}

{{#if hasNotifications}}

---

## Entitas Notifikasi

### `notifications` — Notifikasi

| Kolom        | Tipe         | Nullable | Default  | Keterangan        |
| ------------ | ------------ | -------- | -------- | ----------------- |
| `id`         | UUID         | No       | gen      | Primary key       |
| `user_id`    | UUID         | No       | —        | FK → users        |
| `type`       | VARCHAR(100) | No       | —        | Tipe notifikasi   |
| `title`      | VARCHAR(255) | No       | —        | Judul             |
| `body`       | TEXT         | No       | —        | Isi notifikasi    |
| `data`       | JSON         | Yes      | NULL     | Data tambahan     |
| `channel`    | VARCHAR(50)  | No       | 'in_app' | in_app/email/push |
| `read_at`    | TIMESTAMP    | Yes      | NULL     | Waktu dibaca      |
| `created_at` | TIMESTAMP    | No       | NOW()    | —                 |

**Index:** `INDEX(user_id, read_at)`, `INDEX(type)`

{{/if}}

---

## Entitas Audit

### `audit_logs` — Log Aktivitas

| Kolom         | Tipe         | Nullable | Default | Keterangan                     |
| ------------- | ------------ | -------- | ------- | ------------------------------ |
| `id`          | UUID         | No       | gen     | Primary key                    |
| `user_id`     | UUID         | Yes      | NULL    | FK → users (null = system)     |
| `action`      | VARCHAR(50)  | No       | —       | create/update/delete/login/etc |
| `entity_type` | VARCHAR(100) | No       | —       | Tipe entitas                   |
| `entity_id`   | UUID         | No       | —       | ID entitas                     |
| `old_values`  | JSON         | Yes      | NULL    | Nilai sebelum perubahan        |
| `new_values`  | JSON         | Yes      | NULL    | Nilai setelah perubahan        |
| `ip_address`  | VARCHAR(45)  | Yes      | NULL    | IP address                     |
| `user_agent`  | TEXT         | Yes      | NULL    | Browser/device                 |
| `created_at`  | TIMESTAMP    | No       | NOW()   | —                              |

**Index:** `INDEX(user_id)`, `INDEX(entity_type, entity_id)`, `INDEX(created_at)`

---

## Diagram Relasi

```
{{#if hasAuth}}
users ──< sessions
users ──< password_resets
{{/if}}
{{#if isEcommerce}}
users ──< orders ──< order_items >── products
users ──< carts ──< cart_items >── products
categories ──< products ──< product_images
{{/if}}
{{#if isSaas}}
users ──< organizations ──< organization_members >── users
organizations ──< subscriptions
organizations ──< usage_records
{{/if}}
{{#if isBooking}}
services ──< schedules
services ──< bookings >── users
{{/if}}
{{#if hasPayments}}
payments >── users
payments ──< refunds
{{/if}}
{{#if hasCms}}
users ──< posts >── post_categories
posts ──<> tags (via post_tags)
{{/if}}
{{#if hasUploads}}
users ──< files
{{/if}}
{{#if hasNotifications}}
users ──< notifications
{{/if}}
users ──< audit_logs
```

---

## Catatan Migrasi

- Gunakan migration tool (misal: Prisma Migrate, Knex, Drizzle) untuk version control schema
- Setiap perubahan schema harus melalui migration file — jangan edit database langsung
- Seed data untuk development harus tersedia di file terpisah
- Backup database sebelum menjalankan migration di production

> Data model ini akan berkembang seiring fitur **{{projectName}}** bertambah.
