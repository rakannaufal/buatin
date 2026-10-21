# Realtime

## Kebutuhan pembaruan

Tentukan event, frekuensi, toleransi latensi, pengguna dan alasan polling tidak cukup. Pilih polling/SSE/WebSocket sesuai arah komunikasi.

## Kontrak dan koneksi

Dokumentasikan event ID/version, payload minimum, autentikasi/otorisasi kanal, reconnect/backoff, heartbeat, timeout dan batas koneksi.

## Konsistensi dan degradasi

Tangani event duplikat/out-of-order, resync setelah putus, fan-out, backpressure dan fallback. Jangan mengekspos event tenant/akun lain; invalidasi session menutup akses.

## Verifikasi

Uji koneksi lambat/putus, resume, sesi berakhir, banyak tab, event ganda, cleanup listener dan beban koneksi representatif.
