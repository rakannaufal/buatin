# Arsitektur — {{projectName}}

## Konteks Sistem

**{{webTypeLabel}}** — {{webTypeDescription}}

Strategi rendering: **{{renderingStrategy}}**

Sistem ini melayani pengguna melalui browser (desktop/tablet/mobile) dengan koneksi internet standar. Komponen utama:

- **Frontend:** Aplikasi web responsif
- **Backend/API:** Server-side logic dan data{{#if hasAuth}}
- **Auth:** Layanan autentikasi dan otorisasi{{/if}}{{#if hasPayments}}
- **Payment:** Integrasi payment gateway{{/if}}{{#if hasUploads}}
- **Storage:** Penyimpanan file/media{{/if}}{{#if hasRealtime}}
- **Realtime:** WebSocket/SSE untuk data real-time{{/if}}{{#if hasBackgroundJobs}}
- **Worker:** Background job processing{{/if}}{{#if hasSearch}}
- **Search:** Layanan pencarian{{/if}}

## Pilihan Teknologi

| Kategori             | Teknologi | Catatan  |
| -------------------- | --------- | -------- |
| {{#each technology}} | {{@key}}  | {{this}} | —   |
{{/each}}

{{#if additionalTechnology}}
**Teknologi tambahan:** {{additionalTechnology}}
{{/if}}

{{#if lockedTechnology}}
**Pilihan terkunci (manual):**
{{#each lockedTechnology}}
- {{this}}
{{/each}}
{{/if}}

## Rendering

Strategi rendering **{{renderingStrategy}}** diterapkan per halaman berdasarkan karakteristik konten:

{{#if isLanding}}
| Halaman                    | Strategi   | Alasan                                    |
| -------------------------- | ---------- | ----------------------------------------- |
| Landing/Homepage           | SSG        | Konten statis, performa optimal untuk LCP |
| Kontak                     | SSG        | Form statis, submit via API               |
| {{/if}}{{#if isEcommerce}} |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Homepage                   | SSG/ISR    | Konten semi-statis, revalidasi berkala    |
| Katalog produk             | SSR        | Data dinamis, SEO penting                 |
| Detail produk              | SSR/ISR    | SEO + data harga real-time                |
| Keranjang                  | CSR        | State klien, tidak perlu SEO              |
| Checkout                   | CSR        | Interaksi kompleks, data sensitif         |
| Akun pengguna              | CSR        | Data privat, tidak di-index               |
| {{/if}}{{#if isSaas}}      |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Landing/Marketing          | SSG        | Performa SEO optimal                      |
| Login/Register             | CSR        | Interaksi form, tidak perlu SEO           |
| Dashboard                  | CSR        | Data dinamis per pengguna                 |
| Settings                   | CSR        | Data privat pengguna                      |
| Docs/Help                  | SSG        | Konten statis, SEO penting                |
| {{/if}}{{#if isBlog}}      |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Daftar artikel             | SSG/ISR    | Konten jarang berubah, SEO penting        |
| Detail artikel             | SSG        | Konten statis per artikel                 |
| Pencarian                  | CSR        | Interaksi dinamis                         |
| Admin/Editor               | CSR        | Tidak perlu SEO                           |
| {{/if}}{{#if isCompany}}   |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Semua halaman              | SSG        | Konten statis, performa optimal           |
| Kontak                     | SSG        | Form submit via API                       |
| {{/if}}{{#if isPortfolio}} |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Semua halaman              | SSG        | Konten statis, performa optimal           |
| Detail proyek              | SSG        | Konten per proyek, SEO penting            |
| {{/if}}{{#if isBooking}}   |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Landing                    | SSG        | Performa optimal                          |
| Pilih layanan/jadwal       | SSR        | Data ketersediaan real-time               |
| Konfirmasi booking         | CSR        | Interaksi form, data sensitif             |
| Dashboard user             | CSR        | Data privat                               |
| {{/if}}{{#if isInternal}}  |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Login                      | CSR        | Tidak perlu SEO                           |
| Semua halaman internal     | CSR        | Data dinamis, privat                      |
| {{/if}}{{#if isCustom}}    |
| Halaman                    | Strategi   | Alasan                                    |
| ---------                  | ---------- | --------                                  |
| Halaman publik             | SSG/SSR    | Sesuai kebutuhan SEO                      |
| Halaman interaktif         | CSR        | Data dinamis per pengguna                 |
{{/if}}

## Struktur dan Integrasi

### Struktur Direktori

```
├── src/
│   ├── app/            # Routes dan pages
│   ├── components/     # Komponen UI
│   ├── lib/            # Utilities dan helpers
│   ├── styles/         # Global styles dan tokens
│   └── types/          # TypeScript types
├── public/             # Aset statis
└── tests/              # Test files
```

### Integrasi

{{#if hasAuth}}- **Autentikasi:** Session/JWT management, RBAC, protected routes
{{/if}}{{#if hasPayments}}- **Pembayaran:** Payment gateway webhook, verifikasi transaksi, idempotensi
{{/if}}{{#if hasUploads}}- **Upload:** Validasi file, storage, akses terkontrol
{{/if}}{{#if hasSearch}}- **Pencarian:** Indexing, query, relevance ranking
{{/if}}{{#if hasNotifications}}- **Notifikasi:** Email/push delivery, preferensi pengguna
{{/if}}{{#if hasRealtime}}- **Realtime:** WebSocket connection, reconnection, state sync
{{/if}}{{#if hasAnalytics}}- **Analitik:** Event tracking, privacy-compliant
{{/if}}

### Environment Variables

Semua secrets disimpan di environment variables, tidak dalam kode atau bundle client. File `.env.example` menyediakan daftar variabel tanpa nilai.

## Risiko

{{#if risks}}
{{#each risks}}
- **R-{{@index1}}:** {{this}}
{{/each}}
{{else}}
- **R-1:** Ketergantungan pada layanan pihak ketiga yang belum dikonfirmasi
- **R-2:** Kompleksitas integrasi mungkin meningkat saat implementasi
{{/if}}

Keputusan arsitektur tercatat di [decisions.md](decisions.md). Verifikasi dilakukan setelah implementasi, bukan pada saat pembuatan spesifikasi.
