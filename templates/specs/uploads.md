# Uploads

## Jenis dan batas file

Tentukan kebutuhan, allowlist ekstensi/MIME/signature, ukuran per file/akun, jumlah, dimensi/halaman serta batas arsip expanded. Referensi URL tidak otomatis di-fetch.

## Alur aman

Validasi server, beri storage key acak, simpan privat di luar web root, pindai bila relevan lalu parser terisolasi dengan timeout/memori terbatas. Tolak traversal, enkripsi arsip, macro dan active content berbahaya.

## Akses dan lifecycle

Unduhan harus memeriksa ownership/role dan memakai no-store/nosniff/disposition yang tepat. Atur quarantine, status processing/ready/rejected, retensi, cleanup yatim, backup dan penghapusan.

## Verifikasi

Uji ukuran batas, MIME palsu, file rusak, bom decompression, scanner gagal/tidak tersedia, akun lain dan interrupted upload. Samakan batas reverse proxy, API dan storage; jangan memblokir file sah di proxy.
