# Desain Visual — {{projectName}}

## Arah Visual

**Arah:** {{style.direction | fallback "Modern dan profesional"}}

**Tema:** {{style.theme | fallback "light"}} — {{style.background | fallback "clean"}}

Karakter visual disesuaikan dengan tipe **{{webTypeLabel}}** dan audiens target. Keputusan desain mengutamakan kejelasan, aksesibilitas, dan konsistensi di semua perangkat.

## Token Warna

### Palet Utama

| Nama              | HEX           | Peran          |
| ----------------- | ------------- | -------------- |
| {{#each palette}} | {{this.name}} | `{{this.hex}}` | {{#if @index}}Pendukung{{else}}Primer{{/if}} |
{{/each}}

### Warna Fungsional

| Peran     | Nilai                               | Penggunaan                         |
| --------- | ----------------------------------- | ---------------------------------- |
| Primary   | `{{primaryColor}}`                  | CTA, link, elemen interaktif utama |
| Secondary | `{{secondaryColor}}`                | Aksen, elemen pendukung            |
| Text      | Kontras ≥4,5:1 terhadap background  | Teks utama                         |
| Surface   | Sesuai tema {{style.theme           | fallback "light"}}                 | Background kartu/container |
| Border    | Opacity rendah dari text color      | Pemisah elemen                     |
| Focus     | Warna primer dengan ring 2px offset | Indikator fokus keyboard           |
| Success   | Hijau fungsional                    | Status berhasil                    |
| Warning   | Kuning/oranye fungsional            | Peringatan                         |
| Error     | Merah fungsional                    | Pesan error, validasi gagal        |

## Tipografi

| Properti       | Nilai                 |
| -------------- | --------------------- |
| Heading font   | **{{headingFont}}**   |
| Body font      | **{{bodyFont}}**      |
| Mono font      | **{{monoFont}}**      |
| Heading weight | {{style.headingWeight | fallback "700"}}    |
| Body weight    | {{style.bodyWeight    | fallback "400"}}    |
| Body size      | {{style.bodySize      | fallback "16px"}}   |
| Type scale     | {{style.typeScale     | fallback "1.25"}}   |
| Line height    | {{style.lineHeight    | fallback "1.5"}}    |
| Letter spacing | {{style.letterSpacing | fallback "normal"}} |

### Skala Tipografi

| Level   | Rasio  | Penggunaan             |
| ------- | ------ | ---------------------- |
| h1      | scale⁴ | Judul halaman utama    |
| h2      | scale³ | Judul seksi            |
| h3      | scale² | Judul sub-seksi        |
| h4      | scale¹ | Judul kecil            |
| body    | 1×     | Teks paragraf          |
| small   | 0,875× | Keterangan, label      |
| caption | 0,75×  | Catatan kaki, metadata |

Font dimuat dengan `font-display: swap`. Subset bahasa {{language}} diprioritaskan. Fallback system font disediakan.

## Layout

| Properti        | Nilai                  |
| --------------- | ---------------------- |
| Container width | {{containerWidth}}px   |
| Columns         | {{style.columns        | fallback "12"}}          |
| Base spacing    | {{spacing}}px          |
| Section spacing | {{style.sectionSpacing | fallback "64"}}px        |
| Density         | {{style.density        | fallback "comfortable"}} |
| Border radius   | {{style.radius         | fallback "8"}}px         |
| Elevation       | {{style.elevation      | fallback "subtle"}}      |

### Breakpoints

| Nama    | Min-width                | Kolom               |
| ------- | ------------------------ | ------------------- |
| Mobile  | 0                        | 4                   |
| Tablet  | {{style.tabletBreakpoint | fallback "768"}}px  | 8               |
| Desktop | {{style.mobileBreakpoint | fallback "1024"}}px | {{style.columns | fallback "12"}} |

### Grid

Grid {{style.columns | fallback "12"}} kolom dengan gap {{spacing}}px. Konten dibatasi max-width {{containerWidth}}px dengan padding horizontal {{spacing}}px di mobile.

## Komponen Navigasi

**Tipe:** {{style.navigation | fallback "top"}}

{{#if isLanding}}- Navbar fixed/sticky di atas dengan CTA prominent

- Mobile: hamburger menu dengan overlay
  {{/if}}{{#if isEcommerce}}- Navbar dengan logo, search bar, cart icon, user menu
- Mobile: bottom navigation untuk aksi utama
  {{/if}}{{#if isSaas}}- Sidebar navigation untuk dashboard
- Top bar untuk marketing/landing pages
- Mobile: collapsible sidebar
  {{/if}}{{#if isBlog}}- Navbar sederhana dengan logo dan navigasi kategori
- Mobile: hamburger menu
  {{/if}}{{#if isCompany}}- Navbar dengan logo dan menu utama
- Mobile: hamburger menu
  {{/if}}{{#if isPortfolio}}- Navbar minimal dengan logo dan navigasi seksi
- Mobile: hamburger menu
  {{/if}}{{#if isBooking}}- Navbar dengan logo, CTA booking, user menu
- Mobile: bottom bar dengan aksi utama
  {{/if}}{{#if isInternal}}- Sidebar navigation tetap
- Mobile: collapsible sidebar
  {{/if}}{{#if isCustom}}- Navigasi disesuaikan kebutuhan proyek
{{/if}}

## Komponen Hero

**Tipe:** {{style.hero | fallback "standard"}}

- Layout: sesuai arah visual dan tipe website
- CTA utama: warna primer, ukuran prominent
- Konten above-the-fold: langsung terlihat tanpa scroll
- Gambar/media: optimized, lazy-load hanya untuk elemen di bawah fold

## Interaksi dan Aksesibilitas

### Animasi dan Motion

| Properti | Nilai            |
| -------- | ---------------- |
| Motion   | {{style.motion   | fallback "subtle"}}   |
| Duration | {{style.duration | fallback "200"}}ms    |
| Easing   | {{style.easing   | fallback "ease-out"}} |

- `prefers-reduced-motion`: animasi dinonaktifkan, gunakan perubahan instan
- Animasi hanya untuk feedback interaksi, bukan dekorasi

### Aksesibilitas

- **Focus visible:** Ring 2px offset pada semua elemen interaktif
- **Target sentuh:** Minimum 44×44px untuk mobile
- **Kontras warna:** Minimum 4,5:1 untuk teks normal, 3:1 untuk teks besar
- **Keyboard:** Semua fungsi dapat diakses tanpa mouse
- **Label:** Semua input memiliki label yang terhubung
- **Error:** Pesan error deskriptif, terhubung ke input via `aria-describedby`
- **Ikon:** Tombol ikon memiliki `aria-label`, ikon dekoratif `aria-hidden`
- **Empty state:** Pesan yang informatif dengan aksi yang jelas
- **Loading:** Skeleton hanya untuk data async; konten SSR/SSG langsung ditampilkan
