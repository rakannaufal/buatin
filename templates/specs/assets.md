# Aset dan brand

## Inventaris aset

Catat nama, tujuan, pemilik, sumber asli, lisensi, izin penggunaan, izin
perubahan dan halaman pemakaian. Bedakan aset yang dimiliki, dilisensikan dan
belum tersedia. Referensi dalam brief bukan otomatis aset dengan hak publikasi;
konfirmasi kepemilikan sebelum memakai.

## Spesifikasi dan pipeline

Definisikan format target (WebP/AVIF fallback JPEG/PNG), varian ukuran responsif
(srcset), kompresi, alt text deskriptif, font subset per bahasa, optimasi SVG
(hapus metadata/editor), sprite bila bermanfaat dan penyimpanan/CDN/cache.
Gunakan aset asli yang disediakan; jangan mengarang testimoni, logo klien atau
foto placeholder sebagai konten final.

## Ikon dan font

Pilih set ikon konsisten (SVG inline atau icon font) dengan ukuran minimum 24×24
dan area sentuh 44×44. Font web memakai font-display swap/optional, subset
karakter yang digunakan, format woff2 dan fallback sistem. Catat lisensi font
(SIL OFL, komersial, Google Fonts) dan batasan penggunaan.

## Keamanan dan loading

Sanitasi aset yang diunggah pengguna; hapus metadata EXIF pribadi bila relevan.
Batasi ukuran/tipe upload dengan allowlist dan magic bytes. Hero/LCP tersedia
segera tanpa lazy; aset berat offscreen boleh ditunda dengan dimensi stabil
(width/height atau aspect-ratio). Storage privat untuk aset yang memerlukan
otorisasi akses.

## Verifikasi

Periksa lisensi setiap aset, resolusi pada viewport besar/kecil, kontras ikon
terhadap latar, fallback font, broken asset, jaringan lambat/offline dan CLS
akibat gambar tanpa dimensi. Catat aset yang masih perlu disediakan oleh klien.
