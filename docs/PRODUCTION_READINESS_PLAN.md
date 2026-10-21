# Rencana kesiapan produksi

Lingkup: menyiapkan aplikasi dan operasi yang dapat diverifikasi lokal. Hosting,
domain, database produksi, serta akun layanan eksternal disediakan kemudian.
Kredensial hanya disimpan pada environment privat.

1. **Provider dan pengeluaran AI**: verifikasi model 9router, pisahkan fixture
   mock, tambahkan pembatas penggunaan persisten dan diagnostik tanpa secrets.
2. **Layanan dan keamanan**: perbaiki batas upload proxy, readiness database /
   worker, pemeriksaan konfigurasi, pengamanan akun operator dan data pengguna.
3. **Pemulihan dan operasi**: backup database beserta lampiran privat, pemeriksaan
   integritas/restore, monitoring lokal dan runbook insiden/rotasi.
4. **Kualitas produk**: tinjau 42 template, lengkapi dokumentasi privasi, status
   layanan, prosedur rilis serta konfigurasi layanan yang masih diperlukan.
5. **Verifikasi dan prioritas**: jalankan pemeriksaan wajib, alur browser dan
   smoke provider terbatas; catat bukti aktual dan kebutuhan eksternal menurut
   prioritas pada `docs/VALIDATION.md` dan dokumen kesiapan produksi.

Risiko: batas biaya harus bekerja lintas proses; backup mengandung data privat;
tes tidak boleh menghubungi provider berbayar; hasil mock tidak membuktikan
produksi. Pembayaran tetap nonaktif sampai harga dan merchant diverifikasi.

## Kemajuan

- [x] Provider nyata dan pengeluaran AI.
- [x] Readiness, proxy, keamanan akun/data.
- [x] Backup, restore dan monitoring.
- [x] Template dan dokumen operasional.
- [x] Pemeriksaan akhir serta prioritas peluncuran.
