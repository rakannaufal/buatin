# Strategi lazy loading dan skeleton loading

Panduan ini berlaku untuk spesifikasi yang dihasilkan Bantuin. Pilihan ditentukan
per halaman/komponen, bukan dipasang ke semua website. Ini bukan klaim bahwa
website target atau Core Web Vitals-nya sudah diuji.

## Perbedaan

| Aspek   | Lazy loading                                              | Skeleton loading                                           |
| ------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Fungsi  | Menunda aset/kode yang belum diperlukan                   | Menunjukkan bentuk konten selama data async dimuat         |
| Manfaat | Mengurangi transfer dan pekerjaan awal bila tepat sasaran | Memberi umpan balik dan menjaga struktur visual            |
| Batas   | Tidak untuk hero/LCP dan konten penting awal              | Tidak mempercepat jaringan atau menggantikan status proses |

Pagination/fetch data tambahan berbeda dari lazy gambar dan code splitting.
Ketiganya dapat digabungkan bila diperlukan, dengan batas request dan memori.

## Keputusan menurut halaman

| Halaman/kondisi                   | Lazy loading                                                  | Skeleton loading                                                   |
| --------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Landing page pendek/profil ringan | Tampilkan hero dan konten langsung; tanpa library tambahan    | Tidak untuk konten statis yang tersedia                            |
| Portofolio/galeri panjang         | Karya pertama langsung; media berat bawah layar dapat lazy    | Hanya pada bagian async yang bentuknya diketahui                   |
| Artikel/blog/berita               | Isi dan tautan lewat HTML; ilustrasi bawah artikel dapat lazy | Tidak pada artikel yang sudah dirender lengkap                     |
| Katalog/e-commerce                | Evaluasi media di luar layar; pagination dinilai terpisah     | Kandidat untuk filter/daftar async, bukan seluruh halaman          |
| SaaS/dashboard internal           | Grafik/editor/tab berat dimuat saat dibutuhkan                | Kandidat untuk panel async; refresh mempertahankan data lama       |
| Booking                           | Media di luar layar dapat lazy                                | Kandidat untuk jadwal/slot async; konfirmasi memakai status server |
| SSR streaming                     | Konten utama tetap dapat ditemukan; batas async lokal         | Boleh untuk bagian yang benar-benar menunggu                       |
| Custom                            | Inventarisasi rendering, aset dan sumber data dahulu          | Jangan mengasumsikan seluruh halaman dinamis                       |

Jenis website hanya rekomendasi awal. Katalog statis tidak otomatis membutuhkan
skeleton; landing page yang mengambil data tambahan boleh mempunyai fallback
lokal. React/Vue/Next.js atau SPA tidak otomatis berarti semua komponen menunggu.

## Aturan implementasi

1. Hero/gambar LCP, judul dan isi above the fold tidak di-lazy. Utamakan HTML
   yang dapat ditemukan crawler tanpa scroll/klik. Pakai eager/prioritas/preload
   secukupnya sesuai API framework; jangan memprioritaskan semua gambar.
2. Media berat di bawah layar memakai kemampuan native bila cukup. Tetapkan
   width/height atau aspect-ratio, sizes/srcset serta alt yang sesuai. Video
   memakai poster/preload yang sesuai. Dynamic import komponen berat harus
   dibuktikan menunda resource pada network trace, bukan sekadar memecah bundle.
3. Skeleton mengikuti bentuk/dimensi hasil akhir. HTML statis/SSG, SSR lengkap
   serta cache siap langsung tampil. Pertahankan data saat refresh; pisahkan
   loading, refreshing, empty, error dan success.
4. Hindari flicker: sekitar 300 ms adalah heuristik yang harus diuji, bukan
   delay wajib. Jangan menunda data yang sudah siap atau memaksakan waktu tampil
   minimum. Latensi 0,5-3 detik dapat menjadi skenario uji, bukan janji performa.
5. Proses panjang (misalnya >10 detik) menggunakan tahap/status dan progress bar
   jika progres dapat diukur. Jika tidak diketahui, gunakan indikator dengan
   keterangan. Sediakan timeout, retry/batal bila aman. Persen palsu dilarang;
   pembayaran mengikuti status server dan mencegah transaksi ganda.
6. Wilayah data memakai aria-busy; skeleton dekoratif aria-hidden; satu status
   singkat untuk pembaca layar. Fokus tetap. Hormati prefers-reduced-motion
   dengan placeholder statis; shimmer tidak wajib. Bersihkan request/observer
   saat unmount dan abaikan respons usang.
7. Infinite scroll hanya jika diperlukan brief. Sediakan URL/pagination yang
   dapat dirayapi, tombol muat lagi yang dapat diakses, batas request/memori,
   pemulihan navigasi dan footer yang tetap terjangkau.

## Pengukuran setelah perubahan

Bandingkan perangkat, jaringan dan cache yang sama; simpan network trace serta
HTML. Periksa hero diminta tanpa scroll, resource bawah layar sesuai perilaku
browser, ukuran placeholder tidak mengubah layout, dan tab berat tidak dimuat
sebelum diperlukan. Browser boleh memuat gambar sebelum masuk viewport; jangan
menganggap threshold lazy identik pada semua browser.

Uji data cepat/cached, API lambat, operasi panjang, empty/error/offline, retry,
navigasi saat fetch, keyboard, pembaca layar dan reduced motion. Target awal
persentil ke-75: LCP <=2,5 detik, CLS <=0,1, INP <=200 ms. Catat hasil terukur;
hasil lab tunggal atau mock bukan bukti metrik lapangan memenuhi target.

## Integrasi Bantuin

Snapshot menyimpan rekomendasi jenis website dan rendering. Prompt writer serta
bagian konfigurasi tersimpan memberi aturan sesuai peran dokumen di AGENTS,
architecture, design, components, performance, SEO dan testing, bila terpilih.
Template fallback memuat panduan serupa. Katalog tetap 42 Markdown dan satu
manifest; tidak menambahkan file wajib ke paket ZIP.
