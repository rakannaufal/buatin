# Pengujian dan verifikasi perubahan

## Strategi sesuai stack target

Pilih runner dan perintah yang sesuai teknologi yang disetujui. Jangan menyalin
perintah Buatin bila target memakai stack lain. Jelaskan prasyarat, environment,
database test, fixture, serta layanan mock/sandbox.

## Lapisan pengujian

- Unit: aturan domain, validasi, perhitungan, transisi state dan batas input.
- Integration: API/DB, transaksi, ownership, privilege, idempotensi, queue,
  timeout/retry dan kontrak provider.
- E2E: alur utama sampai hasil, reload, validasi, double submit, desktop/mobile,
  keyboard, loading/empty/error/success dan offline yang relevan.
- Keamanan: akun lain, sesi kedaluwarsa, input berbahaya, secrets, file upload
  bermasalah, serta penyalahgunaan endpoint publik.

## Setelah setiap perubahan

1. Simpan reproduksi bug atau regression test yang gagal sebelum perbaikan.
2. Jalankan test relevan setelah edit. Buktikan perilaku pengguna, bukan sekadar
   meniru implementasi.
3. Sebelum selesai, jalankan format/lint/typecheck, test, build, serta smoke test
   sesuai dampak. UI diperiksa desktop/mobile, keyboard dan kontras.
4. Perubahan schema memerlukan migration dan pemeriksaan data lama.
5. Sebelum rilis, CI dan audit wajib lulus. Kegagalan memblokir rilis sampai
   diperbaiki atau ada pengecualian dengan alasan, owner dan batas waktu.

## Traceability dan bukti

Hubungkan REQ ke AC, TEST dan task. Catat tanggal, lingkungan, perintah, hasil
aktual dan keterbatasan. Test target yang belum dijalankan tetap pending. Mock
tidak membuktikan email, pembayaran, vision atau provider nyata berjalan.
Jangan memakai database produksi, data pengguna atau kredensial nyata di fixture.

## Pengujian lazy loading dan skeleton loading

Pilih kasus yang berlaku pada halaman target; jangan menambahkan mekanisme
loading hanya agar ada sesuatu yang diuji.

- Konten statis/SSG/SSR lengkap: isi langsung terlihat, tanpa skeleton/delay buatan.
  Untuk SSR streaming, periksa fallback lokal dan isi HTML yang diterima crawler.
- Hero/LCP serta judul above the fold: tersedia tanpa scroll; periksa markup dan
  network trace. Media berat jauh di bawah layar boleh ditunda sesuai heuristik
  browser. Lazy aset, pemuatan kode dan fetch pagination diuji terpisah.
- Data cepat/cached (<300 ms): tidak ada flicker atau waktu tunggu minimum.
  API sekitar 0,5-3 detik: placeholder sesuai bentuk akhir, layout stabil.
  Angka waktu merupakan skenario uji/heuristik, bukan aturan delay produksi.
- Request panjang (>10 detik): status/tahap nyata, progres hanya jika terukur,
  timeout, error dan retry/batal yang aman. Pembayaran tidak digandakan.
- Refresh mempertahankan data sebelumnya; respons usang/request ganda tidak
  menimpa hasil terbaru. Uji empty/error/offline serta navigasi saat fetch.
- Keyboard/pembaca layar: fokus terjaga, aria-busy/status tidak berulang, balok
  dekoratif aria-hidden. Reduced motion memakai placeholder statis tanpa shimmer.
- Infinite scroll memiliki batas request/memori, tombol/pagination aksesibel,
  URL yang dapat dirayapi dan footer terjangkau jika memang dipakai.

Ukur LCP/CLS/INP pada desktop/mobile dengan jaringan dan cache yang dicatat.
Target persentil ke-75 LCP <=2,5 detik, CLS <=0,1, INP <=200 ms bukan klaim lulus.
Catat hasil dan perbandingan aktual; test target tetap pending sampai dijalankan.
