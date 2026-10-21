# Deployment

## Lingkungan dan topologi

Tentukan local/staging/production, runtime, proses web/worker, database/storage persisten, jaringan privat, domain, DNS dan HTTPS. Pilih hosting sesuai kebutuhan, bukan tren; angka biaya harus bersumber atau diberi estimasi.

## Konfigurasi dan rilis

Daftar nama env, tujuan, wajib/opsional, build-time/runtime dan owner tanpa nilai rahasia. Kunci dependency/runtime, jalankan CI, migration kompatibel lalu deploy artifact konsisten.

## Proxy, health dan kapasitas

Samakan batas body upload di proxy/API/storage, bind internal, secure headers/trusted proxy dan cache privat/publik. Pisahkan liveness dari readiness database/worker dengan timeout; jangan selalu mengembalikan sehat.

## Pemulihan dan rollback

Backup database serta blob yang konsisten, enkripsi dan kunci terpisah, salinan offsite, jadwal/retensi serta latihan restore. Rollback aplikasi harus kompatibel dengan schema; tindakan destruktif membutuhkan otorisasi.

## Verifikasi rilis

Smoke alur inti dan gagal di staging, provider nyata, email, pembayaran bila berlaku, scanner/upload, load, browser/perangkat, monitoring dan alert. Catat command/hasil serta keputusan buka trafik.
