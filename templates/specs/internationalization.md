# Spesifikasi Internationalization (i18n) — {{projectName}}

> Dokumen ini mendefinisikan strategi internationalization dan localization untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Bahasa yang Didukung

| Kode | Bahasa           | Status          | Arah | Fallback |
| ---- | ---------------- | --------------- | ---- | -------- |
| `id` | Bahasa Indonesia | Default         | LTR  | —        |
| `en` | English          | Prioritas kedua | LTR  | `id`     |

> Tambahkan bahasa sesuai kebutuhan pasar. Setiap bahasa baru memerlukan terjemahan lengkap sebelum diaktifkan.

---

## Strategi i18n

### Arsitektur

| Aspek            | Keputusan                                                     |
| ---------------- | ------------------------------------------------------------- |
| **Library**      | `next-intl` / `react-i18next` / `vue-i18n` (sesuai framework) |
| **Format File**  | JSON (key-value)                                              |
| **Struktur Key** | Dot-notation hierarkis (`page.section.element`)               |
| **Fallback**     | Bahasa default (`id`) jika terjemahan tidak tersedia          |
| **Lazy Loading** | Load terjemahan per halaman/namespace untuk performa          |
| **SSR**          | Bahasa ditentukan di server berdasarkan URL/cookie            |

### URL Strategy

| Opsi              | Contoh                             | Dipilih          |
| ----------------- | ---------------------------------- | ---------------- |
| **Subdirectory**  | `/id/products`, `/en/products`     | ✅ Rekomendasi   |
| **Subdomain**     | `id.example.com`, `en.example.com` | Opsional         |
| **Parameter**     | `?lang=id`                         | Tidak disarankan |
| **Cookie/header** | Accept-Language                    | Sebagai fallback |

### Deteksi Bahasa (Urutan Prioritas)

1. URL path prefix (`/en/...`)
2. User preference (saved di profil/cookie)
3. `Accept-Language` header dari browser
4. Default: `id` (Bahasa Indonesia)

---

## Struktur File Terjemahan

### Direktori

```
locales/
  ├── id/
  │   ├── common.json      # Label umum, navigasi
  │   ├── auth.json         # Halaman autentikasi
  │   ├── validation.json   # Pesan validasi
  │   ├── errors.json       # Pesan error
  │   └── ...per halaman/fitur
  ├── en/
  │   ├── common.json
  │   ├── auth.json
  │   ├── validation.json
  │   ├── errors.json
  │   └── ...
  └── ...bahasa lain
```

### Contoh Format

```json
// locales/id/common.json
{
  "nav": {
    "home": "Beranda",
    "about": "Tentang",
    "contact": "Kontak",
    "login": "Masuk",
    "register": "Daftar",
    "logout": "Keluar"
  },
  "action": {
    "save": "Simpan",
    "cancel": "Batal",
    "delete": "Hapus",
    "edit": "Edit",
    "search": "Cari",
    "loadMore": "Muat Lebih Banyak"
  },
  "status": {
    "loading": "Memuat...",
    "success": "Berhasil!",
    "error": "Terjadi kesalahan"
  }
}
```

### Konvensi Penamaan Key

| Konvensi          | Contoh                           |
| ----------------- | -------------------------------- |
| Hierarkis         | `page.section.element`           |
| camelCase         | `loadMore`, `signUp`             |
| Deskriptif        | `checkout.shippingAddress.label` |
| Hindari singkatan | `button` bukan `btn`             |

---

## Fitur i18n

### Interpolasi

```json
{
  "greeting": "Halo, {name}!",
  "itemCount": "Anda memiliki {count} item",
  "price": "Harga: {amount}"
}
```

### Pluralisasi

```json
{
  "item": {
    "zero": "Tidak ada item",
    "one": "{count} item",
    "other": "{count} item"
  }
}
```

> Bahasa Indonesia tidak memiliki bentuk plural morfologis, tapi penting untuk bahasa lain (English: 1 item / 2 items).

### Format Angka & Mata Uang

| Locale  | Angka       | Mata Uang      | Contoh                         |
| ------- | ----------- | -------------- | ------------------------------ |
| `id-ID` | `1.000.000` | `Rp 1.000.000` | Titik sebagai separator ribuan |
| `en-US` | `1,000,000` | `$1,000,000`   | Koma sebagai separator ribuan  |

```javascript
// Gunakan Intl.NumberFormat
new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
}).format(1000000);
// → "Rp 1.000.000,00"
```

