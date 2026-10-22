# Migration

## Sumber dan tujuan

Inventaris lengkap: data/schema lama, file/media, URL publik yang diindeks, akun
pengguna, integrasi/webhook, volume data, pemilik dan batas downtime yang dapat
diterima. Catat perbedaan schema, encoding, format ID dan informasi yang belum
diketahui. Dokumentasikan platform sumber dan tujuan.

## Mapping dan transformasi

Buat mapping field-by-field dari schema lama ke baru: nama, tipe, konversi,
default, validasi dan field yang dihapus/ditambah. Petakan ID lama ke baru bila
berubah. Definisikan aturan transformasi data (format tanggal, sanitasi teks,
normalisasi, merge duplikat). Tangani edge case: data null, format tidak valid,
relasi orphan dan encoding.

## Rencana bertahap

Susun tahapan: dry run di lingkungan terpisah, validasi hasil, perbaikan mapping,
migration versioned dan reversible, backfill/batch untuk volume besar, redirect
URL (301 untuk permanen) dan strategi cutover (big bang vs gradual vs shadow).
Pertahankan kompatibilitas baca/tulis selama transisi bila diperlukan. Estimasi
durasi setiap tahap.

## Redirect dan SEO

Petakan URL lama ke URL baru; setiap URL publik yang berubah memerlukan redirect 301. Perbarui sitemap, canonical dan internal links. Pantau 404 setelah cutover.
Komunikasikan perubahan URL ke pihak yang menautkan bila material.

## Keamanan dan rollback

Backup database/file terenkripsi sebelum setiap tahap migration; kunci terpisah,
offsite, diverifikasi. Izin minimum untuk skrip migration; audit log setiap
operasi. Destructive migration (drop kolom/tabel, hapus file) memerlukan
otorisasi eksplisit. Rollback aplikasi tidak otomatis mengembalikan schema atau
data; dokumentasikan langkah rollback manual per tahap.

## Verifikasi

Bandingkan count, checksum dan constraint antara sumber dan tujuan. Uji alur
utama dengan data hasil migration. Verifikasi restore dari backup, waktu cutover
aktual vs estimasi, redirect/SEO (tidak ada broken link) dan rollback di
lingkungan terpisah sebelum produksi. Catat hasil dan gap.
