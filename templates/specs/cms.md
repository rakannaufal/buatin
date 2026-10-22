# Spesifikasi CMS — {{projectName}}

> Dokumen ini mendefinisikan spesifikasi Content Management System termasuk content types, editor, workflow, dan publishing untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Content Types

### Tipe Konten Utama

| Content Type     | Deskripsi                            | Fields                                                                       | Status |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ------ |
| **Post/Artikel** | Artikel blog, berita, tutorial       | Title, slug, excerpt, body, featured image, category, tags, author, SEO meta | Core   |
| **Page**         | Halaman statis (about, contact, dll) | Title, slug, body, template, SEO meta                                        | Core   |
{{#if isEcommerce}}
| **Product** | Halaman produk | Name, slug, description, price, images, category, attributes, stock | Core |
| **Product Category** | Kategori produk | Name, slug, description, image, parent | Core |
{{/if}}
| **FAQ** | Pertanyaan umum | Question, answer, category, order | Opsional |
| **Testimonial** | Testimoni pelanggan | Name, role, company, quote, avatar, rating | Opsional |
| **Banner** | Banner promosi | Title, image, link, position, schedule | Opsional |

### Field Types

| Tipe          | Input UI                 | Validasi            | Contoh                   |
| ------------- | ------------------------ | ------------------- | ------------------------ |
| `text`        | Text input               | Max length          | Judul                    |
| `slug`        | Auto-generate dari title | URL-safe, unique    | URL slug                 |
| `richtext`    | WYSIWYG editor           | Sanitize HTML       | Body konten              |
| `markdown`    | Markdown editor          | Valid markdown      | Body konten (alternatif) |
| `image`       | Image uploader           | Format, size        | Featured image           |
| `gallery`     | Multi-image uploader     | Format, size, count | Galeri produk            |
| `select`      | Dropdown                 | Options list        | Kategori                 |
| `multiselect` | Tag selector             | Options list        | Tags                     |
| `date`        | Date picker              | Valid date          | Publish date             |
| `number`      | Number input             | Min, max            | Harga, stok              |
| `boolean`     | Toggle                   | —                   | Featured, active         |
| `json`        | JSON editor              | Valid JSON          | Metadata, settings       |
| `relation`    | Relation picker          | FK valid            | Author, category         |

---

## Editor

### Rich Text Editor

| Fitur                          | Status | Detail                         |
| ------------------------------ | ------ | ------------------------------ |
| **Bold, Italic, Underline**    | ✅     | Formatting dasar               |
| **Headings** (H1-H4)           | ✅     | Struktur konten                |
| **Lists** (ordered, unordered) | ✅     | —                              |
| **Links**                      | ✅     | URL, open in new tab           |
| **Images**                     | ✅     | Upload, URL, alt text, caption |
| **Video Embed**                | ✅     | YouTube, Vimeo (URL paste)     |
| **Code Block**                 | ✅     | Syntax highlighting            |
| **Blockquote**                 | ✅     | —                              |
| **Table**                      | ✅     | Basic table support            |
| **Horizontal Rule**            | ✅     | —                              |
| **Undo/Redo**                  | ✅     | —                              |
| **Full Screen**                | ✅     | Distraction-free writing       |
| **Word Count**                 | ✅     | Live word/character count      |
| **Reading Time**               | ✅     | Estimasi waktu baca            |

### Rekomendasi Library

| Library        | Framework | Fitur                              |
| -------------- | --------- | ---------------------------------- |
| **TipTap**     | React/Vue | Extensible, headless, excellent DX |
| **Plate**      | React     | Rich plugin system                 |
| **Editor.js**  | Vanilla   | Block-based editor                 |
| **MDX Editor** | React     | Markdown + JSX                     |

---

## Workflow & Publishing

### Content Status

```
[Draft] → [In Review] → [Published] → [Archived]
    ↑          │              │
    └──────────┘              │
    (Revision)                │
                    [Unpublished] ←─┘
```

| Status        | Deskripsi                  | Visible Publik |
| ------------- | -------------------------- | -------------- |
| `draft`       | Sedang ditulis, belum siap | ❌             |
| `in_review`   | Menunggu review/approval   | ❌             |
| `published`   | Live, bisa dilihat publik  | ✅             |
| `unpublished` | Ditarik dari publik        | ❌             |
| `archived`    | Diarsipkan, tidak aktif    | ❌             |

### Publishing Flow

```
Author membuat konten (draft)
  │
  ├─ Self-publish (jika punya permission)
  │   └─ Status → published, published_at = now
  │
  └─ Submit for review
      │
      ├─ Reviewer approve → published
      ├─ Reviewer reject → draft (dengan catatan)
      └─ Reviewer request changes → draft (dengan catatan)
```

### Scheduled Publishing

| Aspek         | Detail                                           |
| ------------- | ------------------------------------------------ |
| **Set Date**  | Author pilih tanggal & waktu publish             |
| **Status**    | `scheduled` — belum terlihat publik              |
| **Execution** | Cron job cek setiap menit, publish jika waktunya |
| **Timezone**  | Sesuai setting user/tenant                       |
| **Cancel**    | Author bisa cancel schedule, kembali ke draft    |

---

## Revisi & Version History

| Aspek               | Detail                                   |
| ------------------- | ---------------------------------------- |
| **Auto-save**       | Setiap 30 detik saat editing             |
| **Manual Save**     | Simpan draft tanpa publish               |
| **Version History** | Simpan setiap versi yang di-save/publish |
| **Compare**         | Diff view antara 2 versi                 |
| **Restore**         | Restore ke versi sebelumnya              |
| **Max Versions**    | 50 versi terakhir (configurable)         |

### Tabel Revisi

| Kolom            | Tipe      | Keterangan          |
| ---------------- | --------- | ------------------- |
| `id`             | UUID      | Primary key         |
| `post_id`        | UUID      | FK → posts          |
| `author_id`      | UUID      | FK → users          |
| `title`          | VARCHAR   | Judul saat itu      |
| `content`        | TEXT      | Konten saat itu     |
| `version`        | INT       | Nomor versi         |
| `change_summary` | VARCHAR   | Ringkasan perubahan |
| `created_at`     | TIMESTAMP | —                   |

---

## Taxonomi

### Kategori

| Aspek          | Detail                             |
| -------------- | ---------------------------------- |
| **Struktur**   | Hierarkis (parent-child)           |
| **Depth**      | Maks 3 level                       |
| **Required**   | Setiap post wajib punya 1 kategori |
| **Management** | CRUD di admin panel                |

### Tags

| Aspek            | Detail                              |
| ---------------- | ----------------------------------- |
| **Struktur**     | Flat (no hierarchy)                 |
| **Max per Post** | 10 tags                             |
| **Auto-suggest** | Suggest existing tags saat mengetik |
| **Management**   | Buat inline atau via admin panel    |
{{#if hasAiFeatures}}
| **Auto-tag** | AI suggest tags berdasarkan konten |
{{/if}}

---

## SEO per Konten

| Field              | Sumber        | Fallback                 |
| ------------------ | ------------- | ------------------------ |
| `meta_title`       | Custom input  | Post title               |
| `meta_description` | Custom input  | Post excerpt (155 chars) |
| `og:image`         | Custom upload | Featured image           |
| `canonical_url`    | Custom input  | Post URL                 |
| `robots`           | Custom select | `index, follow`          |
| `structured_data`  | Auto-generate | Article schema           |

### SEO Preview

Editor menampilkan preview bagaimana konten akan tampil di:

- Google search results
- Facebook share
- Twitter card

---

## Media Library

| Aspek           | Detail                        |
| --------------- | ----------------------------- |
| **Tipe**        | Gambar, video, dokumen        |
| **Upload**      | Drag & drop, paste, browse    |
| **Organize**    | Folder / tag                  |
| **Search**      | Cari by nama, tipe, tanggal   |
| **Bulk Action** | Select multiple, delete, move |
| **Image Edit**  | Crop, resize (basic)          |
| **Alt Text**    | Wajib untuk accessibility     |
| **CDN**         | Serve dari CDN untuk performa |

---

## API

### Public API (Read)

| Method | Path                  | Deskripsi            |
| ------ | --------------------- | -------------------- |
| `GET`  | `/api/v1/posts`       | List published posts |
| `GET`  | `/api/v1/posts/:slug` | Post detail          |
| `GET`  | `/api/v1/categories`  | List categories      |
| `GET`  | `/api/v1/tags`        | List tags            |

### Admin API (CRUD)

| Method   | Path                                       | Auth    | Deskripsi        |
| -------- | ------------------------------------------ | ------- | ---------------- |
| `POST`   | `/api/v1/admin/posts`                      | Editor+ | Create post      |
| `PUT`    | `/api/v1/admin/posts/:id`                  | Editor+ | Update post      |
| `DELETE` | `/api/v1/admin/posts/:id`                  | Admin   | Delete post      |
| `PUT`    | `/api/v1/admin/posts/:id/publish`          | Editor+ | Publish          |
| `PUT`    | `/api/v1/admin/posts/:id/unpublish`        | Editor+ | Unpublish        |
| `GET`    | `/api/v1/admin/posts/:id/revisions`        | Editor+ | List revisions   |
| `PUT`    | `/api/v1/admin/posts/:id/restore/:version` | Editor+ | Restore revision |

---

## Caching Strategy

| Konten               | Cache           | TTL                 | Invalidation         |
| -------------------- | --------------- | ------------------- | -------------------- |
| Published posts list | CDN + in-memory | 5 menit             | On publish/unpublish |
| Post detail          | CDN + in-memory | 10 menit            | On update            |
| Categories           | CDN + in-memory | 1 jam               | On CRUD              |
| Tags                 | In-memory       | 1 jam               | On CRUD              |
| Media                | CDN             | 1 tahun (immutable) | —                    |

---

## Permissions

| Action            | Viewer | Editor                   | Admin  |
| ----------------- | ------ | ------------------------ | ------ |
| Read published    | ✅     | ✅                       | ✅     |
| Read drafts       | ❌     | Own only                 | ✅ All |
| Create            | ❌     | ✅                       | ✅     |
| Edit              | ❌     | Own only                 | ✅ All |
| Delete            | ❌     | ❌                       | ✅     |
| Publish           | ❌     | ✅ (atau perlu approval) | ✅     |
| Manage categories | ❌     | ❌                       | ✅     |
| Manage media      | ❌     | ✅ Own                   | ✅ All |

---

> CMS harus diuji dengan konten nyata termasuk konten panjang, multi-media, dan edge case formatting sebelum launch **{{projectName}}**.
