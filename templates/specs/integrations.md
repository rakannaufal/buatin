# Integrations

## Daftar layanan eksternal

Tulis fungsi, provider dipilih, pemilik akun, data yang dikirim, biaya, region, izin serta kebutuhan REQ. Layanan yang belum dipilih tetap keputusan terbuka.

## Kontrak dan kredensial

Tetapkan API/version, endpoint, auth, secret environment, scope minimum, callback, signature dan pemisahan sandbox/produksi. Jangan menaruh kunci pada browser atau dokumentasi.

## Kegagalan dan batas

Atur timeout, response size, retry/backoff, rate limit, circuit/degradasi, idempotensi dan rekonsiliasi yang relevan. Hindari fetch URL arbitrer, redirect tak terverifikasi dan SSRF.

## Verifikasi

Uji adapter dengan fixture, lalu smoke provider nyata tanpa data sensitif. Konfigurasi tersedia tidak membuktikan hak akses, kuota, domain terverifikasi atau layanan berjalan.
