# PWA dan offline

## Manfaat dan lingkup

Tentukan alasan PWA/offline: instalasi home screen, kecepatan repeat visit, akses
tanpa jaringan atau push notification. Identifikasi halaman/data yang aman dan
berguna tersedia offline versus yang memerlukan jaringan (pembayaran, auth,
data real-time). Jangan menambah service worker pada website ringan tanpa manfaat
nyata bagi pengguna.

## Service worker dan cache

Definisikan strategi cache per tipe resource:

- App shell (HTML/CSS/JS): cache-first, versioned.
- Aset statis (gambar/font/ikon): cache-first, long-lived.
- API/data: network-first atau stale-while-revalidate sesuai freshness.
- Halaman navigasi: network-first dengan fallback offline page.

Tetapkan versioning/cache busting, invalidasi saat deploy, update prompt (refresh
banner), batas penyimpanan/quota dan eviction policy. Jangan cache auth token,
data pembayaran atau data privat lintas akun di cache publik.

## Manifest dan instalasi

Web app manifest: name, short_name, start_url, display (standalone/minimal-ui),
theme_color, background_color, ikon berbagai ukuran dan scope. Uji instalasi
di Android (Chrome) dan iOS (Safari); catat perbedaan perilaku dan batasan.

## Mutasi dan sinkronisasi offline

Bila diperlukan, tulis antrian mutasi lokal (IndexedDB/localStorage) dengan
idempotensi key. Resolusi konflik: last-write-wins, merge atau user-resolve
sesuai konteks. Tampilkan status pending/failed pada UI. Retry otomatis saat
jaringan kembali dengan backoff. Cancel/edit mutasi pending bila aman.
Logout membersihkan semua data privat dari cache dan storage lokal.

## Verifikasi

Uji instalasi PWA, update versi service worker, jaringan putus di berbagai
titik alur, cache usang setelah deploy, quota storage mendekati batas, pergantian
akun dan operasi yang memang harus online (pembayaran, verifikasi). Aksesibilitas
dan navigasi keyboard tetap berfungsi saat offline. Catat perangkat, browser dan
hasil aktual.
