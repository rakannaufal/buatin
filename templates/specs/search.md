# Spesifikasi Pencarian & Filter — {{projectName}}

> Dokumen ini mendefinisikan strategi pencarian, filtering, dan sorting untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Pendekatan Implementasi

### Strategi Pencarian

| Opsi                            | Kapan Digunakan            | Kelebihan                         | Kekurangan               |
| ------------------------------- | -------------------------- | --------------------------------- | ------------------------ |
| **Database LIKE/ILIKE**         | Data < 10K records         | Simple, no dependency             | Lambat untuk data besar  |
| **PostgreSQL Full-Text Search** | Data 10K-1M records        | Built-in, gratis, trigram support | Kurang flexible scoring  |
| **Meilisearch**                 | Data > 100K, UX prioritas  | Typo-tolerant, instant, faceted   | Self-hosted / cloud cost |
| **Algolia**                     | Data > 100K, managed       | Sangat cepat, analytics built-in  | Biaya per query          |
| **Typesense**                   | Data > 100K, open-source   | Typo-tolerant, open-source        | Self-hosted              |
| **Elasticsearch**               | Data > 1M, complex queries | Sangat powerful                   | Complex ops              |

**Rekomendasi:** Mulai dengan **PostgreSQL Full-Text Search**, upgrade ke **Meilisearch/Typesense** jika perlu instant search experience.

---

## Search UX

### Komponen Pencarian

| Komponen              | Fungsi                        | Behavior                          |
| --------------------- | ----------------------------- | --------------------------------- |
| **Search Bar**        | Input utama di header         | Cmd/Ctrl+K shortcut, autofocus    |
| **Search Overlay**    | Modal pencarian global        | Tampil saat search bar fokus      |
| **Instant Results**   | Hasil real-time saat mengetik | Debounce 300ms, min 2 karakter    |
| **Recent Searches**   | Riwayat pencarian             | Simpan 10 terakhir, bisa dihapus  |
| **Suggested Queries** | Saran pencarian populer       | Tampil sebelum user mengetik      |
| **No Results State**  | Saat tidak ada hasil          | Saran alternatif, typo correction |

### Search Flow

```
User ketik di search bar
  │
  ├─ < 2 karakter → Tampilkan recent searches + suggestions
  │
  ├─ >= 2 karakter (debounce 300ms)
  │   │
  │   ├─ Request ke /api/v1/search?q={query}
  │   │
  │   ├─ Tampilkan instant results (max 5 per tipe)
  │   │   ├─ Highlight matched text
  │   │   └─ Group by type (product, post, page)
  │   │
  │   └─ "Lihat semua hasil" → Navigate ke /search?q={query}
  │
  └─ Enter / klik "Lihat semua"
      │
      └─ Full search results page dengan filters
```

---

## Konten yang Dapat Dicari

