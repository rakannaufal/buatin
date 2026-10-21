# Admin

## Tugas operator

Daftar tugas yang diperlukan, data minimum, role, halaman, filter/pagination dan REQ. Dashboard hanya menampilkan metrik yang membantu tindakan.

## Aksi dan otorisasi

Semua aksi diperiksa server. Gunakan MFA untuk operator publik, konfirmasi tindakan berdampak, validasi nominal/status, idempotensi dan audit; jangan mengeksekusi kode atau SQL dari input UI.

## Operasional dan dukungan

Tampilkan kesehatan dependency, antrean, kegagalan, biaya/kuota, retensi dan permintaan data. Setiap masalah memiliki tindakan, owner dan status; jangan menampilkan secrets atau seluruh isi privat tanpa kebutuhan.

## Verifikasi

Uji pengguna biasa, sesi lama, MFA belum aktif, role berubah, race, aksi gagal, pagination, keyboard dan layar kecil. Perubahan hak akses harus langsung mempengaruhi server.
