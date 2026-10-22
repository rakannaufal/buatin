# SEO teknis

## Halaman dan discoverable

Identifikasi halaman publik yang perlu diindeks beserta tujuan, audiens dan kata
kunci alami. Tandai halaman privat, staging, duplikat dan paginasi yang tidak
boleh diindeks. Konten, judul dan deskripsi mengikuti fakta bisnis yang tersedia;
jangan mengarang klaim, rating atau harga yang belum ada.

## Metadata dan structured data

Tetapkan title unik (≤60 karakter), meta description (≤155 karakter), canonical
URL, Open Graph (og:title, og:description, og:image, og:url, og:type), Twitter
Card dan bahasa/hreflang bila multi-bahasa. Structured data memakai schema.org
yang sah dan hanya properti yang dapat diverifikasi; jangan menyalahgunakan
schema untuk mendapat rich result. Favicon, apple-touch-icon dan manifest
disiapkan sesuai kebutuhan.

## Sitemap, robots dan navigasi

Buat sitemap XML dinamis untuk halaman publik, perbarui lastmod sesuai perubahan
nyata dan daftarkan di robots.txt serta search console. robots.txt melarang
crawler pada halaman privat, aset internal dan endpoint API. URL bersih, konsisten
(trailing slash atau tanpa), redirect 301 untuk perubahan permanen dan 404/410
untuk halaman dihapus. Pagination mempunyai URL yang dapat dirayapi; infinite
scroll menyediakan fallback.

## Performa dan rendering

Hero/LCP serta teks utama tidak lazy; tersedia dalam HTML awal tanpa JavaScript.
Gambar offscreen boleh ditunda dengan dimensi stabil. Skeleton bukan pengganti
konten HTML untuk crawler. SSR/SSG menghasilkan HTML semantik yang dapat dibaca
tanpa client-side hydration. Redirect chain maksimal satu hop.

## Verifikasi

Periksa HTML sumber tanpa JavaScript untuk title/description/canonical/OG. Validasi
structured data dengan validator resmi. Uji sitemap, robots.txt, broken links,
mobile-friendliness, crawler rendering dan Core Web Vitals aktual. Pantau search
console untuk error indexing. SEO teknis yang benar tidak menjamin peringkat.
