# Hasil verifikasi Buatin

## Persiapan produksi dan 9router nyata - 21 Oktober 2026

Dijalankan pada macOS arm64, Node.js 24 dan PostgreSQL 17 lokal port 55432.
Integration/E2E memakai build produksi, worker persisten dan mock loopback;
keduanya dijalankan bergantian. Setelah fixture selesai, web/worker direstart
dengan `MOCK_LLM=false`. Kredensial tetap di environment privat mode 0600.

| Pemeriksaan                                        | Hasil aktual                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Prisma migration                                   | Delapan migration diterapkan, termasuk reservasi AI, MFA dan permintaan data                                    |
| `npm test`                                         | 55 tes unit, delapan file, lulus                                                                                |
| `npm run test:integration`                         | 27 tes, lima file, lulus dalam 138,77 detik                                                                     |
| `npm run test:e2e`                                 | 14 skenario Chromium, empat file, lulus dalam 1,3 menit                                                         |
| E2E keamanan akun/operasi ulang                    | Dua skenario lulus dalam 6,4 detik; screenshot desktop/mobile stabil dan tanpa overflow halaman                 |
| `npm run build`, `npm run build:worker`            | Build produksi web dan pemeriksaan emit worker lulus                                                            |
| Format, lint, typecheck                            | Pemeriksaan akhir lulus; lint tanpa warning                                                                     |
| `npm audit --audit-level=high`, audit `--omit=dev` | Keduanya 0 vulnerabilities                                                                                      |
| `npm run templates:verify`                         | Tepat 42 template terstruktur lolos checksum                                                                    |
| `npm run skills:verify`                            | Lima pack yang ditinjau lulus; kode upstream tidak dijalankan                                                   |
| `npm run security:scan`                            | 260 file source/config/dokumen diperiksa tanpa mencetak secrets                                                 |
| `npm run test:backup`                              | Backup database beserta blob fixture, dekripsi, restore terpisah dan pemeriksaan isi/checksum lulus             |
| 9router discovery dan smoke terbatas               | Daftar model HTTP 200; satu inferensi nyata menghasilkan JSON yang diminta                                      |
| Probe akhir dengan AI nyata                        | `/api/public-config` menunjukkan `mock:false`; liveness/readiness HTTP 200                                      |
| `npm run ops:check`                                | Exit 0; database/worker sehat, antrean kosong, tanpa alert                                                      |
| `npm run check:production -- --provider`           | Exit 1 sesuai tujuan: tujuh konfigurasi P0 belum siap, empat tindak lanjut P1 manual; runtime sehat tanpa alert |

Cakupan baru: batas request/token/estimasi USD lintas proses, reservasi concurrent
atomik dan settlement idempotent; backup AES-256-GCM menolak manipulasi/context
salah; MFA aktivasi, pencabutan sesi lama, login dua faktor dan recovery code
sekali pakai; sesi tanpa token; konfirmasi email pada permintaan data; panel
prioritas operasional serta readiness database/migration/worker.

Suite integrasi awal 25/27. Readiness membaca timestamp PostgreSQL tanpa zona
sebagai waktu lokal, sehingga worker sehat terlihat tertinggal tujuh jam.
Query kini menetapkan UTC secara eksplisit. Tes MFA awal mengirim secret URI
Base32 langsung ke helper yang meminta teks mentah; fixture dikoreksi sesuai
format autentikator. Pengulangan MFA lalu seluruh suite lulus. Tidak ada
pelemahan verifikasi atau limiter aplikasi.

Screenshot akun/operasi desktop dan mobile benar-benar diamati dalam dua ronde.
Ronde awal menangkap transisi sidebar dan posisi scroll; pengambilan gambar
diulang dari atas dengan animasi screenshot dinonaktifkan. Kode QR/recovery
fixture ditutup pada screenshot. Tidak ada delay pemuatan buatan pada aplikasi.