### Format Tanggal & Waktu

| Locale  | Tanggal          | Waktu       | Relatif           |
| ------- | ---------------- | ----------- | ----------------- |
| `id-ID` | `15 Maret 2024`  | `14:30 WIB` | `2 jam yang lalu` |
| `en-US` | `March 15, 2024` | `2:30 PM`   | `2 hours ago`     |

```javascript
// Gunakan Intl.DateTimeFormat
new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
}).format(date);
// → "15 Maret 2024"
```

### Timezone

| Aspek         | Implementasi                                       |
| ------------- | -------------------------------------------------- |
| **Storage**   | Simpan semua waktu di UTC                          |
| **Display**   | Konversi ke timezone user saat tampilkan           |
| **Default**   | `Asia/Jakarta` (WIB, UTC+7)                        |
| **Detection** | `Intl.DateTimeFormat().resolvedOptions().timeZone` |

---

## Konten yang Perlu Diterjemahkan

| Tipe Konten         | Metode                      | Catatan              |
| ------------------- | --------------------------- | -------------------- |
| **UI Labels**       | File JSON                   | Otomatis via library |
| **Validasi**        | File JSON                   | Dengan parameter     |
| **Error messages**  | File JSON                   | Dengan kode error    |
| **Email templates** | File template per locale    | Termasuk subject     |
| **SEO meta**        | Per halaman per locale      | Title, description   |
| **Legal pages**     | Halaman terpisah per locale | Privacy, Terms       |
{{#if isEcommerce}}
| **Produk** | Database (multi-column atau tabel terpisah) | Nama, deskripsi |
| **Kategori** | Database | Nama, slug |
{{/if}}
{{#if hasCms}}
| **Artikel** | Database (post per locale atau field terpisah) | Full content |
{{/if}}
| **Notifikasi** | Template per locale | Push, email |

---

## SEO Multilingual

### Meta Tags

```html
<!-- Halaman /id/products -->
<html lang="id">
  <head>
    <link
      rel="alternate"
      hreflang="id"
      href="https://example.com/id/products"
    />
    <link
      rel="alternate"
      hreflang="en"
      href="https://example.com/en/products"
    />
    <link
      rel="alternate"
      hreflang="x-default"
      href="https://example.com/products"
    />
  </head>
</html>
```

### Sitemap

```xml
<url>
  <loc>https://example.com/id/products</loc>
  <xhtml:link rel="alternate" hreflang="id" href="https://example.com/id/products"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/products"/>
</url>
```

---

## UI Language Switcher

| Aspek           | Implementasi                                                            |
| --------------- | ----------------------------------------------------------------------- |
| **Lokasi**      | Header/footer, mudah diakses                                            |
| **Tampilan**    | Dropdown dengan flag + nama bahasa                                      |
| **Behavior**    | Navigasi ke halaman yang sama di bahasa lain                            |
| **Persistence** | Simpan di cookie + user preference (jika login)                         |
| **Label**       | Tampilkan nama bahasa dalam bahasa itu sendiri ("Indonesia", "English") |

---

## Workflow Terjemahan

### Proses

```
1. Developer tambah key baru di locale default (id)
2. Key otomatis ditandai "untranslated" di locale lain
3. Translator menerjemahkan via tool (Crowdin/Lokalise) atau manual
4. Review oleh native speaker
5. Merge ke codebase
6. CI/CD check: semua key terisi di semua locale
```

### Quality Checks

| Check                  | Tool                    | Kapan             |
| ---------------------- | ----------------------- | ----------------- |
| Missing keys           | CI script / i18n linter | Setiap PR         |
| Unused keys            | CI script               | Mingguan          |
| Key format consistency | Linter                  | Setiap PR         |
| Placeholder mismatch   | CI script               | Setiap PR         |
| Character length       | Manual review           | Setiap terjemahan |

---

## Environment Variables

| Variable            | Deskripsi                                 |
| ------------------- | ----------------------------------------- |
| `DEFAULT_LOCALE`    | Bahasa default (`id`)                     |
| `SUPPORTED_LOCALES` | Daftar bahasa aktif (`id,en`)             |
| `FALLBACK_LOCALE`   | Fallback jika terjemahan tidak ada (`id`) |

---

> Pastikan semua konten user-facing sudah diterjemahkan sebelum mengaktifkan bahasa baru di **{{projectName}}**.
