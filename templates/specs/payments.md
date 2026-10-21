# Payments

## Produk dan nominal

Catat produk/paket, mata uang, harga yang benar-benar disetujui, pajak/biaya gateway, masa aktif, perpanjangan, pembatalan/refund dan source of truth. Harga belum ada berarti checkout belum siap.

## Alur transaksi

Dokumentasikan order, invoice, redirect, pembayaran pending/paid/failed/expired/review, webhook dan rekonsiliasi. Redirect browser bukan bukti pembayaran; server memverifikasi signature, reference, nominal dan status provider.

## Idempotensi dan kegagalan

Cegah double submit, callback duplikat/out-of-order/replay serta aktivasi ganda dengan constraint/transaksi/idempotency key. Pesanan tidak pasti diperiksa ulang sebelum membuat tagihan baru.

## Operasi dan verifikasi

Pisahkan sandbox/produksi, simpan secrets privat, audit perubahan, atur retry/backoff dan jalur refund sesuai provider. Uji sandbox serta transaksi produksi kecil yang diotorisasi sebelum penjualan dibuka.
