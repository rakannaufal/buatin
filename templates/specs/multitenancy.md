# Spesifikasi Multi-Tenancy — {{projectName}}

> Dokumen ini mendefinisikan arsitektur multi-tenant termasuk isolasi data, partisi, dan manajemen tenant untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Strategi Multi-Tenancy

### Pendekatan

| Strategi                             | Deskripsi                                                   | Dipilih                        |
| ------------------------------------ | ----------------------------------------------------------- | ------------------------------ |
| **Shared Database, Shared Schema**   | Semua tenant di tabel yang sama, dibedakan oleh `tenant_id` | ✅ Rekomendasi (untuk memulai) |
| **Shared Database, Separate Schema** | Setiap tenant punya schema PostgreSQL sendiri               | Alternatif (skala menengah)    |
| **Separate Database**                | Setiap tenant punya database sendiri                        | Enterprise (compliance ketat)  |

**Alasan:** Shared schema paling sederhana untuk dikelola, cost-effective, dan cukup untuk mayoritas use case. Migrasi ke schema terpisah atau database terpisah bisa dilakukan kemudian jika diperlukan.

---

## Arsitektur Data

### Tenant Identification

```
Request masuk
  │
  ├─ Extract tenant identifier:
  │   ├─ Subdomain: {tenant}.{{projectName}}.com
  │   ├─ Header: X-Tenant-ID
  │   ├─ Path: /api/v1/{tenant}/...
  │   └─ JWT claim: tenant_id
  │
  ├─ Resolve tenant dari database
  │   ├─ Tidak ditemukan → 404
  │   ├─ Inactive → 403
  │   └─ Valid → Set tenant context
  │
  └─ Semua query otomatis filter by tenant_id
```

### Tabel Tenant

| Kolom        | Tipe         | Nullable | Keterangan                |
| ------------ | ------------ | -------- | ------------------------- |
| `id`         | UUID         | No       | Primary key               |
| `name`       | VARCHAR(255) | No       | Nama tenant               |
| `slug`       | VARCHAR(100) | No       | Subdomain / identifier    |
| `owner_id`   | UUID         | No       | FK → users                |
| `plan`       | ENUM         | No       | free/pro/enterprise       |
| `status`     | ENUM         | No       | active/inactive/suspended |
| `settings`   | JSON         | Yes      | Konfigurasi per tenant    |
| `domain`     | VARCHAR(255) | Yes      | Custom domain (opsional)  |
| `created_at` | TIMESTAMP    | No       | —                         |
| `updated_at` | TIMESTAMP    | No       | —                         |
| `deleted_at` | TIMESTAMP    | Yes      | Soft delete               |

**Index:** `UNIQUE(slug)`, `UNIQUE(domain)`, `INDEX(owner_id)`, `INDEX(status)`

### Data Isolation via `tenant_id`

Setiap tabel yang berisi data tenant harus memiliki kolom `tenant_id`:

```sql
-- Contoh: tabel projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- ...
);

-- Index untuk query performance
CREATE INDEX idx_projects_tenant ON projects(tenant_id);

-- Row Level Security (PostgreSQL)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### Tabel yang TIDAK perlu `tenant_id`

| Tabel             | Alasan                          |
| ----------------- | ------------------------------- |
| `tenants`         | Tabel tenant itu sendiri        |
| `users`           | User bisa milik multiple tenant |
| `system_settings` | Konfigurasi global              |
| `audit_logs`      | Bisa cross-tenant (super admin) |
| `plans`           | Definisi plan global            |

---

## Isolasi Data

### Level Isolasi

| Layer           | Mekanisme                | Detail                                     |
| --------------- | ------------------------ | ------------------------------------------ |
| **Database**    | Row Level Security (RLS) | PostgreSQL policy per tenant               |
| **Application** | Middleware + Query Scope | Auto-filter `tenant_id` di setiap query    |
| **API**         | Tenant context           | Semua endpoint dalam context tenant        |
| **Storage**     | Prefix / bucket          | File dipisah per tenant `/{tenant_id}/...` |
| **Cache**       | Key prefix               | Cache key: `{tenant_id}:{resource}:{id}`   |
| **Queue**       | Tenant metadata          | Job menyertakan `tenant_id`                |

### Row Level Security (PostgreSQL)

```sql
-- Set tenant context per request
SET app.current_tenant = 'tenant-uuid';

-- Policy otomatis filter semua query
-- SELECT * FROM projects; → hanya return data tenant aktif
```

### Application-Level Isolation

```
Middleware: TenantResolver
  │
  ├─ Extract tenant dari request
  ├─ Validasi tenant aktif
  ├─ Set tenant context (thread-local / async context)
  │
  └─ Semua model/repository otomatis append:
      WHERE tenant_id = {current_tenant_id}
```

---

## Manajemen Tenant

### Lifecycle

```
[Created] → [Active] → [Suspended] → [Deleted]
                │                        ↑
                └─── [Inactive] ─────────┘
