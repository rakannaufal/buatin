# Operations

## Layanan dan kepemilikan

Catat komponen, owner, jam dukungan, eskalasi, target availability/latency, RPO/RTO dan jadwal pemeliharaan. Target perlu disetujui; jangan melaporkan SLA yang belum dicapai.

## Monitoring dan diagnosis

Gunakan log terstruktur/request ID tanpa secrets, readiness/liveness, metrik antrean/worker, error, disk/storage, email/pembayaran dan biaya AI bila ada. Alert mempunyai ambang, kanal, owner dan langkah tindakan; uji pengiriman nyata.

## Runbook insiden

Rancang diagnosis, pembatasan trafik/side effect, retry aman, rekonsiliasi, pencabutan sesi/kunci dan pemulihan. Pertahankan audit privat; jangan menjalankan perintah produksi dari input pengguna.

## Backup dan siklus data

Backup database beserta blob, checksum/integritas, enkripsi/kunci terpisah, offsite, retensi dan restore berkala. Jalankan permintaan akses/export/delete sesuai verifikasi identitas serta kewajiban retensi.

## Verifikasi berulang

Sesudah perubahan jalankan pemeriksaan relevan, smoke dan monitor. Latih worker restart, provider down, disk penuh, restore, rollback dan kredensial bocor. Catat bukti, pemilik gap dan prioritas.
