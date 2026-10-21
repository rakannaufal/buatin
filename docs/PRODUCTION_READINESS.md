# Kesiapan produksi dan prioritas

Target awal pada `DEPLOYMENT.md`: Vercel web, Supabase PostgreSQL/storage,
Railway worker tetap. Akses SQL operator ke project Supabase `buatin` sudah
diverifikasi; schema aplikasi belum dimigrasikan. Koneksi runtime hosting,
bucket dan kredensial Google produksi belum dihubungkan; layanan belum diluncurkan.
Bukti eksekusi terbaru ada pada `VALIDATION.md`.

## Sudah disiapkan dalam aplikasi

- 9router dengan kunci privat, discovery model dan smoke beroutput terbatas.
  Model awal planner/writer: `kr/claude-haiku-4.5`; pilihan dapat diganti operator.
- Reservasi request/token dan estimasi biaya harian dalam transaksi database,
  meliputi web, worker, retry dan vision. Request ambigu tetap dicadangkan.
- MFA autentikator, kode pemulihan terenkripsi, pencabutan sesi saat aktivasi,
  pengelolaan sesi, serta kewajiban MFA untuk operator pada domain publik.
- Liveness `/api/health/live`, readiness `/api/health/ready` (alias `/api/health`)
  memeriksa database/migration dan worker, dengan timeout serta HTTP 503.
- Dashboard Admin menampilkan prioritas, antrean, disk, kegagalan, penggunaan AI
  dan permintaan data. `npm run ops:check` menghasilkan JSON dan exit nonzero
  pada masalah runtime. Contoh service/timer monitoring tersedia di `deploy/`.
- Backup terenkripsi database dan blob dengan snapshot PostgreSQL, checksum,
  manifest terautentikasi, key terpisah dan restore ke database baru.
- 42 template terstruktur, checksum tervalidasi dan snapshot; template builtin
  hilang/berubah tanpa tinjauan menghentikan generasi, bukan fallback diam-diam.
- CI, fixture mock terisolasi dari kunci nyata, pemeriksaan keamanan/skill/template
  dan prosedur verifikasi setelah perubahan.
- Panel admin dengan izin owner/admin, reauth lima menit, undangan staf,
  suspend/revokasi sesi, grant/kredit terbatas dan audit atomik.
- Draft/publish paket, snapshot manfaat pembelian, voucher/reservasi atomic,
  pencatatan refund penuh dan rekonsiliasi tanpa tombol lunas manual.
- Konten reviewed/versioned, pengaturan situs/operasi, laporan privat,
  tiket bantuan serta bukti penanganan permintaan privasi. Lihat `ADMIN_GUIDE.md`.

## P0: sebelum menerima pengguna publik

| Kebutuhan                          | Tindakan dan bukti yang diperlukan                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting, domain, database produksi | Hubungkan Vercel, Supabase dan Railway worker sesuai `DEPLOYMENT.md`. Pisahkan staging/produksi, migration, HTTPS dan secrets; lindungi Data API serta koneksi worker.                          |
| Login Google                       | Buat OAuth web client, redirect `/api/auth/callback/google`, secret server dan audience publik. Uji akun baru/lama, email terverifikasi, cancel, pause serta penolakan MFA/staf.                |
| Akun operator                      | Aktifkan dua faktor melalui Akun; simpan recovery codes. Jangan menggunakan akun/email bootstrap lokal sebagai identitas publik.                                                                |
| Email dan perlindungan registrasi  | Isi Resend, pengirim/domain terverifikasi, Turnstile site/secret dan SUPPORT_EMAIL. Uji verifikasi/reset sampai email diterima.                                                                 |
| Anggaran AI                        | Tarif USD belum ditebak. Isi LLM_INPUT_USD_PER_MILLION / LLM_OUTPUT_USD_PER_MILLION dengan tarif konservatif seluruh model, LLM_DAILY_BUDGET_USD, lalu batas tagihan pada provider.             |
| Kredensial provider                | Rotasi key yang pernah dibagikan melalui percakapan sebelum peluncuran; simpan hanya di secret environment. Pastikan izin penggunaan upstream dan kapasitas 9router.                            |
| Upload privat                      | Pilih volume persisten bersama web/worker atau bucket privat, atur path absolut, pasang scanner ClamAV-compatible dan pembaruan signature. Uji bersih/berbahaya, ownership dan batas proxy/API. |
| Pemulihan                          | Jadwalkan backup, simpan salinan terenkripsi di luar host dan key terpisah. Uji restore database + blob pada infrastruktur tujuan; tentukan RPO/RTO dan retensi.                                |

Batas request/token AI sudah aktif meski tarif USD belum tersedia. Pembatas biaya
aplikasi adalah estimasi, bukan otoritas tagihan: overhead router, harga model,
cache/provider dan request yang terputus dapat mempengaruhi biaya sebenarnya.
Usage yang dilaporkan dapat melebihi reservasi; request berikutnya diblokir saat
batas tercapai. Provider-side spending cap tetap diperlukan.

## P1: sebelum penjualan dan peluncuran penuh

1. Tinjau draft lalu publish harga/manfaat di `/admin/plans`. Tentukan kebijakan
   voucher/refund, batas grant admin dan penanggung jawab keuangan; sambungkan
   merchant Duitku produksi. Panel refund mencatat hasil, tidak mentransfer uang.
   Checkout tetap nonaktif selama paket tidak diaktifkan. Free dapat diluncurkan
   terlebih dahulu setelah seluruh P0 terpenuhi.
2. Jalankan uji staging provider, email, Turnstile, scanner, storage, callback QRIS,
   backup/restore dan browser/perangkat. Uji beban dengan mock, lalu smoke AI nyata
   terbatas; hindari beban provider berbayar tanpa anggaran.
3. Sambungkan pemeriksaan uptime dan log ke alert operator di luar host. Service
   monitoring contoh hanya menghasilkan status/journal; belum mengirim notifikasi.
4. Lengkapi identitas pengelola, retensi pembayaran/backup, kebijakan pemroses AI
   dan prosedur pemenuhan permintaan data. Permintaan tercatat di aplikasi;
   pengelola tetap harus memenuhi dan mencatat buktinya secara privat.

## P2: peningkatan setelah alur utama stabil

- Evaluasi kualitas hasil nyata untuk sembilan jenis website dan seluruh dokumen;
  tinjau konsistensi, traceability, bahasa, ketepatan preferensi dan biaya per paket.
- Browser Firefox/WebKit, audit aksesibilitas manual, Core Web Vitals dan kapasitas
  database/worker pada perangkat serta jaringan pengguna sebenarnya.
- Tinjau warning query paralel pada driver pg sebelum upgrade ke pg 9; suite
  saat ini lulus dengan versi dependency terkunci.
- Pengiriman export data otomatis yang aman, penyederhanaan dukungan dan pemantauan
  tren. Tambahkan kompleksitas hanya setelah kebutuhan/volume terbukti.

## Perintah pemeriksaan

```sh
npm run provider:check
npm run provider:check -- --smoke
npm run ops:check
npm run check:production -- --provider
npm run templates:verify
```

`provider:check` discovery saja; `--smoke` melakukan inferensi nyata yang dapat
ditagih, tercatat dan dibatasi 128 token output per model unik. Kelulusan
`check:production` hanya menilai konfigurasi dan runtime, tidak menggantikan
langkah staging, legal, kapasitas atau pemulihan di tabel.
