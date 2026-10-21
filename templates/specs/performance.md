# Performance

## Tujuan

Anggaran performa, aset, cache, pengukuran

## Fakta dari brief

Tuliskan kebutuhan dan batasan nyata dari brief serta pilihan pengguna yang relevan. Informasi belum tersedia dicatat sebagai asumsi dengan dampaknya.

## Kebutuhan dan rancangan

Tentukan anggaran aset/JavaScript, strategi cache dan rendering sesuai halaman.
Lazy loading menunda aset/kode; skeleton hanya memberi umpan balik visual selama
data async dimuat. Keduanya kondisional, bukan fitur wajib semua website.

### Lazy loading

- Hero/gambar LCP, judul dan isi above the fold segera tersedia; jangan lazy-load.
  Gunakan eager/prioritas/preload secukupnya sesuai API stack yang digunakan.
- Gambar/iframe berat di bawah layar dapat memakai lazy native. Video memakai
  poster dan preload yang sesuai. Halaman pendek/ringan tidak memerlukan library
  lazy tambahan.
- Grafik, editor, modal atau tab tersembunyi yang berat dapat memakai dynamic
  import saat dibutuhkan. Buktikan resource tertunda; code splitting saja tidak
  selalu berarti pemuatan ditunda.
- Tetapkan width/height atau aspect-ratio serta ukuran responsif. Bedakan lazy
  aset dari fetch data/pagination; batasi request, ukuran halaman dan memori.

### Skeleton dan proses panjang

Konten statis/SSG, HTML SSR lengkap dan data cache yang sudah tersedia langsung
ditampilkan. SSR streaming boleh memakai fallback lokal pada batas async nyata.
Skeleton hanya untuk konten async dengan bentuk yang diketahui, misalnya tabel,
slot jadwal atau daftar produk yang sedang dimuat. Sesuaikan ukuran konten akhir.

Hindari flicker pada data cepat; sekitar 300 ms adalah heuristik yang perlu
diukur, bukan delay wajib. Jangan menambah delay atau waktu tampil minimum agar
skeleton terlihat. Pertahankan data lama saat refresh. Skeleton tidak membuat
jaringan lebih cepat. Hormati reduced motion; placeholder statis tetap sah.

Proses panjang (misalnya lebih dari 10 detik) memakai status/tahap, progres nyata
bila dapat diukur, timeout dan retry/batal bila aman. Jangan membuat persentase
palsu. Pembayaran menampilkan status transaksi server dan mencegah submit ganda.

## Asumsi dan pertanyaan terbuka

Rancang persyaratan yang dapat diukur sesuai halaman dan stack target. Accessibility meliputi semantic HTML, label, kontras 4,5:1, target sentuh 44px, focus, keyboard, error, status dan reduced motion; jangan mengandalkan warna saja.

## Verifikasi yang diperlukan

Catat per halaman keputusan memakai/menghindari lazy/skeleton serta alasannya.
Bandingkan network trace sebelum/sesudah pada perangkat, cache dan jaringan yang
sama. Hero harus diminta tanpa scroll; aset jauh di bawah layar boleh tertunda
sesuai heuristik browser. Uji cache cepat, jaringan lambat, error dan offline.
Target awal persentil ke-75: LCP <=2,5 detik, CLS <=0,1, INP <=200 ms. Catat angka
aktual; target dan hasil mock bukan bukti performa produksi.
