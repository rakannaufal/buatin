# Rencana Implementasi — {{projectName}}

## Urutan

### Fase 1 — Setup dan Fondasi

| Task            | Tujuan                                                                             | REQ                                      | Dependency |
| --------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- | ---------- |
| T-1.1           | Inisialisasi project, setup repository dan CI                                      | —                                        | —          |
| T-1.2           | Setup teknologi stack sesuai [architecture.md](architecture.md)                    | —                                        | T-1.1      |
| T-1.3           | Konfigurasi linter, formatter, typecheck                                           | —                                        | T-1.1      |
| T-1.4           | Setup environment variables dan `.env.example`                                     | —                                        | T-1.1      |
| T-1.5           | Implementasi design tokens (warna, tipografi, spacing) dari [design.md](design.md) | —                                        | T-1.2      |
| T-1.6           | Layout dasar: container, grid, breakpoints                                         | REQ-01                                   | T-1.5      |
| T-1.7           | Komponen navigasi dan routing                                                      | REQ-02                                   | T-1.6      |
| {{#if hasAuth}} | T-1.8                                                                              | Setup autentikasi dan session management | REQ-04     | T-1.2 |
{{/if}}

### Fase 2 — Fitur Inti

| Task                       | Tujuan                                              | REQ                                                 | Dependency   |
| -------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------ |
| T-2.1                      | Halaman utama lengkap dan responsif                 | REQ-01                                              | T-1.6, T-1.7 |
| T-2.2                      | Navigasi lengkap (desktop, mobile, keyboard)        | REQ-02                                              | T-1.7        |
| T-2.3                      | Aksesibilitas dasar: kontras, focus, label, heading | REQ-03                                              | T-2.1        |
| {{#if hasAuth}}            | T-2.4                                               | Alur registrasi, login, logout, password recovery   | REQ-04       | T-1.8 |
| {{else}}                   | T-2.4                                               | Halaman konten dan struktur informasi               | REQ-04       | T-2.1 |
| {{/if}}{{#if hasPayments}} | T-2.5                                               | Integrasi pembayaran: checkout, webhook, konfirmasi | REQ-05       | T-2.4 |
| {{else}}                   | T-2.5                                               | Form kontak/CTA dengan validasi dan feedback        | REQ-05       | T-2.1 |
{{/if}}

### Fase 3 — Fitur Pendukung

| Task                            | Tujuan | REQ                                              | Dependency |
| ------------------------------- | ------ | ------------------------------------------------ | ---------- |
| {{#if hasSearch}}               | T-3.1  | Pencarian konten: indexing, query, results       | REQ-06     | T-2.1 |
| {{else}}                        | T-3.1  | Optimasi performa: bundle, images, caching       | REQ-06     | T-2.1 |
| {{/if}}{{#if hasAdmin}}         | T-3.2  | Panel admin: CRUD, RBAC, audit log               | REQ-07     | T-2.4 |
| {{else}}                        | T-3.2  | Footer dan informasi kontak                      | REQ-07     | T-2.1 |
| {{/if}}{{#if hasCms}}           | T-3.3  | CMS: editor, preview, publish                    | REQ-08     | T-3.2 |
| {{else}}                        | T-3.3  | Halaman error (404, 500) dengan navigasi kembali | REQ-08     | T-2.1 |
| {{/if}}{{#if hasUploads}}       | T-3.4  | Upload file: validasi, storage, akses            | REQ-09     | T-2.4 |
| {{else}}                        | T-3.4  | SEO metadata dan Open Graph tags                 | REQ-09     | T-2.1 |
| {{/if}}{{#if hasNotifications}} | T-3.5  | Notifikasi: email/push, preferensi               | REQ-10     | T-2.4 |
| {{else}}                        | T-3.5  | Progressive enhancement dan fallback             | REQ-10     | T-2.1 |
{{/if}}

### Fase 4 — Polish dan Deploy

| Task  | Tujuan                                                      | REQ    | Dependency |
| ----- | ----------------------------------------------------------- | ------ | ---------- |
| T-4.1 | Testing lengkap: unit, integration, E2E                     | Semua  | T-3.x      |
| T-4.2 | Security audit: uji negatif dari [security.md](security.md) | Semua  | T-3.x      |
| T-4.3 | Performa: LCP, CLS, INP measurement                         | REQ-06 | T-4.1      |
| T-4.4 | Aksesibilitas audit final                                   | REQ-03 | T-4.1      |
| T-4.5 | Setup staging environment                                   | —      | T-4.1      |
| T-4.6 | Smoke test di staging                                       | —      | T-4.5      |
| T-4.7 | Produksi deploy                                             | —      | T-4.6      |

## Kontrak Task

| Task  | File/Modul                | REQ    | AC    | TEST    | Owner  | Status  |
| ----- | ------------------------- | ------ | ----- | ------- | ------ | ------- |
| T-1.1 | Project root, CI          | —      | —     | —       | Dev    | pending |
| T-1.2 | Config, dependencies      | —      | —     | —       | Dev    | pending |
| T-1.5 | `styles/tokens`           | —      | —     | —       | Dev    | pending |
| T-1.6 | `components/layout`       | REQ-01 | AC-01 | TEST-01 | Dev    | pending |
| T-1.7 | `components/nav`          | REQ-02 | AC-02 | TEST-02 | Dev    | pending |
| T-2.1 | `app/page`                | REQ-01 | AC-01 | TEST-01 | Dev    | pending |
| T-2.2 | `components/nav`          | REQ-02 | AC-02 | TEST-02 | Dev    | pending |
| T-2.3 | Global styles, components | REQ-03 | AC-03 | TEST-03 | Dev    | pending |
| T-2.4 | Sesuai fitur              | REQ-04 | AC-04 | TEST-04 | Dev    | pending |
| T-2.5 | Sesuai fitur              | REQ-05 | AC-05 | TEST-05 | Dev    | pending |
| T-3.1 | Sesuai fitur              | REQ-06 | AC-06 | TEST-06 | Dev    | pending |
| T-3.2 | Sesuai fitur              | REQ-07 | AC-07 | TEST-07 | Dev    | pending |
| T-3.3 | Sesuai fitur              | REQ-08 | AC-08 | TEST-08 | Dev    | pending |
| T-3.4 | Sesuai fitur              | REQ-09 | AC-09 | TEST-09 | Dev    | pending |
| T-3.5 | Sesuai fitur              | REQ-10 | AC-10 | TEST-10 | Dev    | pending |
| T-4.1 | `tests/`                  | Semua  | Semua | Semua   | Dev    | pending |
| T-4.7 | Deployment                | —      | —     | —       | DevOps | pending |

## Persiapan Rilis

- [ ] Environment variables produksi dikonfigurasi (tanpa secrets di repo)
- [ ] `.env.example` lengkap dan terdokumentasi
      {{#if hasAuth}}- [ ] Auth provider produksi dikonfigurasi
      {{/if}}{{#if hasPayments}}- [ ] Payment gateway mode produksi aktif
      {{/if}}- [ ] Database migration dijalankan
- [ ] Staging smoke test lulus
- [ ] CI hijau: format, lint, typecheck, test, build
- [ ] Security audit dependency
- [ ] HTTPS dan domain dikonfigurasi
- [ ] Monitoring dan logging aktif
- [ ] Prosedur backup dan restore diuji
- [ ] Prosedur rollback tersedia

## Status

Semua task berstatus **pending**. Spesifikasi ini adalah rencana, bukan bukti implementasi. Status diperbarui di [progress.md](progress.md) saat implementasi berjalan.
