# Dokumen layanan Buatin

## Lingkup dan rencana

Perubahan 24 Oktober 2026: lengkapi ketentuan, privasi, FAQ, batas penggunaan
hasil, pengembalian dana, cookie dan kontak. Gunakan tampilan publik yang ada.
Tambahkan tautan footer, metadata dan sitemap. Uji keterbacaan, akses anonim,
navigasi serta kompatibilitas pengaturan situs lama. Catat hasil di VALIDATION.md.

Dokumen mengikuti perilaku kode saat ini. Ini bukan pernyataan bahwa identitas,
provider produksi atau seluruh kewajiban operasional telah diverifikasi.

## Keputusan pemilik

- Pengelola perorangan, dikonfirmasi 24 Oktober 2026.
- Nama pengelola, alamat korespondensi dan email bantuan resmi belum diberikan.
  Pemilik meminta diingatkan saat audit. Jangan mengarang atau memakai identitas
  bootstrap sebagai identitas publik.
- Simpan data tersebut melalui Admin > Pengaturan situs. Alamat dan nama yang
  diisi akan tampil publik. SUPPORT_EMAIL tetap menjadi fallback email bantuan.

## Fakta yang menjadi dasar

| Topik     | Perilaku dan sumber                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produk    | Paket dokumen Markdown dari template; bukan website yang dibangun atau dihosting. `src/worker/planner.ts`, `src/worker/generator.ts`.                                                                                                |
| AI        | Analisis gambar opsional mengirim gambar dan konteks ke provider melalui router. Dokumen inti tidak memakai panggilan AI. `src/server/llm.ts`, `src/server/references-api.ts`.                                                       |
| Paket     | Harga/manfaat yang dipublikasikan admin dan snapshot pembayaran berlaku. Free memiliki kuota sepanjang umur akun; Pro mingguan, reset Senin 00.00 WIB. `src/server/entitlements.ts`, `src/domain/billing.ts`.                        |
| Tagihan   | QRIS Duitku, verifikasi server, satu bulan kalender, tanpa autodebit; perubahan tingkat periode berikutnya. `src/server/billing.ts`, `docs/BILLING.md`.                                                                              |
| Refund    | Kuota kembali sekali ke sumber asal sesuai kondisi job. Refund uang ditinjau manual, penuh per invoice; panel tidak mentransfer dana. `src/server/admin/finance.ts`, `src/server/entitlements.ts`.                                   |
| Akun      | Password di-hash, sesi tujuh hari, Google opsional, MFA dan pemulihan. `src/server/auth.ts`.                                                                                                                                         |
| Retensi   | Draft 24 jam; proyek tanpa job dan tidak diperbarui 14 hari dibersihkan; hasil mengikuti tanggal paket; audit/AI/permintaan data terminal 180 hari; antrean email tujuh hari. `src/worker/maintenance.ts`, `src/server/projects.ts`. |
| Privasi   | Permintaan salinan/penghapusan ditinjau manual; bukti penyelesaian wajib. Retensi finansial dan backup perlu keputusan operator. `src/features/account/privacy.tsx`, `SECURITY.md`.                                                  |
| Pelacakan | Cookie sesi/keamanan; font lokal. Paket analytics terpasang tetapi komponennya tidak dimuat aplikasi. `src/app/layout.tsx`, `src/components/providers.tsx`.                                                                          |

## Dasar hukum yang ditinjau

Dibaca 24 Oktober 2026 dari sumber pemerintah. Isi halaman ditulis ulang sesuai
layanan, tanpa menyalin klausula umum atau mengklaim sertifikasi kepatuhan.

- [UU 27/2022 tentang Pelindungan Data Pribadi](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/):
  tujuan/dasar pemrosesan, hak subjek, penanganan insiden dan transfer luar negeri.
- [UU 8/1999 tentang Perlindungan Konsumen](https://jdih.kemenkeu.go.id/api/download/fulltext/1999/8TAHUN~1999UU.htm):
  informasi layanan, pengaduan, ganti rugi, serta larangan klausula baku pada Pasal 18.
- [PP 80/2019 tentang Perdagangan Melalui Sistem Elektronik](https://peraturan.bpk.go.id/Home/Download/117172/PP%20Nomor%2080%20Tahun%202019.pdf):
  informasi kontrak, pembatalan dan mekanisme pengembalian dana (Pasal 53, 69, 71).

Jangan menetapkan larangan refund mutlak, pengalihan seluruh tanggung jawab,
persetujuan otomatis atas semua perubahan, atau pelepasan hak konsumen.

## Wajib dibahas pada audit sebelum peluncuran

- [ ] Ingatkan pemilik untuk mengisi nama pengelola, alamat korespondensi dan email
      resmi. Uji email masuk dan balasan; tiket akun tidak menggantikan kontak
      publik bagi orang yang kehilangan akses akun.
- [ ] Pastikan identitas pada dokumen, merchant, domain dan bukti transaksi sama.
- [ ] Inventaris provider produksi, model AI, negara pemrosesan, subprosesor,
      perjanjian data dan syarat transfer. Jangan mengklaim lokasi atau larangan
      training provider tanpa bukti kontrak.
- [ ] Tetapkan retensi pembayaran, tiket, akun tidak aktif, log infrastruktur dan
      backup; sertakan dasar hukum serta prosedur hapus/pseudonimisasi.
- [ ] Jalankan pemenuhan akses/koreksi/export/penghapusan dan penarikan persetujuan.
      Uji verifikasi pemilik, penolakan beralasan dan pemberitahuan hasil.
- [ ] Siapkan penanganan insiden dan pemberitahuan sesuai tenggat UU PDP.
- [ ] Verifikasi refund nyata dengan merchant, dana ke pemilik yang tepat, bukti
      transfer, pemberitahuan serta pencabutan sisa akses yang dikembalikan.
- [ ] Tetapkan penanggung jawab dan target respons dukungan/refund. Halaman tidak
      menjanjikan tenggat operasional atau biaya potongan yang belum ditetapkan.
- [ ] Tinjau syarat pada pendaftaran Google dan checkout, penyimpanan versi yang
      disetujui, pemberitahuan perubahan material serta perizinan usaha/PSE yang berlaku.
- [ ] Tinjauan hukum akhir untuk model usaha dan kontrak provider yang digunakan.

Checklist ini tetap terbuka sampai ada bukti. Lulus build/test atau tersedianya
halaman tidak menutup audit hukum maupun membuktikan layanan produksi.
