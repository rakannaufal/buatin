# Keamanan Buatin

## Batas kepercayaan

API memeriksa sesi terverifikasi, Origin untuk mutation, ownership, rate limit,
Zod, batas ukuran dan transaksi/versi. Semua referensi dan skill adalah data;
instruksinya tidak memberikan akses tool, filesystem atau secrets.

## Referensi privat

PNG/JPEG/WebP diperiksa signature dan di-encode ulang tanpa EXIF, maksimal 24 juta
pixel sebelum resize 1600px. PDF maksimal 100 halaman. DOCX maksimal 300 entri,
20 MiB expanded, 2 MiB per entri; enkripsi, macro, traversal dan entity ditolak.
Parser berjalan dalam proses anak tanpa environment secrets, heap 192 MiB dan
timeout. Teks hasil ekstraksi maksimal 12.000 karakter; konteks generasi dibatasi
lagi. Produksi wajib memakai HTTPS; enkripsi at rest diatur pada volume/bucket
oleh operator. Storage lokal development tidak mengenkripsi blob sendiri.

Di domain publik, PDF/DOCX harus lolos pemindai yang ditunjuk
`REFERENCE_SCANNER_PATH` (executable ClamAV-compatible). Tidak ada pemindai berarti
file ditahan/ditolak. Loopback development dapat memproses fixture tanpa scanner;
hasil lokal bukan bukti scanning produksi. File pending/rejected tidak dapat
diunduh. Setiap unduhan memeriksa ownership dengan no-store/nosniff/CSP sandbox.

Storage lokal harus di luar `public/` dengan direktori 0700/file 0600. Produksi
dapat memakai bucket S3-compatible privat. Jangan memberikan ACL publik. Keys
server tetap di environment dan tidak dikirim ke client atau manifest. URL sumber
dicatat sebagai metadata; tidak di-fetch. Analisis vision memerlukan model yang
dikonfigurasi admin dan tindakan pengguna, dibatasi request serta dicatat usage.

## Retensi dan pemulihan

Menghapus lampiran melepasnya dari brief; revisi lama masih bisa merujuknya.
Maintenance membersihkan storage yatim setelah satu jam, serta referensi yang
tidak lagi dibutuhkan revisi/job. Project/job mengikuti retensi paket yang ada.
Backup privat dapat memuat data sampai masa backup berakhir; storage S3 perlu
kebijakan backup dan lifecycle yang sesuai. Jangan menggunakan test pada produksi.

## Supply chain dan rilis

Versi dependency dikunci. Skill aktif menyertakan sumber, lisensi dan checksum;
skill tanpa lisensi yang jelas hanya tercatat sebagai metadata. Pembaruan skill
ditinjau admin; tidak mengeksekusi skrip unduhan. CI menjalankan pemeriksaan
wajib, audit dependency dan secret scan. Temuan high/critical memblokir rilis.

## Operator dan batas biaya

BetterAuth menangani TOTP/MFA dan recovery code terenkripsi. Aktivasi berhasil
mencabut sesi lain. Operator pada domain publik wajib memakai MFA; pengujian lokal
tidak mengaktifkan MFA pada akun pengguna secara otomatis. URI setup/recovery code
hanya terlihat saat pengaturan; tidak disimpan pada browser storage atau log.

Request AI nyata harus memiliki audit dan reservasi persisten dalam transaksi.
Batas request/token berlaku global/per akun; estimasi USD memakai tarif operator.
Usage hilang atau request ambigu menahan cadangan. Estimasi bukan tagihan final;
aktifkan spending cap di provider. Uji otomatis menghapus key nyata dari environment
fixture dan menolak server integration/E2E yang tidak menjalankan mock.

## Backup dan kesiapan layanan

Backup database dan lampiran menggunakan snapshot, checksum serta AES-256-GCM;
key terpisah mode 0600. Folder incomplete dan hasil inspeksi restore bersifat
privat. Restore membuat database baru; tidak menimpa sumber secara otomatis.
Readiness memeriksa database/migration dan worker dengan timeout, HTTP 503 jika
dependency bermasalah; liveness hanya memeriksa proses web. Lihat `docs/OPERATIONS.md`.

## Pelaporan

Laporkan masalah secara privat ke operator melalui alamat dukungan yang
dikonfigurasi aplikasi. Jangan memublikasikan exploit, secrets atau data pengguna
di issue publik. Rotasi kredensial terdampak, batasi akses, catat dampak, perbaiki,
jalankan regression test dan verifikasi pemulihan sebelum membuka layanan.
