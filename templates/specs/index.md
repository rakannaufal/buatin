# {{projectName}}

## Mulai dari pemasangan skill

Baca [SKILLS.md](../SKILLS.md), pasang skill yang belum tersedia dan verifikasi
sebelum menjalankan perintah proyek. Aturan lengkap ada di [AGENTS.md](../AGENTS.md).

## Proyek

| Aspek        | Detail                |
| ------------ | --------------------- |
| Nama         | {{projectName}}       |
| Tipe         | {{webTypeLabel}}      |
| Kompleksitas | {{complexity}}        |
| Bahasa       | {{language}}          |
| Rendering    | {{renderingStrategy}} |

{{summary}}

## Sumber Utama

### Teknologi

| Kategori             | Teknologi |
| -------------------- | --------- |
| {{#each technology}} | {{@key}}  | {{this}} |
{{/each}}

### Desain

| Properti        | Nilai                |
| --------------- | -------------------- |
| Heading font    | {{headingFont}}      |
| Body font       | {{bodyFont}}         |
| Warna primer    | `{{primaryColor}}`   |
| Warna sekunder  | `{{secondaryColor}}` |
| Container width | {{containerWidth}}px |
| Spacing         | {{spacing}}px        |

### Fitur yang Dipilih

{{#if hasAuth}}- Autentikasi
{{/if}}{{#if hasPayments}}- Pembayaran
{{/if}}{{#if hasSearch}}- Pencarian
{{/if}}{{#if hasAdmin}}- Panel Admin
{{/if}}{{#if hasCms}}- CMS
{{/if}}{{#if hasUploads}}- Upload File
{{/if}}{{#if hasNotifications}}- Notifikasi
{{/if}}{{#if hasRealtime}}- Realtime
{{/if}}{{#if hasBackgroundJobs}}- Background Jobs
{{/if}}{{#if hasAnalytics}}- Analitik
{{/if}}{{#if hasI18n}}- Internasionalisasi
{{/if}}{{#if hasAiFeatures}}- AI Features
{{/if}}{{#if hasMultitenancy}}- Multi-tenancy
{{/if}}{{#if hasPwaOffline}}- PWA/Offline
{{/if}}

{{#if hasReferences}}
### Referensi

{{#each references}}- **{{this.name}}** ({{this.role}}): {{this.note | fallback "—"}}
{{/each}}
{{/if}}

## Versi dan Status

| Aspek        | Status                  |
| ------------ | ----------------------- |
| Spesifikasi  | Tersedia — perlu review |
| Implementasi | Belum dimulai           |
| Testing      | Belum dimulai           |
| Deployment   | Belum dimulai           |

{{#if assumptions}}
### Asumsi

{{#each assumptions}}- {{this}}
{{/each}}
{{/if}}

{{#if missingInfo}}
### Informasi yang Perlu Dikonfirmasi

{{#each missingInfo}}- **{{this.question}}** — {{this.impact}}
{{/each}}
{{/if}}

Paket spesifikasi ini adalah rencana dan rekomendasi. Website target belum dibangun, diuji, atau diterbitkan oleh generator.
