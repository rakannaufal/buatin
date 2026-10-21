# Business rules

## Entitas dan istilah domain

Definisikan istilah pengguna, aktor, objek, kepemilikan dan sumber kebenaran. Gunakan aturan bisnis dari brief; rekomendasi yang belum disetujui diberi asumsi.

## Aturan BR-xx

Untuk tiap aturan catat pemicu, prasyarat, validasi server, perubahan state, hasil dan penolakan. Tentukan batas angka, waktu/zona waktu, pembulatan dan otorisasi hanya bila relevan.

## Transisi, transaksi dan konflik

Tulis state awal/akhir, transisi yang sah, atomicity dan perilaku double submit/concurrent edit. Kuota, inventori dan pembayaran membutuhkan idempotensi serta pencegahan pembaruan ganda.

## Kasus tepi dan verifikasi

Petakan aturan ke REQ/AC/TEST. Uji batas minimum/maksimum, data tidak ada, sesi berakhir, waktu habis, race, kegagalan provider dan retry yang aman.