Model planner/writer awal `kr/claude-haiku-4.5`; router melaporkan
`claude-haiku-4.5`. Smoke satu request melaporkan 6.568 token input dan lima
output. Overhead router dicadangkan melalui `LLM_INPUT_TOKEN_OVERHEAD=8192`.
Angka ini bukan harga atau bukti kualitas seluruh 42 dokumen. Tarif/batas USD
tetap belum diisi, bukan biaya nol; batas request/token persisten sudah aktif.

Bundle lengkap yang diuji:
`.local/backups/buatin-2026-10-21T02-40-42-462Z-f44d1f30-0d19-42fc-ac65-c327d63b0b44`.
Database inspeksi: `buatin_restore_fc828b203fdf4f1e8622e7d8329a7868`.
File inspeksi: `.local/restore-check-292747a1-0bc9-4c9a-9f90-b2842fde5272`.
Hasil dua file terenkripsi, `attachmentVerified:true`; sumber fixture dibersihkan.
Bundle/database inspeksi dipertahankan privat untuk tinjauan, bukan untuk dilayani
web atau menyalakan worker. Database sumber tidak ditimpa.

Batas: hosting/domain/database produksi ditunda. Email internet, Turnstile nyata,
MFA owner sebenarnya, scanner ClamAV, S3/volume produksi, salinan backup di luar
host, alert eksternal dan CI GitHub belum diverifikasi. Caddy tidak terpasang
lokal; validasi config serta batas upload melalui proxy perlu staging. Pemenuhan
export/penghapusan tetap prosedur manual. Satu warning deprecation pg mengenai
query paralel muncul saat suite; semua tes tetap lulus, perlu tinjauan sebelum
upgrade pg 9. Prioritas lengkap ada di `PRODUCTION_READINESS.md`.

## Peluncur development terpadu — 21 Oktober 2026

`npm run dev` kini memilih Node.js 24, menyiapkan database lokal bawaan dan
Prisma, lalu menjalankan web, worker, serta mock sesuai konfigurasi. Pengujian
perubahan ini dijalankan pada macOS arm64, Node.js 24.22.0:

- `npm test`: 51 tes unit dalam enam file lulus. Enam tes baru memeriksa
  konfigurasi lokal/eksternal, port, penolakan URL publik, penghentian proses,
  SIGKILL setelah timeout, dan proses turunan yang induknya sudah berhenti.
- `npm run lint`, `npm run format:check`, `npm run typecheck`,
  `npm run build:worker`, `npm run security:scan`, dan `sh -n scripts/dev.sh`:
  lulus. Secret scan terakhir memeriksa 232 file tanpa mencetak nilai secrets.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. Percobaan awal
  terhalang DNS sandbox; pengulangan dengan akses jaringan lulus.
- `npm run dev` pada layanan lama yang masih aktif: exit 1 dengan pesan port
  3000 sedang dipakai; proses lama tidak dihentikan.
- Smoke test memakai skrip sementara dengan database fixture terpisah yang
  dimigrasi sebelum startup, `APP_URL=http://localhost:3107`, dan
  `MOCK_LLM_BASE_URL=http://127.0.0.1:4107/v1`. `npm run dev` otomatis memilih
  Node.js 24 dari PATH awal yang memakai Node.js 26; worker mencetak ready,
  `/api/health`, halaman `/`, dan health mock memberi HTTP 200. Port mock
  mengikuti URL meskipun `MOCK_PORT` awal berbeda.
- SIGINT pada peluncur: exit 0, port 3107/4107 tertutup. PostgreSQL, web lama
  port 3000, dan mock lama port 4010 tetap sehat. Database fixture dan skrip
  sementara dibersihkan. Percobaan smoke awal gagal karena path npm dalam
  skrip pengujian salah; sesudah diperbaiki, seluruh smoke test lulus.

