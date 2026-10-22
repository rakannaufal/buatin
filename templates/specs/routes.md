# Inventaris Halaman & Routes — {{projectName}}

> Dokumen ini mendefinisikan seluruh halaman dan routing untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

Setiap route memiliki path, tujuan, level akses, dan strategi rendering yang jelas.

---

## Konvensi

| Level Akses | Arti                                |
| ----------- | ----------------------------------- |
| **Public**  | Bisa diakses siapa saja tanpa login |
| **Auth**    | Harus login                         |
| **Admin**   | Harus login + role admin            |
| **Owner**   | Harus login + pemilik resource      |

| Rendering | Arti                            |
| --------- | ------------------------------- |
| **SSR**   | Server-Side Rendering           |
| **SSG**   | Static Site Generation          |
| **CSR**   | Client-Side Rendering           |
| **ISR**   | Incremental Static Regeneration |

---

## Halaman Publik

| Route          | Path       | Tujuan                            | Akses  | Rendering                                         |
| -------------- | ---------- | --------------------------------- | ------ | ------------------------------------------------- |
| Home           | `/`        | Landing page utama                | Public | {{#if technology.framework}}SSR{{else}}SSG{{/if}} |
| About          | `/about`   | Informasi tentang {{projectName}} | Public | SSG                                               |
| Contact        | `/contact` | Formulir kontak                   | Public | SSG                                               |
| Privacy Policy | `/privacy` | Kebijakan privasi                 | Public | SSG                                               |
| Terms          | `/terms`   | Syarat dan ketentuan              | Public | SSG                                               |
| 404            | `/*`       | Halaman tidak ditemukan           | Public | SSG                                               |
| 500            | `/500`     | Error server                      | Public | SSG                                               |

{{#if hasAuth}}

---

## Halaman Autentikasi

| Route           | Path               | Tujuan                 | Akses                              | Rendering |
| --------------- | ------------------ | ---------------------- | ---------------------------------- | --------- |
| Login           | `/login`           | Form login             | Public (redirect jika sudah login) | CSR       |
| Register        | `/register`        | Form registrasi        | Public (redirect jika sudah login) | CSR       |
| Forgot Password | `/forgot-password` | Request reset password | Public                             | CSR       |
| Reset Password  | `/reset-password`  | Form password baru     | Public (token required)            | CSR       |
| Verify Email    | `/verify-email`    | Verifikasi email       | Public (token required)            | CSR       |
| Profile         | `/profile`         | Profil pengguna        | Auth                               | CSR       |
| Settings        | `/settings`        | Pengaturan akun        | Auth                               | CSR       |

{{/if}}

{{#if isEcommerce}}

---

## Halaman E-Commerce

| Route          | Path                | Tujuan              | Akses  | Rendering |
| -------------- | ------------------- | ------------------- | ------ | --------- |
| Product List   | `/products`         | Katalog produk      | Public | SSR/ISR   |
| Product Detail | `/products/:slug`   | Detail produk       | Public | SSR/ISR   |
| Category       | `/categories/:slug` | Produk per kategori | Public | SSR/ISR   |
| Cart           | `/cart`             | Keranjang belanja   | Public | CSR       |
| Checkout       | `/checkout`         | Proses checkout     | Auth   | CSR       |
| Order History  | `/orders`           | Daftar pesanan user | Auth   | CSR       |
| Order Detail   | `/orders/:id`       | Detail pesanan      | Owner  | CSR       |
| Wishlist       | `/wishlist`         | Daftar keinginan    | Auth   | CSR       |

{{/if}}

{{#if isSaas}}

---

## Halaman SaaS

| Route      | Path                 | Tujuan                        | Akses           | Rendering |
| ---------- | -------------------- | ----------------------------- | --------------- | --------- |
| Pricing    | `/pricing`           | Daftar paket/plan             | Public          | SSG/ISR   |
| Dashboard  | `/dashboard`         | Dashboard utama               | Auth            | CSR       |
| Workspace  | `/workspace/:id`     | Workspace spesifik            | Auth            | CSR       |
| Billing    | `/billing`           | Kelola subscription & payment | Auth            | CSR       |
| Team       | `/team`              | Kelola anggota tim            | Auth (Admin)    | CSR       |
| Onboarding | `/onboarding`        | Wizard setup awal             | Auth (New User) | CSR       |
| API Keys   | `/settings/api-keys` | Kelola API key                | Auth            | CSR       |

{{/if}}

{{#if isBooking}}

---

## Halaman Booking

| Route          | Path               | Tujuan                | Akses  | Rendering |
| -------------- | ------------------ | --------------------- | ------ | --------- |
| Services       | `/services`        | Daftar layanan        | Public | SSR/ISR   |
| Service Detail | `/services/:slug`  | Detail layanan        | Public | SSR/ISR   |
| Book           | `/book/:serviceId` | Form pemesanan        | Auth   | CSR       |
| My Bookings    | `/bookings`        | Daftar booking user   | Auth   | CSR       |
| Booking Detail | `/bookings/:id`    | Detail booking        | Owner  | CSR       |
| Calendar       | `/calendar`        | Kalender ketersediaan | Public | CSR       |

{{/if}}

{{#if hasPayments}}

---

## Halaman Pembayaran

| Route           | Path               | Tujuan                | Akses | Rendering |
| --------------- | ------------------ | --------------------- | ----- | --------- |
| Payment         | `/payment/:id`     | Halaman pembayaran    | Auth  | CSR       |
| Payment Success | `/payment/success` | Konfirmasi berhasil   | Auth  | CSR       |
| Payment Failed  | `/payment/failed`  | Info pembayaran gagal | Auth  | CSR       |
| Payment History | `/payments`        | Riwayat pembayaran    | Auth  | CSR       |
| Invoice         | `/invoices/:id`    | Detail invoice        | Owner | CSR       |

{{/if}}

{{#if hasAdmin}}

---

## Halaman Admin

| Route           | Path               | Tujuan          | Akses | Rendering |
| --------------- | ------------------ | --------------- | ----- | --------- |
| Admin Dashboard | `/admin`           | Dashboard admin | Admin | CSR       |
| User Management | `/admin/users`     | Kelola pengguna | Admin | CSR       |
| User Detail     | `/admin/users/:id` | Detail pengguna | Admin | CSR       |
{{#if isEcommerce}}
| Product Management | `/admin/products` | Kelola produk | Admin | CSR |
| Order Management | `/admin/orders` | Kelola pesanan | Admin | CSR |
| Category Management | `/admin/categories` | Kelola kategori | Admin | CSR |
{{/if}}
{{#if hasCms}}
| Content Management | `/admin/content` | Kelola konten | Admin | CSR |
| Post Editor | `/admin/content/:id/edit` | Editor konten | Admin | CSR |
{{/if}}
| Settings | `/admin/settings` | Pengaturan sistem | Admin | CSR |
| Audit Log | `/admin/audit` | Log aktivitas | Admin | CSR |
| Reports | `/admin/reports` | Laporan & statistik | Admin | CSR |

{{/if}}

{{#if hasCms}}

---

## Halaman CMS / Blog

| Route         | Path                   | Tujuan               | Akses  | Rendering |
| ------------- | ---------------------- | -------------------- | ------ | --------- |
| Blog List     | `/blog`                | Daftar artikel       | Public | SSR/ISR   |
| Blog Post     | `/blog/:slug`          | Artikel detail       | Public | SSR/ISR   |
| Blog Category | `/blog/category/:slug` | Artikel per kategori | Public | SSR/ISR   |
| Blog Tag      | `/blog/tag/:slug`      | Artikel per tag      | Public | SSR/ISR   |

{{/if}}

{{#if hasSearch}}

---

## Halaman Pencarian

| Route          | Path               | Tujuan             | Akses  | Rendering |
| -------------- | ------------------ | ------------------ | ------ | --------- |
| Search         | `/search`          | Hasil pencarian    | Public | CSR       |
| Search Results | `/search?q=:query` | Hasil dengan query | Public | CSR       |

{{/if}}

---

## API Routes

{{#if hasApi}}
Lihat dokumen **[API Spec](./api.md)** untuk daftar lengkap API endpoint.
{{/if}}

| Route        | Path          | Tujuan           |
| ------------ | ------------- | ---------------- |
| Health Check | `/api/health` | Status server    |
| API Version  | `/api/v1`     | Base path API v1 |
{{#if hasAuth}}
| Auth API | `/api/v1/auth/*` | Endpoint autentikasi |
{{/if}}

---

## Middleware & Guards

| Middleware | Route Pattern | Fungsi |
| ---------- | ------------- | ------ |
{{#if hasAuth}}
| `authGuard` | `/dashboard/*`, `/settings/*`, `/profile/*` | Cek autentikasi |
| `adminGuard` | `/admin/*` | Cek role admin |
{{/if}}
| `rateLimiter` | `/api/*` | Rate limiting |
| `cors` | `/api/*` | CORS policy |
| `csp` | `*` | Content Security Policy |

---

## Redirect Rules

| Dari | Ke  | Kondisi |
| ---- | --- | ------- |
{{#if hasAuth}}
| `/login` | `/dashboard` | Jika sudah login |
| `/register` | `/dashboard` | Jika sudah login |
| Protected routes | `/login` | Jika belum login |
{{/if}}
| `/index.html` | `/` | Legacy URL |

---

> Total halaman dan routes akan bertambah seiring pengembangan fitur **{{projectName}}**.
