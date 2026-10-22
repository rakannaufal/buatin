# Background jobs

## Inventaris pekerjaan

Daftar setiap job: nama, pemicu (event/cron/manual), input, hasil yang diharapkan,
prioritas, owner, estimasi durasi dan alasan pekerjaan perlu berjalan di latar
atau terjadwal. Input job membawa identitas dan izin pengirim yang dapat diperiksa
di worker.

## Antrean dan persistensi

Tetapkan mekanisme antrean (database-backed, Redis, message broker) dan alasan
pemilihan. Definisikan outbox pattern/transaction boundary agar pengiriman job
dan perubahan data tidak terpisah secara rapuh. Tentukan deduplication key,
concurrency limit per tipe job, fair scheduling antar tenant, lease/lock,
heartbeat, checkpoint untuk job panjang dan status publik (pending/running/
completed/failed) yang dapat dilihat pengguna.

## Scheduling dan cron

Dokumentasikan job terjadwal: jadwal (crontab), timezone, overlap policy (skip/
queue/cancel previous), batas durasi dan owner. Cron yang melewati jadwal karena
downtime perlu kebijakan: jalankan sekali saat kembali atau lewati.

## Retry dan pemulihan

Bedakan error permanen (bad input, not found) dari transien (timeout, rate limit).
Retry memakai exponential backoff dengan jitter; tentukan max retry per tipe job.
Timeout per job mencegah worker stuck. Idempotensi: worker restart tidak
mengulangi pembayaran, email atau side effect tanpa verifikasi state. Dead letter
queue untuk job yang gagal berulang; sediakan mekanisme inspect, retry manual
dan cancel/resume.

## Operasi dan verifikasi

Monitor umur antrean (oldest job), worker heartbeat/stale, failure rate, throughput
dan penggunaan resource (CPU/memori/koneksi). Alert bila antrean membengkak atau
worker mati. Uji skenario: restart worker di tengah job, crash setelah side effect,
duplikat job, race condition, lock hilang, graceful shutdown dan cleanup resource.
Catat perintah dan hasil.