Batas perubahan: tidak menambah dependency atau mengubah UI/API/schema.
Build web produksi serta suite integration/E2E tidak diulang untuk perubahan
peluncur ini; hasil sebelumnya tetap tercatat terpisah. Bootstrap PostgreSQL
dari cluster kosong dan provider AI nyata tidak diuji ulang. Worker terpadu
tanpa watch; perubahan kode worker memerlukan restart peluncur.

## Pembaruan 21 Oktober 2026

Sesudah pengembangan kustomisasi brief dan panduan loading, dijalankan pada
macOS arm64, Node.js 24, PostgreSQL lokal port 55432. Web memakai build produksi
`next start`, worker tanpa watch, dan provider mock loopback. Integration dan
E2E dijalankan bergantian agar kontrol mock tidak saling memengaruhi.

| Pemeriksaan                               | Hasil aktual                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx prisma migrate status`               | Lima migration diterapkan; schema up to date, termasuk preferensi dan state referensi revisi                                                      |
| `npm test`                                | 45 tes unit, lima file, lulus                                                                                                                     |
| `npm run test:integration`                | 24 tes, tiga file, lulus dalam 127,40 detik                                                                                                       |
| `npm run test:e2e`                        | 12 skenario Chromium, tiga file, lulus dalam 2,3 menit pada pengulangan terakhir                                                                  |
| `npm run build:worker`                    | Lulus                                                                                                                                             |
| `npm run build`                           | Build Next.js produksi lulus; route publik/workspace/admin terdaftar                                                                              |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities dependency produksi                                                                                                             |
| `npm audit --audit-level=high`            | 0 vulnerabilities seluruh dependency, termasuk tooling worker                                                                                     |
| `npm run skills:verify`                   | Lima pack yang ditinjau lolos checksum sumber/lisensi/adaptasi; tanpa menjalankan kode upstream                                                   |
| `npm run security:scan`                   | 229 file source/config/dokumen diperiksa; lulus, tanpa mencetak nilai secrets                                                                     |
| `npm run check:production`                | Gagal sesuai tujuan: lokal/mock, HTTPS/domain/email/Turnstile/merchant/harga/model/template asli/scanner/storage persisten produksi belum lengkap |

Pemeriksaan akhir `npm run format:check`, `npm run lint`, dan
`npm run typecheck` lulus setelah pembaruan source, dokumentasi dan fixture
browser. Lint tidak melaporkan warning.

Cakupan baru yang benar-benar dijalankan:

- Preferensi auto/manual: sembilan tipe, 40 kategori teknologi, konflik stack,
  pilihan `none`, typography/layout/numeric/custom font, 2-10 warna HEX,
  normalisasi dan kontras. Palet serta pilihan manual bertahan setelah reload
  dan pergantian mode. Unit memeriksa penolakan konfigurasi/HEX yang tidak valid.
- Katalog 27 skill: dua panduan wajib, lima adaptasi pihak ketiga siap, 20 entri
  berstatus koneksi/tinjauan/tidak didukung. Skill belum siap tidak dapat dipilih.
  Sumber, lisensi dan versi dibawa ke snapshot/dokumen; skrip upstream tidak
  dieksekusi. Satu pack tambahan berasal dari GitHub `anthropics/skills` pada
  commit yang dikunci, dengan lisensi Apache-2.0 di tingkat skill.
- Lampiran MD, gambar JPEG yang dinormalisasi WebP tanpa EXIF, PDF dan DOCX:
  upload, ekstraksi, unduhan privat, signature/ukuran, Origin, ownership akun lain,
  konflik versi, batas 10 file, retensi yang mempertahankan revisi/job. Unit
  parser juga menolak UTF-8 rusak, binary/control characters, PDF rusak/>100
  halaman, DOCX entity serta ekspansi berlebihan.
- Pemrosesan dokumen di konteks URL publik tanpa scanner menolak file; executable
  scanner yang gagal juga menolak. Planner menolak referensi rejected; download
  ditahan. Retry loopback berhasil. PDF scan tanpa teks menjadi ready dengan
  peringatan OCR, catatan manual ikut snapshot. Ini bukan uji ClamAV nyata.
- Revisi memulihkan preferensi/catatan referensi; preset menyimpan preferensi.
  Writer menghasilkan warna/font/skill/catatan tersimpan. Regenerasi tetap memakai
  snapshot asal setelah draft diubah, lalu unduhan hasil berhasil.
- Policy loading membedakan konten dan aplikasi serta rendering SSG/Hybrid.
  Template/prompt/konfigurasi hasil mengharuskan hero/LCP segera tersedia,
  skeleton kondisional, tanpa delay buatan, layout stabil, reduced motion,
  aksesibilitas, status/progres nyata dan bukti pengukuran. Unit serta integration
  memeriksa isi Markdown hasil. Belum ada pengukuran website target.
- E2E baru melewati editor, unggahan/catatan, stack manual, 10 warna, tipografi,
  skill, reload, planner, generasi dan pembacaan dokumen hasil. Mobile 390px
  memeriksa keyboard, pilihan tersimpan, validasi format, skill belum tersedia
  dan tidak ada overflow. Screenshot gaya desktop serta palet mobile diamati.
- Suite lama kembali lulus untuk registrasi, akses paket, preset/revisi,
  regenerasi, batch, invoice fixture, admin, preview aman, ZIP dan hapus proyek.
  Katalog tetap 42 Markdown; ZIP maksimum 43 entri termasuk manifest.

Suite browser awal 9/12: test kustomisasi membaca file saat proses baru 3/21
selesai, sedangkan dua login beruntun mendapat HTTP 429. Fixture kini menunggu
judul selesai dan menghormati `Retry-After`/`X-Retry-After`. Tidak ada pelemahan
rate limit aplikasi. Pengulangan seluruh suite lulus 12/12.

Batas tambahan: belum memakai S3 sungguhan, scanner malware nyata, OCR eksternal,
model vision atau provider AI berbayar. Konfigurasi publik, staging/deployment,
CI pada host GitHub, enkripsi/lifecycle bucket, dan performance/load test tetap
perlu diverifikasi operator. Test lokal ini membuktikan pipeline mock dan
perilaku aplikasi, bukan kualitas inference atau implementasi website target.

## Arsip verifikasi 20 Oktober 2026

Dijalankan 20 Oktober 2026 pada macOS arm64, Node.js 24.22.0 dan PostgreSQL 17.11
native. Web memakai build produksi `next start`, worker persisten, dan AI mock
loopback. Docker tidak digunakan. Seluruh akun pengujian terpisah dari owner.

## Pemeriksaan

| Pemeriksaan                    | Hasil yang diamati                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma migrate status          | Ketiga migration sudah diterapkan; schema up to date                                                                                  |
| `npm run format:check`         | Lulus                                                                                                                                 |
| `npm run lint`                 | Lulus tanpa warning                                                                                                                   |
| `npm run typecheck`            | Lulus                                                                                                                                 |
| `npm test`                     | 32 tes unit lulus                                                                                                                     |
| `npm run test:integration`     | 20 tes lulus, dua file, 97,70 detik pada pengulangan terakhir                                                                         |
| Playwright Chromium            | 10 skenario lulus: suite sembilan tes 1,6 menit, tes admin tambahan 5,1 detik; invoice diuji ulang langsung pada viewport mobile      |
| `npm run build:worker`         | Emit TypeScript worker lulus                                                                                                          |
| `npm run build`                | Build produksi Next.js lulus, seluruh route publik/workspace/admin terdaftar                                                          |
| `npm audit --audit-level=high` | 0 vulnerabilities pada seluruh dependency                                                                                             |
| Backup database                | Backup custom-format pascamigrasi berhasil, permission 0600                                                                           |
| Restore database               | Berhasil ke DB inspeksi terpisah; query Project berhasil; DB sumber tidak diubah                                                      |
| Recovery proses nyata          | SIGKILL worker anak sesudah checkpoint, lease uji kedaluwarsa, worker baru, resume 20/20 dokumen, checksum/attempts file sukses tetap |
| HTTP/security headers          | Login HTTP 200; CSP produksi tanpa unsafe-eval; nosniff, frame deny, referrer dan permissions policy diamati                          |
| `npm run check:production`     | Gagal sesuai tujuan pada konfigurasi lokal/mock; layanan dan harga nyata belum dikonfigurasi                                          |

Backup terbaru yang diverifikasi:
`.local/backups/buatin-2026-10-20T12-03-08-056Z.dump`.
DB inspeksi: `speckit_restore_1792497815463`, dipertahankan untuk inspeksi.

## Akun, paket dan transaksi

- Registrasi melalui UI publik, role awal user, verifikasi email wajib, login,
  recovery password, serta token reset sekali pakai diuji. Email memakai outbox
  privat lokal; bukan pengiriman internet.
- Free satu generasi seumur hidup: request bersamaan hanya memperoleh satu
  reservasi. Menghapus proyek/hasil tidak menambah kesempatan baru.
- Planner Free berhenti pada lima penyusunan rencana tanpa menghabiskan kredit
  generasi. Kuota planner Pro terpisah dari generasi.
- Reset tepat Senin 00.00 WIB, batas tahun, pergantian bulan, clamp akhir bulan,
  expiry Pro kembali ke sisa Free, dan tanpa rollover diuji.
- Refund idempotent ke periode asal, termasuk cancellation sebelum AI dan worker
  yang terhenti. Pengembalian minggu lalu tidak menambah minggu baru.
- Batch yang melebihi sisa kuota dibatalkan seluruh transaksinya: tidak ada job,
  ledger, atau idempotency key tersisa. Max dua proyek berjalan bergantian dengan
  paling banyak satu generasi executing per akun.
- User Free ditolak mengakses admin/settings/preset/template/batch. Pembacaan
  proyek, revisi dan tagihan akun lain mendapat 404; preset pribadi tidak bocor
  dan tidak dapat dihapus akun lain.
- Admin menyimpan perubahan harga/kuota melalui UI. Hak langganan fixture yang
  sudah dibayar tetap memakai snapshot pembelian sebelumnya. Katalog dikembalikan
  ke harga kosong dan penjualan nonaktif setelah tes.
- Checkout QRIS dengan fetch fixture hanya memakai kanal terkonfigurasi, nominal
  dan signature yang sesuai. Klik serentak menghasilkan satu invoice. Metode lain,
  nominal/referensi salah, signature rusak ditolak.
- Callback duplikat tersimpan sekali; aktivasi hanya setelah konfirmasi status
  provider. Callback terlambat sesudah batas polling membuka satu cek tambahan.
  Callback gagal setelah paid tidak menurunkan status atau menambah periode.
- Early renewal menambah interval setelah paid-through; pergantian paket tidak
  mengubah usage minggu berjalan. Tes provider memakai respons fixture, tanpa
  request ke merchant Duitku sesungguhnya atau pembayaran nyata.

## Generator dan browser

- Sembilan tipe website, tepat 42 entri katalog, dependency closure, cycle
  detection, negasi fitur, validasi evidence, parser JSON, lint dan traceability.
- Health failure tidak membuat job. Start/resume idempotent tidak memotong ulang;
  retry key tetap menunjuk hasil yang sama setelah proses selesai atau AI mati.
- Arsip ZIP benar-benar diperiksa central directory-nya: tepat file pilihan plus
  satu manifest, termasuk skenario seluruh 42 Markdown dan 43 entri ZIP.
- File gagal menghasilkan partial; tautan putus memblokir ZIP. Resume setelah
  langganan habis tetap memakai reservasi/checkpoint dan retensi awal 180 hari.
- Pembatalan in-flight menghentikan request berikutnya; cancelled tidak diekspor.
  Lease recovery, fencing duplicate worker dan pengiriman ulang antrean diuji.
- Plus: preset dipakai ulang, brief tersimpan sebagai revisi, generasi, regenerasi
  pilihan beserta dependensi, checksum file salinan, perbandingan versi, kuota 2/10.
- Max: template PRD pribadi tertangkap dalam snapshot batch, dua proyek selesai,
  kuota 2/25, batas satu executing/account teramati.
- Invoice QRIS fixture tampil pada ponsel 390px, countdown/status terbaca, akses
  anonim ditolak. Kode fixture sengaja tidak dapat dipakai untuk membayar.
- Landing/pricing/signup/privacy/terms/recovery, navigasi mobile, form, preview,
  source, ZIP, dan delete dijalankan melalui browser. Tabel paket dapat digeser
  memakai keyboard. Tidak ada overflow horizontal halaman pada viewport uji.
- Markdown berbahaya tidak menjalankan script, tidak menampilkan raw HTML/gambar
  remote, dan tidak mengirim request tracker. Unduhan konten berbahaya ditolak.
- Screenshot desktop dan mobile benar-benar diamati. Arsip QA privat berada di
  `.local/qa/`; hasil sementara Playwright berada di `test-results/`, diabaikan Git.

## Bug yang ditemukan dan diperbaiki

- Kandidat retensi dapat berubah setelah query awal. Cleanup kini memegang lock
  akun dan memeriksa ulang draft/proses sebelum penghapusan; tes regresi lulus.
- Callback baru setelah polling habis kini diperiksa kembali; replay callback
  identik tidak membuka polling baru. Pembayaran tetap perlu konfirmasi provider.
- Klik start dengan key berbeda saat job aktif kini dicatat agar retry sesudah
  job selesai tetap mengembalikan job yang sama.
- Cache draft yang masih fresh dapat menghentikan polling halaman rencana setelah
  memakai preset. Mutasi menginvalidasi data proyek; halaman rencana selalu
  meminta status terbaru saat dibuka. Riwayat revisi juga disegarkan setelah save.
- Regenerasi belum boleh berjalan ketika hasil masih ditulis. Kontrol menunggu
  status selesai/partial; pilihan di luar paket mendapat HTTP 400.

## Batas yang belum diverifikasi

- Harga komersial belum ditentukan. Tiga Pro masih `monthlyPrice=null`,
  `available=false`; fixture harga bukan harga jual.
- Merchant QRIS Duitku, callback publik HTTPS, kanal merchant aktif, settlement
  dan transaksi sandbox merchant yang sesungguhnya belum diuji.
- Domain Resend/Turnstile, pengiriman email nyata, domain publik dan HTTPS belum
  dikonfigurasi. Local outbox tidak membuktikan email sampai ke pengguna internet.
- Tidak ada inference berbayar atau panggilan 9router/provider nyata. Model,
  kualitas, biaya AI, dan harga paket masih perlu diukur.
- Kit dokumen asli belum tersedia; template bawaan masih fallback berlabel.
- Unit systemd, Caddy, backup timer, CI GitHub dan deployment VPS belum dijalankan
  pada host eksternal. Tidak ada perubahan DNS atau deployment publik.
- Belum ada soak/load test banyak pengguna, Safari/Firefox atau perangkat fisik.
  Concurrency diuji pada dua pekerjaan batch lokal; kapasitas produksi belum diukur.
- Recovery memakai lease uji 30 detik; produksi default 15 menit. Restore berhasil
  secara lokal; belum dilakukan latihan cutover produksi atau restore off-site.
- Cleanup mencakup tes race dan pembatalan, bukan simulasi seluruh usia 180 hari
  beserta semua backup. Rotasi dan enkripsi backup off-site perlu dioperasikan.
- Tes generator ini tidak membuktikan implementasi proyek target yang dituliskan
  dalam dokumen hasil.
