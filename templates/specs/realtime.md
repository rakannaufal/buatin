# Fitur realtime

## Kebutuhan pembaruan

Tentukan setiap event realtime: nama, sumber, penerima, frekuensi, toleransi
latensi dan alasan polling tidak mencukupi. Pilih mekanisme sesuai arah
komunikasi: polling untuk pembaruan jarang, SSE untuk server-ke-client, WebSocket
untuk bidirectional. Jangan memakai WebSocket bila SSE atau polling cukup.

## Kontrak dan koneksi

Dokumentasikan setiap event: ID/version, format payload minimum, autentikasi
dan otorisasi kanal/room, reconnect dengan exponential backoff, heartbeat/ping
interval, timeout koneksi dan batas koneksi per pengguna. Token autentikasi
diverifikasi saat koneksi dan secara berkala; sesi berakhir menutup koneksi.

## Presence dan state

Definisikan presence (online/offline/typing/idle) bila diperlukan: broadcast
interval, timeout, cleanup koneksi stale dan privasi (siapa melihat siapa).
State sinkronisasi memakai versioning/sequence number; client yang ketinggalan
melakukan resync penuh. Optimistic update menampilkan status pending dan
menangani rollback.

## Konsistensi dan degradasi

Tangani event duplikat (idempoten), out-of-order (sequence), resync setelah
putus dan fan-out (broadcast ke banyak subscriber). Backpressure dan throttle
mencegah overload server/client. Jangan mengekspos event tenant/akun lain;
invalidasi session menutup akses kanal. Sediakan fallback (polling/refresh)
bila koneksi realtime gagal.

## Verifikasi

Uji koneksi lambat, putus mendadak, resume/reconnect, sesi berakhir di tab lain,
banyak tab bersamaan, event ganda/out-of-order, cleanup listener saat unmount
dan beban koneksi representatif. Periksa keamanan kanal: akun A tidak menerima
event akun B. Catat latency aktual dan bandingkan dengan target.
