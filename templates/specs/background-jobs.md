# Background jobs

## Inventaris pekerjaan

Daftar pemicu, input, hasil, prioritas, owner, durasi dan alasan pekerjaan perlu latar/terjadwal. Input job membawa identitas dan izin yang dapat diperiksa.

## Antrean dan persistensi

Tetapkan outbox/transaction boundary, deduplication key, concurrency, fair scheduling, lease, heartbeat, checkpoint serta status publik. Pengiriman job dan perubahan data tidak boleh terpisah secara rapuh.

## Retry dan pemulihan

Tentukan error permanen/transien, retry/backoff, timeout, idempotensi, dead letter, cancel/resume dan retensi. Worker restart tidak mengulangi pembayaran atau side effect tanpa verifikasi.

## Operasi dan verifikasi

Monitor umur antrean, worker stale, kegagalan dan penggunaan resource. Uji restart, crash setelah side effect, duplikat, race, lock hilang dan graceful shutdown.
