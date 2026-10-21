# PWA dan offline

## Manfaat dan lingkup offline

Tentukan halaman/data yang aman tersedia offline, kebutuhan instalasi dan perilaku saat jaringan kembali. Jangan menambah service worker pada website ringan tanpa manfaat.

## Cache dan pembaruan

Definisikan strategi asset/data, versioning, invalidasi, update prompt, batas penyimpanan dan eviction. Jangan cache auth token, pembayaran atau data privat lintas akun secara publik.

## Mutasi dan sinkronisasi

Tulis antrian lokal bila dibutuhkan, idempotensi, resolusi konflik, status pending/failed, retry/batal serta logout yang membersihkan data privat.

## Verifikasi

Uji instalasi, update versi, jaringan putus, cache usang, quota storage, akun berganti dan operasi yang memang harus online. Accessibility dan navigasi tetap berfungsi.
