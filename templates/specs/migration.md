# Migration

## Sumber dan tujuan

Inventaris data/schema, file, URL, akun, integrasi, volume, pemilik dan batas downtime. Catat kompatibilitas serta informasi yang belum diketahui.

## Rencana bertahap

Buat mapping field/ID, validasi, migration versioned, dry run, backfill/batch, redirect URL dan strategi cutover. Pertahankan kompatibilitas baca/tulis selama transisi bila diperlukan.

## Keamanan dan rollback

Backup database/file terenkripsi sebelum perubahan; izin minimum, audit dan batas akses. Destructive migration memerlukan otorisasi. Rollback aplikasi tidak otomatis mengembalikan schema atau data.

## Verifikasi

Bandingkan count/checksum/constraint dan alur utama; uji restore, waktu cutover, redirection/SEO serta rollback di lingkungan terpisah sebelum produksi.