```

| Status      | Deskripsi                           | Akses       |
| ----------- | ----------------------------------- | ----------- |
| `active`    | Normal                              | Full access |
| `inactive`  | Nonaktifkan sementara               | Read-only   |
| `suspended` | Ditangguhkan (billing / violation)  | No access   |
| `deleted`   | Soft delete, data masih ada 30 hari | No access   |

### Provisioning Tenant Baru

1. User registrasi / buat organisasi
2. Sistem buat record `tenants`
3. Setup default settings
4. Assign plan (free/trial)
5. Buat resources awal (jika ada)
6. Kirim welcome email
7. Redirect ke onboarding

### Penghapusan Tenant

1. Owner request delete
2. Konfirmasi via email
3. Status → `deleted`, `deleted_at` = now
4. Grace period 30 hari
5. Setelah 30 hari:
   - Hapus semua data tenant dari database
   - Hapus file dari storage
   - Hapus cache entries
   - Audit log dipertahankan (anonymized)

---

## Konfigurasi per Tenant

### Settings yang Bisa Dikustomisasi

| Setting                       | Tipe        | Default              | Contoh             |
| ----------------------------- | ----------- | -------------------- | ------------------ |
| `branding.logo`               | URL         | {{projectName}} logo | Custom logo        |
| `branding.primary_color`      | String      | `{{primaryColor}}`   | `#FF5722`          |
| `branding.name`               | String      | Nama tenant          | "PT XYZ"           |
| `features.max_users`          | Number      | Sesuai plan          | 5 / 25 / unlimited |
| `features.max_storage`        | Number (MB) | Sesuai plan          | 100 / 5000 / 50000 |
| `notifications.email_enabled` | Boolean     | true                 | true/false         |
| `locale`                      | String      | `id`                 | `en`               |
| `timezone`                    | String      | `Asia/Jakarta`       | `Asia/Makassar`    |

---

## Quota & Limits per Plan

| Resource         | Free   | Pro    | Enterprise |
| ---------------- | ------ | ------ | ---------- |
| Users            | 3      | 25     | Unlimited  |
| Storage          | 100 MB | 5 GB   | 50 GB      |
| API Requests/day | 1,000  | 50,000 | 500,000    |
{{#if hasAiFeatures}}
| AI Requests/day | 50 | 500 | 5,000 |
{{/if}}
| Projects | 3 | 20 | Unlimited |
| Custom Domain | ❌ | ✅ | ✅ |
| White Label | ❌ | ❌ | ✅ |
| SLA | ❌ | 99.9% | 99.99% |
| Support | Community | Email | Dedicated |

---

## Super Admin

### Capabilities

| Fitur                | Deskripsi                                 |
| -------------------- | ----------------------------------------- |
| Tenant List          | Lihat semua tenant dengan filter/search   |
| Tenant Detail        | Lihat detail, usage, billing              |
| Tenant Suspend       | Suspend/unsuspend tenant                  |
| Tenant Impersonate   | Login sebagai tenant admin (audit logged) |
| Cross-Tenant Reports | Statistik agregat                         |
| System Settings      | Konfigurasi global                        |
| Plan Management      | CRUD plans                                |

### Audit Trail

Semua aksi super admin terhadap tenant harus di-log:

| Field           | Detail                              |
| --------------- | ----------------------------------- |
| `admin_user_id` | Siapa yang melakukan aksi           |
| `tenant_id`     | Tenant yang terdampak               |
| `action`        | Aksi yang dilakukan                 |
| `reason`        | Alasan (wajib untuk suspend/delete) |
| `timestamp`     | Waktu aksi                          |

---

## Performance

### Query Optimization

| Strategi            | Implementasi                                        |
| ------------------- | --------------------------------------------------- |
| **Composite Index** | `(tenant_id, created_at)`, `(tenant_id, status)`    |
| **Partition**       | Table partitioning by `tenant_id` untuk tabel besar |
| **Connection Pool** | Shared pool, bukan per-tenant                       |
| **Cache**           | Per-tenant cache dengan key prefix                  |

### Noisy Neighbor Prevention

| Strategi            | Implementasi                               |
| ------------------- | ------------------------------------------ |
| **Rate Limiting**   | Per tenant, bukan hanya per user           |
| **Query Timeout**   | Max 30 detik per query                     |
| **Resource Quota**  | Enforce storage/bandwidth limits           |
| **Background Jobs** | Fair queue — tidak boleh 1 tenant monopoli |

---

## Environment Variables

| Variable             | Deskripsi                            |
| -------------------- | ------------------------------------ |
| `TENANT_ISOLATION`   | rls / application / schema           |
| `DEFAULT_PLAN`       | Plan default untuk tenant baru       |
| `TENANT_DOMAIN`      | Base domain untuk subdomain          |
| `SUPER_ADMIN_EMAILS` | Email yang otomatis jadi super admin |

---

> Implementasi multi-tenancy harus diuji ketat, terutama isolasi data — pastikan tidak ada data leak antar tenant di **{{projectName}}**.
