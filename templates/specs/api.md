# Kontrak API

## Kontrak endpoint

Buat tabel metode/path, tujuan, auth/role, request, response, status dan kebutuhan REQ. Daftar endpoint hanya sesuai fitur terpilih.

## Validasi dan kesalahan

Validasi input server: tipe, panjang, rentang, ukuran, jumlah, pagination/filter dan identifier. Gunakan bentuk error konsisten dengan request ID; jangan mengembalikan stack trace, SQL atau secrets.

## Keandalan dan keamanan

Tetapkan ownership, CSRF/Origin, CORS, rate limit, timeout, idempotency key, transaksi dan penanganan retry. Otorisasi tidak bergantung pada UI atau identifier yang sulit ditebak.

## Verifikasi kontrak

Contoh request/response hanya memakai fixture. Uji malformed JSON, akun lain, sesi berakhir, duplicate request, perubahan bersamaan, kegagalan upstream dan batas pagination.
