# Operations

## Layanan dan kepemilikan

Catat setiap komponen (web, worker, database, cache, storage, CDN), owner, jam
dukungan, eskalasi, target availability dan latency, RPO/RTO serta jadwal
pemeliharaan. Target perlu disetujui dan diukur; jangan melaporkan SLA yang
belum dicapai atau angka yang tidak dipantau.

## Monitoring dan observability

Implementasi log terstruktur dengan request ID tanpa secrets atau data pribadi.
Pantau readiness/liveness, metrik antrean/worker (depth, latency, error rate),
disk/storage usage, email delivery, pembayaran dan biaya layanan AI bila ada.
Dashboard menyajikan metrik kunci per komponen. Trace terdistribusi untuk
request yang melintasi beberapa layanan.

## Alert dan eskalasi

Setiap alert mempunyai ambang batas, kanal notifikasi, owner dan langkah tindakan
yang jelas. Bedakan warning (investigasi) dari critical (tindakan segera).
Uji pengiriman alert secara nyata; alert yang tidak pernah diuji dianggap tidak
berfungsi. Hindari alert noise yang menyebabkan kelelahan.

## Runbook insiden

Rancang langkah diagnosis, pembatasan trafik/side effect, retry aman, rekonsiliasi
data, pencabutan sesi/kunci dan pemulihan layanan. Pertahankan audit log privat;
jangan menjalankan perintah produksi dari input pengguna tanpa validasi.
Dokumentasikan eskalasi, komunikasi stakeholder dan post-mortem.

## Backup dan siklus data

Backup database beserta blob dengan checksum/integritas, enkripsi dan kunci
terpisah, offsite, retensi sesuai kebijakan dan restore berkala yang diuji.
Jalankan permintaan akses/export/delete data sesuai verifikasi identitas dan
kewajiban retensi hukum. Dokumentasikan jadwal dan penanggung jawab.

## Scaling dan kapasitas

Tetapkan batas koneksi, memori, CPU dan storage per komponen. Dokumentasikan
auto-scaling trigger dan batas maksimum. Rencanakan kapasitas 12 bulan ke depan
berdasarkan pertumbuhan yang diproyeksikan. Rate limit endpoint publik.

## Verifikasi berulang

Sesudah perubahan jalankan pemeriksaan relevan, smoke test dan pantau metrik.
Latih skenario: worker restart, provider down, disk penuh, restore dari backup,
rollback aplikasi dan kredensial bocor/rotasi. Catat bukti, pemilik gap dan
prioritas perbaikan.
