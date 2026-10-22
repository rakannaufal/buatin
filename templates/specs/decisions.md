# Keputusan Arsitektur — {{projectName}}

## Register Keputusan

### D-001: Technology Stack

- **Status:** proposed
- **Konteks:** Proyek {{webTypeLabel}} membutuhkan teknologi yang sesuai dengan kompleksitas {{complexity}} dan strategi rendering {{renderingStrategy}}.
- **Kebutuhan terkait:** REQ-01, REQ-06
- **Opsi:**
  {{#each technology}} - {{@key}}: **{{this}}**
{{/each}}
- **Keputusan:** Menggunakan stack yang dipilih berdasarkan kebutuhan proyek.
- **Alasan:** Stack dipilih berdasarkan kesesuaian dengan tipe {{webTypeLabel}}, dukungan rendering {{renderingStrategy}}, dan ekosistem yang matang.
- **Dampak:** Seluruh implementasi mengikuti stack ini. Perubahan stack setelah fase 2 memerlukan refactor signifikan.
{{#if lockedTechnology}}
- **Pilihan terkunci:** {{#each lockedTechnology}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

### D-002: Rendering Strategy

- **Status:** proposed
- **Konteks:** Perlu menentukan strategi rendering per halaman untuk keseimbangan performa, SEO, dan interaktivitas.
- **Kebutuhan terkait:** REQ-01, REQ-06
- **Opsi:**
  - Full SSG — performa optimal, tidak cocok untuk data dinamis
  - Full SSR — SEO baik, beban server tinggi
  - Full CSR — interaktif, SEO lemah tanpa SSR
  - Hybrid — per halaman sesuai kebutuhan
- **Keputusan:** **{{renderingStrategy}}** — setiap halaman menggunakan strategi yang paling sesuai.
- **Alasan:** Hybrid memberikan fleksibilitas optimal: SSG untuk konten statis (performa + SEO), SSR untuk data dinamis yang perlu SEO, CSR untuk interaksi privat.
- **Dampak:** Detail pemetaan per halaman di [architecture.md](architecture.md).

{{#if hasAuth}}
### D-003: Metode Autentikasi

- **Status:** proposed
- **Konteks:** Aplikasi membutuhkan autentikasi pengguna untuk melindungi resource.
- **Kebutuhan terkait:** REQ-04
- **Opsi:**
  - Session-based — cookie httpOnly, server state
  - JWT — stateless, perlu refresh strategy
  - OAuth/SSO — delegasi ke provider
  - Passwordless — magic link/OTP
- **Keputusan:** Ditentukan saat implementasi berdasarkan stack dan kebutuhan spesifik.
- **Alasan:** Pilihan bergantung pada provider yang tersedia dan kebutuhan skalabilitas.
- **Dampak:** Mempengaruhi session management, RBAC, dan kontrol keamanan di [security.md](security.md).
{{else}}
### D-003: Strategi Konten

- **Status:** proposed
- **Konteks:** Website perlu strategi pengelolaan konten yang efisien.
- **Kebutuhan terkait:** REQ-04, REQ-08
- **Opsi:**
  - File-based (Markdown/MDX)
  - Headless CMS
  - Database-driven
- **Keputusan:** Ditentukan berdasarkan frekuensi update dan pengelola konten.
- **Alasan:** Konten statis cocok dengan file-based, konten dinamis memerlukan CMS.
- **Dampak:** Mempengaruhi build pipeline dan workflow editor.
{{/if}}

### D-004: Pendekatan Styling

- **Status:** proposed
- **Konteks:** Perlu pendekatan styling yang konsisten, maintainable, dan performant.
- **Kebutuhan terkait:** REQ-01, REQ-03
- **Opsi:**
  - CSS Modules — scoped, no runtime
  - Tailwind CSS — utility-first, build-time
  - CSS-in-JS — dynamic, runtime cost
  - Vanilla CSS/SCSS — tradisional, no abstraksi
- **Keputusan:** Sesuai pilihan teknologi di D-001.
- **Alasan:** Pendekatan harus mendukung design tokens dari [design.md](design.md), aksesibilitas, dan performa rendering.
- **Dampak:** Struktur file styles, komponen, dan build pipeline.
{{#if lockedStyle}}
- **Style terkunci:** {{#each lockedStyle}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

### D-005: Deployment

- **Status:** proposed
- **Konteks:** Perlu strategi deployment yang sesuai dengan stack dan kebutuhan operasional.
- **Kebutuhan terkait:** REQ-01
- **Opsi:**
  - Static hosting (Vercel, Netlify, Cloudflare Pages)
  - Container (Docker + cloud provider)
  - Serverless functions
  - VPS tradisional
- **Keputusan:** Ditentukan berdasarkan stack, kebutuhan server-side, dan anggaran.
- **Alasan:** Pilihan deployment harus mendukung strategi rendering ({{renderingStrategy}}) dan fitur yang dipilih.
- **Dampak:** CI/CD pipeline, environment management, scaling strategy, biaya operasional.

## Asumsi

{{#if assumptions}}
| ID                    | Asumsi        | Dampak Jika Salah | Konfirmasi                             |
| --------------------- | ------------- | ----------------- | -------------------------------------- |
| {{#each assumptions}} | A-{{@index1}} | {{this}}          | Perlu evaluasi ulang keputusan terkait | Perlu dikonfirmasi oleh stakeholder |
{{/each}}
{{else}}
Tidak ada asumsi kritis yang tercatat saat ini. Asumsi akan ditambahkan saat muncul selama implementasi.
{{/if}}

## Konflik

| Konflik                   | Opsi                                            | Prioritas                                      |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Performa vs fitur dinamis | SSG untuk statis, SSR/CSR untuk dinamis (D-002) | Performa — optimasi sesuai kebutuhan halaman   |
| Keamanan vs kemudahan     | Validasi ketat di server, UX di client          | Keamanan — tanpa kompromi pada validasi server |
| Kompleksitas vs waktu     | MVP first, fitur lanjutan kemudian              | Waktu — selesaikan MVP sebelum ekspansi        |

Keputusan berstatus **proposed** sampai diimplementasikan dan diverifikasi. Perubahan keputusan dicatat dengan alasan dan dampak.
