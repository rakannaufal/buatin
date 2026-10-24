# Aset Buatin

Keluarga doodle editorial untuk landing, harga, FAQ, kebijakan dan autentikasi.
Dashboard dan halaman aplikasi belum diubah. Galeri: `index.html`.

## Isi

- `logos/`: logo induk L01, wordmark, horizontal, stacked, tagline, varian
  hitam/putih, simbol mikro, avatar, konsep alternatif dan ekspor PNG/PDF.
- `illustrations/`: 20 master SVG, PNG transparan dan WebP lossless.
- `doodles/`: panah, penekanan, aksesori kertas, ornamen, pemisah dan motif paket.
- `icons/`: favicon SVG/ICO/PNG, Apple, Android dan maskable.
- `textures/`: tile grain transparan 512px, PNG dan WebP.
- `social/`: sembilan kartu 1200x630 dan satu kartu persegi 1080px, SVG dengan
  teks outline dan PNG.
- `licenses/`: lisensi font Manrope dan Source Serif 4.
- `PROMPTS.md`: brief sumber tiap aset. `manifest.json`: dimensi, penggunaan,
  checksum dan status review. Ekspor PDF memiliki `pdf-manifest.json` sendiri.

## Identitas

L01 (B dari lembar brief) menjadi induk kerja seluruh varian. L02/L03 adalah
alternatif konsep, bukan logo tambahan untuk dipakai bersamaan. Lettering
Manrope diubah menjadi outline; tidak diklaim sebagai lettering pesanan dari nol.
Logo dan kartu berbagi tidak memerlukan font terpasang pada perangkat pembaca.

Warna: hijau #235C46, tinta #202B27, sage #E4EEE7, kertas #FAF7EF,
kuning #F3D37A. Utamakan hijau; kuning hanya aksen. Varian putih membutuhkan
latar gelap.

Area aman minimum: seperempat tinggi simbol di sekeliling logo. Ukuran minimum:
simbol mikro 16px; horizontal 120px; stacked 100px. Tagline direkomendasikan
mulai lebar 240px dan tetap perlu diperiksa pada ukuran tampil. Pertahankan rasio,
orientasi dan warna logo; hindari efek tambahan.

## Penerapan

Gunakan master SVG untuk logo/doodle, WebP untuk ilustrasi raster bila lebih
efisien. Tentukan width/height atau aspect-ratio. Hero dimuat segera; gambar di
luar layar dapat lazy. Aset dekoratif memakai alt kosong. Judul, tombol, harga
dan isi kebijakan tetap HTML. Ilustrasi kebijakan cukup 64-120px dengan paragraf
bebas dekorasi.

Favicon belum dipasang ke metadata aplikasi. Ikon maskable memiliki latar penuh
dan tanda di dalam safe circle. ICO berisi 16/32/48px. Logo provider harus diambil
dari sumber resmi secara terpisah; paket ini tidak membuat ulang Google/Duitku/QRIS.
PDF varian putih memakai latar hijau dan akhiran `-proof`; gunakan SVG putih
untuk artwork transparan. PDF lainnya mempertahankan path vektor tanpa font.

## Asal dan batas review

Ilustrasi, simbol dan ornamen disusun lokal dari path SVG, tanpa stok atau layanan
generasi gambar. Grain memakai seed tetap. Teks outline berasal dari font lokal
yang sudah dikunci dependency proyek; lisensi SIL OFL disertakan.

Persetujuan visual akhir dan pemeriksaan kemiripan/pendaftaran merek belum
dilakukan. Kesiapan teknis berkas tidak menyatakan perlindungan hukum merek.

## Reproduksi

Gunakan Node.js 24 dan dependency proyek yang sudah terpasang, dari root proyek:

```sh
node scripts/build-brand-assets.mjs
node scripts/export-brand-pdf.mjs
node scripts/check-brand-assets.mjs
```

Ekspor PDF dan pemeriksaan browser memakai Chromium Playwright yang sudah
terpasang. Generator hanya menulis keluarga aset ini; tidak mengubah halaman
aplikasi atau memasang favicon secara otomatis.
