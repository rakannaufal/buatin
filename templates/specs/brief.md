# {{projectName}}

## Ringkasan

{{{brief}}}

## Tipe Website

- **Tipe:** {{webTypeLabel}}
- **Deskripsi:** {{webTypeDescription}}

## Ruang Lingkup

| Aspek                      | Detail                               |
| -------------------------- | ------------------------------------ |
| Perangkat                  | Desktop, tablet, mobile (responsive) |
| Bahasa                     | {{language}}                         |
| Kompleksitas               | {{complexity}}                       |
| {{#if hasI18n}}            | Internasionalisasi                   | Ya — multi-bahasa            |
| {{/if}}{{#if hasAuth}}     | Autentikasi                          | Ya — login/register pengguna |
| {{/if}}{{#if hasPayments}} | Pembayaran                           | Ya — transaksi online        |
| {{/if}}{{#if hasAdmin}}    | Panel Admin                          | Ya — manajemen konten/data   |
{{/if}}

{{#if hasReferences}}
## Referensi

| No                   | Nama        | Peran         | Sumber        | Status           |
| -------------------- | ----------- | ------------- | ------------- | ---------------- |
| {{#each references}} | {{@index1}} | {{this.name}} | {{this.role}} | {{this.sourceUrl | fallback "—"}} | {{this.status}} |
{{/each}}
{{/if}}

## Informasi Belum Tersedia

{{#if assumptions}}
### Asumsi yang Digunakan

{{#each assumptions}}
- **A-{{@index1}}:** {{this}}
{{/each}}
{{/if}}

{{#if missingInfo}}
### Informasi yang Perlu Dikonfirmasi

| No                    | Pertanyaan  | Dampak            |
| --------------------- | ----------- | ----------------- |
| {{#each missingInfo}} | {{@index1}} | {{this.question}} | {{this.impact}} |
{{/each}}
{{else}}
Tidak ada informasi kritis yang belum tersedia saat ini.
{{/if}}