| Tipe Konten | Field yang Diindex | Bobot | Kondisi |
| ----------- | ------------------ | ----- | ------- |
| Halaman     | title, content     | High  | Selalu  |
{{#if isEcommerce}}
| Produk | name, description, sku, category | Highest | `isEcommerce` |
{{/if}}
{{#if hasCms}}
| Artikel/Post | title, excerpt, content, tags | High | `hasCms` |
{{/if}}
{{#if isBooking}}
| Layanan | name, description | High | `isBooking` |
{{/if}}
{{#if isSaas}}
| Dokumentasi | title, content | Medium | `isSaas` |
{{/if}}
| FAQ | question, answer | Medium | Jika ada |

---

## Filter & Facet

{{#if isEcommerce}}

### Filter Produk

| Filter       | Tipe          | UI Component         | Contoh                      |
| ------------ | ------------- | -------------------- | --------------------------- |
| Kategori     | Multi-select  | Checkbox list / tree | Elektronik, Fashion         |
| Harga        | Range         | Range slider + input | Rp 0 — Rp 1.000.000         |
| Rating       | Single-select | Star rating buttons  | ≥ 4 bintang                 |
| Ketersediaan | Toggle        | Switch               | Hanya stok tersedia         |
| Sort         | Single-select | Dropdown             | Terbaru, Termurah, Terlaris |
| Brand        | Multi-select  | Checkbox + search    | Samsung, Apple              |

{{/if}}

{{#if hasCms}}

### Filter Artikel

| Filter   | Tipe          | UI Component  | Contoh              |
| -------- | ------------- | ------------- | ------------------- |
| Kategori | Multi-select  | Checkbox list | Tutorial, News      |
| Tag      | Multi-select  | Chip selector | javascript, react   |
| Tanggal  | Date range    | Date picker   | Jan 2024 — Mar 2024 |
| Penulis  | Single-select | Dropdown      | John Doe            |
| Sort     | Single-select | Dropdown      | Terbaru, Terpopuler |

{{/if}}

{{#if isBooking}}

### Filter Layanan

| Filter       | Tipe          | UI Component   | Contoh               |
| ------------ | ------------- | -------------- | -------------------- |
| Kategori     | Multi-select  | Checkbox list  | Konsultasi, Training |
| Tanggal      | Date picker   | Calendar       | 15 Maret 2024        |
| Waktu        | Multi-select  | Time slot grid | 09:00, 10:00         |
| Harga        | Range         | Range slider   | Rp 0 — Rp 500.000    |
| Ketersediaan | Toggle        | Switch         | Hanya slot tersedia  |
| Durasi       | Single-select | Dropdown       | 30 menit, 1 jam      |

{{/if}}

### Filter Behavior

| Aspek              | Implementasi                                                        |
| ------------------ | ------------------------------------------------------------------- |
| **Apply Mode**     | Langsung (setiap perubahan filter → update results)                 |
| **URL Sync**       | Filter state disimpan di query params (`?category=x&min_price=100`) |
| **Active Filters** | Tampilkan chip di atas hasil, klik untuk remove                     |
| **Clear All**      | Tombol "Reset Filter" untuk kembali ke default                      |
| **Count**          | Tampilkan jumlah hasil per filter option                            |
| **Responsive**     | Filter di sidebar (desktop), drawer/modal (mobile)                  |
| **Remember**       | Simpan filter terakhir di session (opsional)                        |

---

## Sorting

| Opsi      | Query Param       | Default Direction          |
| --------- | ----------------- | -------------------------- |
| Relevansi | `sort=relevance`  | desc (default saat search) |
| Terbaru   | `sort=created_at` | desc                       |
| Terlama   | `sort=created_at` | asc                        |
{{#if isEcommerce}}
| Termurah | `sort=price` | asc |
| Termahal | `sort=price` | desc |
| Terlaris | `sort=sold_count` | desc |
| Rating Tertinggi | `sort=rating` | desc |
{{/if}}
| Alfabet A-Z | `sort=name` | asc |
| Alfabet Z-A | `sort=name` | desc |

---

## Relevance Scoring

| Faktor              | Bobot | Deskripsi                           |
| ------------------- | ----- | ----------------------------------- |
| Title exact match   | 10x   | Query cocok persis di judul         |
| Title partial match | 5x    | Query ada di judul                  |
| Content match       | 2x    | Query ada di body/description       |
| Tag/category match  | 3x    | Query cocok dengan tag/kategori     |
| Recency             | 1.5x  | Konten lebih baru lebih relevan     |
| Popularity          | 1.2x  | Konten populer sedikit lebih tinggi |

---

## Indexing Strategy

### Kapan Index Diupdate

| Event          | Aksi             |
| -------------- | ---------------- |
| Create content | Tambah ke index  |
| Update content | Update index     |
| Delete content | Hapus dari index |
| Bulk import    | Reindex batch    |
| Schema change  | Full reindex     |

### Index Maintenance

| Tugas                  | Frekuensi                |
| ---------------------- | ------------------------ |
| Incremental sync       | Real-time (event-driven) |
| Full reindex           | Mingguan (scheduled)     |
| Stale content cleanup  | Harian                   |
| Index stats monitoring | Harian                   |

---

## API

### Search Endpoint

```
GET /api/v1/search?q={query}&type={type}&page={page}&per_page={per_page}&sort={sort}&{filters}
```

**Response:**

```json
{
  "data": {
    "results": [
      {
        "type": "product",
        "id": "uuid",
        "title": "Nama Produk",
        "url": "/products/nama-produk",
        "snippet": "...teks yang cocok dengan <mark>query</mark>...",
        "score": 0.95,
        "image": "url",
        "metadata": {}
      }
    ],
    "facets": {
      "category": [{ "value": "elektronik", "count": 42 }]
    },
    "meta": {
      "query": "laptop",
      "total": 150,
      "page": 1,
      "per_page": 20,
      "took_ms": 12
    }
  }
}
```

---

## Performance

| Metrik               | Target    |
| -------------------- | --------- |
| Search latency (P50) | < 50ms    |
| Search latency (P99) | < 200ms   |
| Instant search       | < 100ms   |
| Index update lag     | < 5 detik |

---

> Implementasi search harus dimonitor performanya dan dioptimasi sesuai pola penggunaan aktual **{{projectName}}**.
