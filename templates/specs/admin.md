# Spesifikasi Admin Dashboard — {{projectName}}

> Dokumen ini mendefinisikan fitur, permission, dan reporting untuk admin dashboard **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Arsitektur Admin

### Akses & Routing

| Aspek          | Detail                                             |
| -------------- | -------------------------------------------------- |
| **Base Path**  | `/admin`                                           |
| **Guard**      | `adminGuard` — cek role admin atau super_admin     |
| **Layout**     | Sidebar navigation + top bar + content area        |
| **Responsive** | Desktop-first, collapsible sidebar untuk tablet    |
| **Rendering**  | CSR (Client-Side Rendering) — data fetched via API |

### Role Admin

| Role          | Akses                | Deskripsi                                     |
| ------------- | -------------------- | --------------------------------------------- |
| `super_admin` | Full access          | Akses ke semua fitur termasuk system settings |
| `admin`       | Management access    | Kelola user, konten, dan data operasional     |
| `editor`      | Content access       | Kelola konten/produk saja                     |
| `support`     | Read + limited write | Customer support, lihat data, handle tiket    |

---

## Halaman Dashboard Utama

### Overview Dashboard (`/admin`)

| Widget           | Data                           | Visualisasi          |
| ---------------- | ------------------------------ | -------------------- |
| **Total Users**  | Jumlah user terdaftar          | StatCard + trend     |
| **Active Users** | DAU/WAU/MAU                    | StatCard + sparkline |
| **New Users**    | Registrasi hari ini/minggu ini | StatCard + trend     |
{{#if isEcommerce}}
| **Revenue** | Pendapatan hari ini / bulan ini | StatCard + chart |
| **Orders** | Jumlah pesanan hari ini | StatCard + status breakdown |
| **Top Products** | Produk terlaris | Bar chart / list |
| **Cart Abandonment** | % keranjang yang tidak checkout | Gauge |
{{/if}}
{{#if isSaas}}
| **MRR** | Monthly Recurring Revenue | StatCard + trend |
| **Subscriptions** | Aktif, trial, cancelled | Pie chart |
| **Churn Rate** | % user berhenti bulan ini | StatCard |
| **Feature Usage** | Fitur paling digunakan | Bar chart |
{{/if}}
{{#if isBooking}}
| **Bookings Today** | Pemesanan hari ini | StatCard |
| **Upcoming** | Jadwal mendatang | Calendar view |
| **Cancellation Rate** | % pembatalan | StatCard |
| **Popular Services** | Layanan terpopuler | Bar chart |
{{/if}}
| **Recent Activity** | Log aktivitas terbaru | Timeline list |
| **System Health** | Status server, error rate | Status indicators |

---

## Modul Admin

### User Management (`/admin/users`)

| Fitur              | Deskripsi                                                           |
| ------------------ | ------------------------------------------------------------------- |
| **List Users**     | Tabel paginated dengan search, filter (role, status, tanggal), sort |
| **User Detail**    | Profil, aktivitas, order/booking history                            |
| **Create User**    | Form buat user baru (admin-created)                                 |
| **Edit User**      | Update profil, role, status                                         |
| **Ban/Unban**      | Suspend user account                                                |
| **Reset Password** | Kirim link reset password                                           |
| **Delete User**    | Soft delete (dengan konfirmasi)                                     |
| **Export**         | Download CSV/Excel daftar user                                      |
| **Impersonate**    | Login sebagai user (super_admin only, audit logged)                 |

### Tabel User

| Kolom      | Sortable | Filterable      | Searchable |
| ---------- | -------- | --------------- | ---------- |
| Nama       | ✅       | ❌              | ✅         |
| Email      | ✅       | ❌              | ✅         |
| Role       | ✅       | ✅              | ❌         |
| Status     | ✅       | ✅              | ❌         |
| Registered | ✅       | ✅ (date range) | ❌         |
| Last Login | ✅       | ❌              | ❌         |

{{#if isEcommerce}}

### Product Management (`/admin/products`)

| Fitur              | Deskripsi                                      |
| ------------------ | ---------------------------------------------- |
| **List Products**  | Tabel dengan gambar, nama, harga, stok, status |
| **Create Product** | Form lengkap: info, gambar, kategori, SEO      |
| **Edit Product**   | Update semua field produk                      |
| **Delete Product** | Soft delete                                    |
| **Bulk Actions**   | Activate/deactivate, update harga, delete      |
| **Import/Export**  | CSV import/export produk                       |
| **Inventory**      | View stok, set low stock alerts                |

### Order Management (`/admin/orders`)

| Fitur             | Deskripsi                                            |
| ----------------- | ---------------------------------------------------- |
| **List Orders**   | Tabel dengan nomor, customer, total, status, tanggal |
| **Order Detail**  | Items, shipping info, payment info, timeline         |
| **Update Status** | Ubah status (processing → shipped → delivered)       |
| **Refund**        | Inisiasi full/partial refund                         |
| **Print Invoice** | Generate & print invoice                             |
| **Export**        | Download CSV/Excel daftar order                      |
| **Filter**        | By status, date range, payment method                |

### Category Management (`/admin/categories`)

| Fitur               | Deskripsi                     |
| ------------------- | ----------------------------- |
| **Tree View**       | Tampilkan hierarki kategori   |
| **CRUD**            | Create, edit, delete kategori |
| **Reorder**         | Drag & drop untuk ubah urutan |
| **Assign Products** | Lihat produk per kategori     |

{{/if}}

{{#if isSaas}}

### Subscription Management (`/admin/subscriptions`)

| Fitur                  | Deskripsi                                    |
| ---------------------- | -------------------------------------------- |
| **List Subscriptions** | Tabel dengan org, plan, status, next billing |
| **Detail**             | History pembayaran, usage                    |
| **Change Plan**        | Force upgrade/downgrade                      |
| **Cancel**             | Cancel subscription                          |
| **Invoice History**    | Semua invoice per subscription               |

### Tenant Management (`/admin/tenants`)

| Fitur                 | Deskripsi                                   |
| --------------------- | ------------------------------------------- |
| **List Tenants**      | Tabel dengan nama, plan, status, usage      |
| **Detail**            | Info tenant, members, usage stats           |
| **Suspend/Unsuspend** | Suspend tenant (billing/violation)          |
| **Impersonate**       | Masuk ke tenant (super_admin, audit logged) |
| **Usage Report**      | Resource usage per tenant                   |

{{/if}}

{{#if isBooking}}

### Booking Management (`/admin/bookings`)

| Fitur              | Deskripsi                                 |
| ------------------ | ----------------------------------------- |
| **Calendar View**  | Kalender booking per layanan              |
| **List View**      | Tabel booking dengan filter               |
| **Detail**         | Info booking, customer, payment           |
| **Manual Booking** | Admin buat booking manual                 |
| **Reschedule**     | Admin ubah jadwal                         |
| **Cancel**         | Admin batalkan booking                    |
| **Block Slots**    | Blokir slot tertentu (maintenance, libur) |

### Service Management (`/admin/services`)

| Fitur             | Deskripsi                            |
| ----------------- | ------------------------------------ |
| **CRUD Services** | Kelola layanan (nama, durasi, harga) |
| **Schedule**      | Atur jadwal operasional per layanan  |
| **Availability**  | Override ketersediaan per tanggal    |

{{/if}}

{{#if hasCms}}

### Content Management (`/admin/content`)

| Fitur                 | Deskripsi                                   |
| --------------------- | ------------------------------------------- |
| **List Posts**        | Tabel dengan judul, status, author, tanggal |
| **Editor**            | Rich text editor untuk buat/edit konten     |
| **Publish/Unpublish** | Kelola status publikasi                     |
| **Categories & Tags** | Kelola taxonomi                             |
| **Media Library**     | Upload, browse, manage media                |
| **SEO**               | Edit meta title, description per konten     |
| **Revisions**         | Lihat history perubahan                     |

{{/if}}

{{#if hasPayments}}

### Payment Management (`/admin/payments`)

| Fitur                | Deskripsi                                     |
| -------------------- | --------------------------------------------- |
| **Transaction List** | Tabel transaksi dengan status, amount, method |
| **Detail**           | Info pembayaran, gateway response             |
| **Refund**           | Inisiasi refund                               |
| **Reconciliation**   | Laporan rekonsiliasi                          |
| **Export**           | Download laporan keuangan                     |

{{/if}}

---

## System Administration

### Settings (`/admin/settings`)

| Section          | Settings                              |
| ---------------- | ------------------------------------- |
| **General**      | Nama site, deskripsi, logo, favicon   |
| **Email**        | SMTP config, template preview         |
| **Payment**      | Gateway config, metode aktif          |
| **SEO**          | Default meta, sitemap, robots         |
| **Security**     | Password policy, session timeout, 2FA |
| **Notification** | Channel config, default preferences   |
| **Maintenance**  | Maintenance mode toggle, message      |

### Audit Log (`/admin/audit`)

| Kolom         | Detail                                          |
| ------------- | ----------------------------------------------- |
| **Timestamp** | Waktu aksi                                      |
| **User**      | Siapa yang melakukan                            |
| **Action**    | Apa yang dilakukan (create/update/delete/login) |
| **Resource**  | Entitas yang terpengaruh                        |
| **Details**   | Perubahan spesifik (old → new values)           |
| **IP**        | IP address                                      |

**Filter:** By user, action type, resource type, date range.

---

## Reporting

### Laporan yang Tersedia

| Laporan         | Deskripsi                | Format        | Jadwal    |
| --------------- | ------------------------ | ------------- | --------- |
| **User Report** | Registrasi, aktif, churn | Chart + table | On-demand |
{{#if isEcommerce}}
| **Sales Report** | Revenue, orders, AOV per periode | Chart + table | Harian/bulanan |
| **Product Report** | Top sellers, low stock, revenue per produk | Chart + table | Mingguan |
| **Customer Report** | Top spenders, repeat rate, LTV | Table | Bulanan |
{{/if}}
{{#if isSaas}}
| **MRR Report** | Revenue trend, new/churned MRR | Chart | Bulanan |
| **Usage Report** | Feature usage per plan | Chart + table | Mingguan |
| **Churn Report** | Churn rate, reasons, cohort | Chart + table | Bulanan |
{{/if}}
{{#if isBooking}}
| **Booking Report** | Volume, revenue, cancellation rate | Chart + table | Harian/bulanan |
| **Service Report** | Popularitas, utilization per layanan | Chart | Mingguan |
{{/if}}
| **Traffic Report** | Page views, sessions, sources | Chart | Harian |
| **Error Report** | Error frequency, types, affected users | Chart + table | Real-time |

### Export Formats

| Format            | Use Case                       |
| ----------------- | ------------------------------ |
| **CSV**           | Data processing di spreadsheet |
| **Excel (.xlsx)** | Formatted report               |
| **PDF**           | Shareable report               |

### Scheduled Reports

| Aspek          | Detail                      |
| -------------- | --------------------------- |
| **Frekuensi**  | Harian / Mingguan / Bulanan |
| **Delivery**   | Email dengan attachment     |
| **Recipients** | Configurable per report     |
| **Format**     | PDF summary + CSV data      |

---

## UI/UX Admin

### Layout

```
┌─────────────────────────────────────────────┐
│ Top Bar: Search | Notifications | User Menu │
├────────┬────────────────────────────────────┤
│        │                                    │
│ Side   │   Content Area                     │
│ bar    │                                    │
│        │   ┌─────────────────────────┐      │
│ - Dash │   │ Page Header + Actions   │      │
│ - Users│   ├─────────────────────────┤      │
│ - ...  │   │                         │      │
│ - Sett │   │ Main Content            │      │
│        │   │ (Table/Form/Chart)      │      │
│        │   │                         │      │
│        │   └─────────────────────────┘      │
│        │                                    │
└────────┴────────────────────────────────────┘
```

### Komponen Admin

| Komponen        | Fungsi                                                   |
| --------------- | -------------------------------------------------------- |
| `AdminSidebar`  | Navigasi utama admin                                     |
| `AdminTopBar`   | Search, notifications, user menu                         |
| `DataTable`     | Tabel data dengan sort, filter, pagination, bulk actions |
| `StatCard`      | Metrik dashboard                                         |
| `Chart`         | Grafik (line, bar, pie, area)                            |
| `AdminForm`     | Form untuk CRUD operations                               |
| `BulkActionBar` | Bar aksi saat multi-select                               |
| `FilterPanel`   | Panel filter untuk tabel                                 |
| `ExportButton`  | Tombol export data                                       |

---

## Keamanan Admin

| Aspek                   | Implementasi                            |
| ----------------------- | --------------------------------------- |
| **Auth**                | Wajib login + role admin                |
| **2FA**                 | Wajib untuk admin                       |
| **Session**             | Timeout lebih pendek (15 menit inaktif) |
| **IP Restriction**      | Opsional — whitelist IP untuk admin     |
| **Audit**               | Semua aksi admin di-log                 |
| **CSRF**                | Protection di semua form                |
| **Rate Limit**          | Rate limit ketat di admin API           |
| **Impersonation**       | Hanya super_admin, selalu logged        |
| **Destructive Actions** | Konfirmasi dialog + password re-entry   |

---

> Admin dashboard harus diuji dengan role yang berbeda untuk memastikan permission bekerja dengan benar di **{{projectName}}**.
