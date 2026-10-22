# Performance

## Anggaran dan target

Tetapkan anggaran per halaman: total JavaScript (≤200 KB gzip sebagai titik awal),
CSS, gambar, font dan jumlah request. Target Core Web Vitals persentil ke-75:
LCP ≤2,5 detik, CLS ≤0,1, INP ≤200 ms. Target dan anggaran disesuaikan dengan
konteks proyek; catat alasan bila menyimpang.

## Strategi rendering dan cache

Petakan per halaman: SSG/SSR/streaming/CSR sesuai kebutuhan data dan frekuensi
perubahan. Tetapkan kebijakan cache (Cache-Control, CDN, stale-while-revalidate)
untuk aset statis, HTML, API response dan data yang jarang berubah. Invalidasi
cache saat konten berubah; cache publik tidak menyimpan data privat.

## Lazy loading

- Hero/gambar LCP, judul dan isi above the fold segera tersedia; jangan lazy-load.
  Gunakan eager/priority/preload sesuai API stack.
- Gambar/iframe berat di bawah layar memakai lazy native. Video memakai poster
  dan preload yang sesuai. Halaman pendek/ringan tidak perlu library lazy tambahan.
- Grafik, editor, modal atau tab tersembunyi yang berat dapat memakai dynamic
  import saat dibutuhkan. Buktikan resource tertunda; code splitting saja tidak
  selalu berarti pemuatan ditunda.
- Tetapkan width/height atau aspect-ratio serta ukuran responsif. Bedakan lazy
  aset dari fetch data/pagination; batasi request, ukuran halaman dan memori.

## Skeleton dan proses panjang

Konten statis/SSG, HTML SSR lengkap dan data cache yang sudah tersedia langsung
ditampilkan tanpa skeleton. SSR streaming boleh memakai fallback lokal pada batas
async nyata. Skeleton hanya untuk konten async dengan bentuk yang diketahui
(tabel, slot jadwal, daftar produk yang sedang dimuat); sesuaikan ukuran konten
akhir.

Hindari flicker pada data cepat; ~300 ms adalah heuristik yang perlu diukur,
bukan delay wajib. Jangan menambah delay atau waktu tampil minimum agar skeleton
terlihat. Pertahankan data lama saat refresh. Skeleton tidak membuat jaringan
lebih cepat. Hormati reduced motion; placeholder statis tetap sah.

Proses panjang (>10 detik) memakai status/tahap, progres nyata bila dapat
diukur, timeout dan retry/batal bila aman. Jangan membuat persentase palsu.
Pembayaran menampilkan status transaksi server dan mencegah submit ganda.

## Optimasi aset

Gambar: format modern (WebP/AVIF), srcset responsif, kompresi sesuai konteks.
Font: subset, woff2, font-display swap/optional, preload font kritis.
JavaScript: tree shaking, code splitting per route, minifikasi. CSS: purge unused,
critical CSS inline, defer sisanya. Hindari render-blocking resource.

## Verifikasi

Catat per halaman keputusan memakai/menghindari lazy/skeleton serta alasannya.
Bandingkan network trace sebelum/sesudah pada perangkat, cache dan jaringan yang
sama. Hero harus diminta tanpa scroll; aset jauh di bawah layar boleh tertunda.
Uji cache cepat, jaringan lambat, error dan offline. Ukur LCP, CLS dan INP
aktual; target dan hasil mock bukan bukti performa produksi.
