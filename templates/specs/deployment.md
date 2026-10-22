# Deployment

## Lingkungan dan topologi

Tentukan lingkungan local, staging dan production beserta runtime, proses
web/worker, database/storage persisten, jaringan privat, domain, DNS dan HTTPS.
Pilih hosting sesuai kebutuhan nyata; angka biaya harus bersumber atau diberi
estimasi eksplisit. Staging memakai infrastruktur serupa production dengan data
terpisah.

## Konfigurasi dan variabel lingkungan

Daftar setiap env var: nama, tujuan, wajib/opsional, build-time/runtime, owner
dan sumber nilai. Jangan menyertakan nilai rahasia dalam dokumen. Sediakan
env.example dengan placeholder. Kunci versi dependency/runtime; bedakan konfigurasi
yang berubah per lingkungan dan yang tetap.

## Build dan CI/CD

Dokumentasikan build command, output artifact, test suite yang wajib hijau dan
langkah deployment. CI menjalankan lint, typecheck, unit test, integration test,
audit dependency dan build sebelum deploy. Migration database dijalankan sebelum
deploy dan harus kompatibel maju untuk rollback.

## Proxy, health dan kapasitas

Samakan batas body/upload di proxy, API dan storage. Bind pada interface internal;
setel secure headers, trusted proxy dan cache publik/privat sesuai konten.
Pisahkan liveness probe (proses hidup) dari readiness (database/worker siap)
dengan timeout; health endpoint tidak selalu mengembalikan sehat.

## Pemulihan dan rollback

Backup database serta blob yang konsisten, terenkripsi dengan kunci terpisah,
salinan offsite, jadwal/retensi dan latihan restore berkala. Rollback aplikasi
harus kompatibel dengan schema aktif; migration destruktif memerlukan otorisasi
dan tidak dapat di-rollback otomatis. Dokumentasikan prosedur darurat.

## Verifikasi rilis

Smoke test alur inti di staging sebelum production. Verifikasi provider nyata
(email, pembayaran, storage, auth), scanner/upload, response time, browser/
perangkat target, monitoring aktif dan alert. Catat command, hasil aktual serta
keputusan buka trafik.
