# Progress — {{projectName}}

## Status Keseluruhan

| Aspek        | Status                     |
| ------------ | -------------------------- |
| Spesifikasi  | Selesai — dokumen tersedia |
| Implementasi | Belum dimulai              |
| Testing      | Belum dimulai              |
| Deployment   | Belum dimulai              |

**Tipe:** {{webTypeLabel}} | **Kompleksitas:** {{complexity}} | **Rendering:** {{renderingStrategy}}

## Task per Fase

### Fase 1 — Setup dan Fondasi

| Task            | Tujuan                                     | Status            | Bukti   |
| --------------- | ------------------------------------------ | ----------------- | ------- |
| T-1.1           | Inisialisasi project dan CI                | pending           | —       |
| T-1.2           | Setup teknologi stack                      | pending           | —       |
| T-1.3           | Konfigurasi linter, formatter, typecheck   | pending           | —       |
| T-1.4           | Setup environment variables                | pending           | —       |
| T-1.5           | Implementasi design tokens                 | pending           | —       |
| T-1.6           | Layout dasar: container, grid, breakpoints | pending           | —       |
| T-1.7           | Komponen navigasi dan routing              | pending           | —       |
| {{#if hasAuth}} | T-1.8                                      | Setup autentikasi | pending | —   |
{{/if}}

### Fase 2 — Fitur Inti

| Task  | Tujuan                                                                | Status  | Bukti |
| ----- | --------------------------------------------------------------------- | ------- | ----- |
| T-2.1 | Halaman utama responsif                                               | pending | —     |
| T-2.2 | Navigasi lengkap                                                      | pending | —     |
| T-2.3 | Aksesibilitas dasar                                                   | pending | —     |
| T-2.4 | {{#if hasAuth}}Alur autentikasi{{else}}Konten halaman{{/if}}          | pending | —     |
| T-2.5 | {{#if hasPayments}}Integrasi pembayaran{{else}}Form kontak/CTA{{/if}} | pending | —     |

### Fase 3 — Fitur Pendukung

| Task  | Tujuan                                                                   | Status  | Bukti |
| ----- | ------------------------------------------------------------------------ | ------- | ----- |
| T-3.1 | {{#if hasSearch}}Pencarian konten{{else}}Optimasi performa{{/if}}        | pending | —     |
| T-3.2 | {{#if hasAdmin}}Panel admin{{else}}Footer dan informasi{{/if}}           | pending | —     |
| T-3.3 | {{#if hasCms}}CMS{{else}}Halaman error{{/if}}                            | pending | —     |
| T-3.4 | {{#if hasUploads}}Upload file{{else}}SEO metadata{{/if}}                 | pending | —     |
| T-3.5 | {{#if hasNotifications}}Notifikasi{{else}}Progressive enhancement{{/if}} | pending | —     |

### Fase 4 — Polish dan Deploy

| Task  | Tujuan                    | Status  | Bukti |
| ----- | ------------------------- | ------- | ----- |
| T-4.1 | Testing lengkap           | pending | —     |
| T-4.2 | Security audit            | pending | —     |
| T-4.3 | Performa measurement      | pending | —     |
| T-4.4 | Aksesibilitas audit final | pending | —     |
| T-4.5 | Setup staging             | pending | —     |
| T-4.6 | Smoke test staging        | pending | —     |
| T-4.7 | Produksi deploy           | pending | —     |

## Blocker

{{#if missingInfo}}
| No                    | Blocker     | Dampak            | Status          |
| --------------------- | ----------- | ----------------- | --------------- |
| {{#each missingInfo}} | {{@index1}} | {{this.question}} | {{this.impact}} | Menunggu konfirmasi |
{{/each}}
{{else}}
Tidak ada blocker saat ini.
{{/if}}

## Catatan

- Semua task berstatus **pending** — spesifikasi bukan bukti implementasi
- Status diperbarui saat task selesai dengan bukti (command, screenshot, test result)
- Blocker P0 diselesaikan sebelum melanjutkan fase berikutnya
- Detail task tersedia di [implementation-plan.md](implementation-plan.md)
- Kriteria penerimaan di [acceptance.md](acceptance.md)
