# Audit domain, autentikasi dan kesiapan produksi

Tanggal: 23 Oktober 2026. Origin tujuan: `https://bantuin.ai.id`.
Profil aktif: Vercel Hobby, Supabase Free, `PROCESSING_MODE=request`, tanpa worker.
Pembayaran nyata tetap ditunda. Login Google termasuk pekerjaan aktif.

## Putusan

**Belum dapat dinyatakan siap untuk peluncuran publik.** Build yang berhasil dan
readiness HTTP 200 membuktikan bagian tertentu dari runtime. Keduanya belum
membuktikan callback Google nyata, pengiriman email, pemulihan data, kapasitas,
atau seluruh perjalanan pengguna melalui storage cloud.

P0 berarti menghalangi fungsi inti yang sedang diaktifkan. P1 harus diselesaikan
sebelum menerima pengguna publik. P2 diperlukan untuk peningkatan kapasitas dan
mutu layanan. Temuan dengan bukti source dibedakan dari pemeriksaan cloud yang
belum dilakukan; ketiadaan bukti tidak dianggap bukti kebocoran.

## Temuan dan tindakan

### P0-01: domain runtime sebelumnya berbeda dari domain pengguna

- **Bukti:** root domain HTTPS 200, tetapi canonical, Open Graph, sitemap dan
  robots mengarah ke `https://buatin.vercel.app`. `src/server/auth.ts` memakai
  `APP_URL` untuk base URL, trusted origin dan callback error. Perbedaan ini juga
  berisiko menolak mutation browser atau mengarahkan login ke domain yang salah.
- **Perubahan:** Production `APP_URL` dan `BETTER_AUTH_URL` diset ke
  `https://bantuin.ai.id`; www diarahkan 308 ke apex. Variable GitHub
  `PRODUCTION_URL` dan fallback workflow memakai origin yang sama. Public config
  kini menyertakan `appOrigin`; smoke menolak alias sehat dengan origin berbeda.
- **Penutupan:** deployment baru harus menunjukkan canonical, sitemap, robots,
  `appOrigin`, origin OAuth dan callback pada domain yang sama. Menyimpan env
  saja belum memperbarui deployment yang telah berjalan. Bukti akhir berada di
  `VALIDATION.md`.

### P0-02: aktivasi Google memerlukan seluruh rantai provider

- **Bukti awal:** `googleReady:false`, credential Google dan Turnstile belum
  tersedia. Tombol sengaja tidak ditampilkan ketika konfigurasi belum lengkap.
- **Perubahan:** OAuth web client dibuat pada project `bantuin-512507`, origin
  `https://bantuin.ai.id`, callback
  `https://bantuin.ai.id/api/auth/callback/google`. Client ID dan Secret disimpan
  sebagai sensitive environment Production Vercel, tanpa prefix publik.
  Homepage, privacy, terms dan authorized domain telah disimpan. Audience
  External berhasil berubah ke **In production** setelah persetujuan pengguna.
- **Perubahan antibot:** widget Turnstile gratis `Buatin production` berhasil
  dibuat, Managed, satu hostname `bantuin.ai.id`, tanpa pre-clearance. Kedua key
  disimpan sensitive di Production Vercel; metadata dibaca ulang. Transfer
  sementara terenkripsi dan pasangan key lokal dihapus setelah sukses.
- **Belum terbukti:** konfigurasi baru pada deployment serta callback Google nyata
  sampai cookie sesi dan dashboard. Kelulusan fixture tidak menutup bagian ini.
- **Penutupan:** `googleReady:true`, challenge domain benar, redirect hanya ke
  Google, akun biasa berhasil masuk, cancel/error aman, replay ditolak. Uji akun
  baru dan lama secara terkontrol. Tidak ada permintaan akses Gmail atau Drive.
- **Batas operator:** akun owner/admin atau pengguna ber-MFA wajib memakai
  password/TOTP. Library terpasang belum menantang MFA aplikasi pada social login;
  larangan ini menjaga proteksi operator dan tidak boleh dihapus untuk smoke.

### P1-01: email tidak dikirim pada profil tanpa worker

- **Bukti source:** `queueEmail()` menyimpan `EmailMessage`;
  `deliverEmails()` hanya dipanggil oleh auxiliary loop di `src/worker/index.ts`.
  Worker menolak mode request. Continuation dan cron request tidak mengirim email.
- **Dampak:** verifikasi email, reset password, undangan staf dan pemberitahuan
  privasi dapat mengantre tanpa terkirim. Mengisi Resend saja belum cukup.
  Pengguna Google biasa tidak membutuhkan email verifikasi terpisah, tetapi
  recovery password dan operasional staf tetap terdampak.
- **Perbaikan:** dispatcher serverless dengan batch/deadline, claim atau lease
  persisten, idempotency provider, backoff, batas retry dan status gagal yang
  terpantau. Jangan mengandalkan pekerjaan setelah response tanpa jaminan runtime.
  Cron harian Hobby tidak memenuhi kedaluwarsa tautan verifikasi satu jam.
- **Penutupan:** kirim email nyata ke akun uji yang disetujui, uji retry dan
  timeout ambigu, tanpa duplikasi; jalankan reset/verifikasi sampai selesai.

### P1-02: retensi mode request belum memenuhi kebijakan privasi

- **Bukti source:** halaman `/privacy` menjanjikan isi email tujuh hari,
  AI/budget/audit dan permintaan data terminal 180 hari. Worker maintenance
  memiliki cleanup tersebut; `src/server/request-maintenance.ts` hanya membersihkan
  job/project, request limit, session, verification, outbox dan storage yatim.
- **Dampak:** isi email, audit, AI usage/budget dan permintaan data terminal bisa
  bertahan melampaui janji publik pada profil hosting aktif. `RateLimit` autentikasi
  juga tidak dibersihkan oleh cron request. Ini masalah implementasi, bukan sekadar
  kekurangan pengujian.
- **Perbaikan:** tambah cleanup terbatas dengan cutoff yang sama, urutan stabil,
  indeks sesuai query dan hasil hitungan per tabel. Pertahankan permintaan privasi
  terbuka, data keuangan wajib dan ledger hak pengguna. Tinjau `AdminMutation`
  secara terpisah: response idempotency menyimpan data sehingga perlu kebijakan
  retensi yang tidak memungkinkan efek mutation terulang.
- **Penutupan:** fixture data tua/baru/terbuka, concurrent run, batch berulang dan
  deadline diuji. Bukti operasional menunjukkan usia backlog tertua dan jumlah
  yang benar-benar dibersihkan. Jangan menjalankan fixture pada produksi.

### P1-03: environment deployment sebelumnya tidak membatasi branch

- **Bukti cloud:** GitHub Environment `production` semula memiliki
  `deployment_branch_policy:null` dan tanpa protection rule. Proteksi main tidak
  otomatis mencegah workflow branch lain meminta secret environment tersebut.
- **Perubahan:** policy sekarang `protected_branches:true`,
  `custom_branch_policies:false`; API baca ulang mengonfirmasi branch policy aktif.
  Main tetap memerlukan `verify`, strict, berlaku untuk admin, force push dan
  penghapusan branch dilarang. Jangan menambah branch terlindungi lain tanpa
  meninjau konsekuensi akses ke environment ini.
- **Penutupan:** workflow produksi pada protected main berhasil memakai secret;
  workflow branch biasa tidak diizinkan. Secret tetap project-scoped, tidak
  dicetak. Token deploy berakhir 21 Januari 2027 dan perlu rotasi sebelumnya.

### P1-04: backup di luar host dan restore produksi belum dibuktikan

- **Bukti:** backup terenkripsi dan restore database baru telah diuji pada fixture
  sebelumnya. Belum ada bukti terbaru backup off-host produksi yang dapat diunduh
  dan dipulihkan. Status backup terkelola Supabase belum diverifikasi ulang.
- **Perbaikan:** tentukan RPO/RTO, jadwal, tujuan privat, enkripsi/key terpisah,
  masa simpan dan alarm kegagalan. Backup PostgreSQL perlu pasangan snapshot blob
  Supabase Storage; dump database sendiri tidak memuat semua isi lampiran.
- **Penutupan:** restore ke database/bucket latihan terpisah, cek jumlah dan hash
  lampiran, akses pemilik, migration dan runbook pemulihan. Catat waktu pemulihan.
  Cron retensi tidak dianggap backup; jangan menimpa database sumber.

### P1-05: akses operator dan recovery belum siap

- **Bukti pemeriksaan sebelumnya:** dua akun privileged belum MFA dan dua
  credential account belum memiliki password. Agregat ini belum diperbarui pada
  audit domain ini; guard MFA tetap aktif pada source.
- **Perbaikan:** operator memverifikasi akun, mengatur password, enroll TOTP dan
  menyimpan recovery code di tempat privat. Jalur undangan memerlukan dispatcher
  email yang berfungsi. Google tidak menjadi bypass untuk akun privileged.
- **Penutupan:** operator dapat masuk dengan TOTP, melakukan reauth lima menit,
  mengubah pengaturan yang aman dan melihat audit; recovery diuji secara
  terkontrol tanpa mencabut MFA atau mempromosikan pengguna otomatis.

### P1-06: perjalanan privat pada Vercel/Supabase belum selesai diuji

- **Bukti:** upload/parser, ownership, versi, quota, checkpoint, template dan ZIP
  lulus fixture. Pemeriksaan Supabase sebelumnya membuktikan bucket privat dan
  autentikasi storage server. Belum ada bukti akhir perjalanan akun cloud nyata.
- **Perbaikan:** uji dua akun biasa pada deployment tujuan: brief, gambar/TXT/MD,
  preferensi, plan, continuation, hasil sampai 42 dokumen, resume dan ZIP.
  Coba ID project, lampiran, job, file dan preset akun lain; semuanya ditolak.
- **Penutupan:** hasil yang diunduh cocok, tidak ada duplicate quota, cookie/Origin
  benar, logout/login pada tab yang sama tidak menampilkan cache akun terdahulu.
  Gunakan data uji yang disetujui, tanpa bypass guard atau manipulasi user produksi.

### P1-07: kontak layanan publik kosong

- **Bukti cloud baru:** `/api/site` mengembalikan `supportEmail:""`. Halaman
  `/privacy` 200 tetapi masih menyebut layanan dalam "penyiapan lokal" tanpa
  kontak. Kontak pada Google consent tidak otomatis mengisi kontak aplikasi.
- **Perbaikan:** tetapkan alamat dukungan yang dipantau, identitas pengelola,
  prosedur pengaduan/permintaan data dan tenggat penanganan; selaraskan Google,
  website dan kebijakan provider. Persetujuan legal/retensi perlu operator.
- **Penutupan:** kontak terlihat pada domain final dan permintaan dukungan/privasi
  benar-benar diterima serta dapat ditindaklanjuti. Mengisi teks saja tidak
  membuktikan delivery notifikasi.

### P1-08: monitoring baru membuktikan endpoint HTTP

- **Bukti:** workflow monitor diaktifkan dan run manual sebelumnya sukses. Smoke
  diperluas menjadi 19 pemeriksaan, termasuk admin/settings/download/cron anonim,
  HEAD callback dan kecocokan origin. Delivery alarm operator belum dibuktikan.
- **Perbaikan:** pantau kegagalan fungsi, koneksi/pemakaian DB, storage, job macet,
  antrean email, umur maintenance, kegagalan backup dan kedaluwarsa token deploy.
  Alarm harus sampai ke kanal operator yang nyata.
- **Penutupan:** latihan gangguan pada staging, pemberitahuan gagal/pulih, link
  runbook dan pemilik respons. Jadwal GitHub dapat terlambat; interval sepuluh
  menit bukan SLA. Readiness tidak memeriksa seluruh provider atau backup.

### P2-01: kapasitas dan batas hosting belum terukur

Pool Prisma web dibatasi tiga koneksi per instance, health pool satu. Banyak
instance tetap dapat melampaui kapasitas gabungan Supabase. Uji staging dengan
beban bertahap, p95, error rate, antrean, cold start, penggunaan DB/storage dan
bandwidth. Tetapkan cap serta trigger upgrade berdasarkan hasil tersebut.

Continuation memerlukan tab aktif; menutup tab dapat menghentikan progres sampai
dibuka kembali. Cron harian membatasi cleanup 20 job dan 20 project per run;
backlog dapat menambah keterlambatan penghapusan. Pantau usia tertua dan kapasitas
pembersihan, bukan hanya timestamp "maintenance selesai".

Ketentuan Vercel Hobby membatasi penggunaan personal/nonkomersial menurut
dokumentasi yang diperiksa pada audit sebelumnya. Penundaan payment sendiri
tidak membuktikan SaaS komersial memenuhi ketentuan. Tinjau paket/ketentuan terbaru
sebelum penjualan; tidak ada layanan berbayar yang dibuat pada pekerjaan ini.

### P2-02: batas fitur harus tetap sesuai perilaku nyata

`MOCK_LLM=false` tidak mengubah generator inti menjadi AI generatif: plan dan
dokumen memakai template deterministik. Analisis vision opsional memerlukan
provider/model, anggaran dan smoke terpisah. Jangan menjanjikan kualitas provider
atau generasi tak terbatas berdasarkan fixture. PDF/DOCX tetap ditolak pada mode
request sampai scanner yang layak tersedia. Gambar dan TXT/MD tetap didukung.

### P2-03: pengukuran antarmuka dan pemeliharaan

Belum ada metrik Lighthouse/Core Web Vitals pada domain final, pengujian beban,
Safari/Firefox atau perangkat fisik. Uji keyboard, jaringan lambat, expired session,
offline dan reduced motion. Terapkan `LOADING_STRATEGY.md` per async boundary;
hero/konten awal tetap langsung, skeleton tanpa delay buatan atau layout shift.
Browser fixture Chromium desktop/mobile tidak membuktikan seluruh kondisi ini.

CSP sudah memuat pembatasan sumber, tetapi masih memakai `unsafe-inline` untuk
kompatibilitas SSR; nonce/strict CSP dapat diperkuat terpisah. Tidak ditemukan
bukti eksploit XSS dari directive ini saja. CI sukses sebelumnya juga memberi
notice runtime action Node 20 dan migrasi runner; pembaruan action perlu diuji.

## Tinjauan routes

| Kelompok                                                                                 | Kontrak dan proteksi                                                             | Hasil / perhatian                                                                                        |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/`, `/pricing`, `/privacy`, `/terms`                                                    | Halaman publik SSR, metadata/sitemap                                             | HTTP 200; origin lama dan kontak kosong ditemukan; verifikasi ulang setelah deploy                       |
| `/dashboard`, `/projects/*`, `/jobs/*`, `/library`, `/account`, `/billing`, `/support/*` | Workspace dengan session, email verified, status akun                            | Fixture menguji alur inti; perjalanan cloud dua akun masih wajib                                         |
| `/admin/*`                                                                               | Role server, status terkini, MFA operator                                        | Tidak cukup menyembunyikan menu; reauth/permission tetap wajib di API                                    |
| `/api/public-config`, `/api/pricing`, `/api/site`                                        | Baca publik, tanpa credential server                                             | Site key dan origin memang publik; tidak menampilkan Client Secret atau storage key                      |
| `/api/health/live`, `/api/health/ready`                                                  | Live proses; ready DB/migration dan dependency sesuai mode                       | Keduanya 200 saat audit; ready tidak membuktikan email/storage/OAuth/backup                              |
| `/api/projects/*`, `/api/planning-tasks/*`, `/api/jobs/*`                                | Exact path/method, session, ownership, quota/version, no-store                   | Anonim project/download 401; IDOR dan lease diuji fixture; smoke cloud diperluas                         |
| `/api/processing`                                                                        | POST saja, session, Origin tepat, body strict, lease dan deadline                | GET/HEAD 405; tidak menerima user ID untuk memilih akun lain                                             |
| `/api/account/*`, `/api/presets/*`, `/api/templates/*`, `/api/support/*`                 | Session, ownership, validation dan rate limit                                    | Recovery/email serta penanganan privasi operasional masih perlu ditutup                                  |
| `/api/admin/*`, `/api/settings/*`                                                        | Role/permission, MFA, reauth, reason, Idempotency-Key dan audit                  | Anonim 401; fixture mencakup owner terakhir/concurrency; operator nyata belum siap                       |
| `/api/auth/*`                                                                            | Better Auth, database rate limit, trusted origin, state/PKCE, token verification | Bug HEAD callback diperbaiki; OAuth nyata menunggu chain provider lengkap                                |
| `/api/cron/maintenance`                                                                  | GET ber-Bearer secret, constant-time, lease, bounded batch                       | Tanpa secret 401, HEAD 405; tidak dipanggil dengan secret untuk audit karena menghapus data nyata        |
| `/api/billing/duitku/callback`                                                           | Signature merchant, idempotency/status keuangan                                  | Aktivasi dan settlement tetap ditunda; fixture bukan bukti payment nyata                                 |
| Suffix asing / metode tidak didukung                                                     | `src/domain/api-routes.ts` dicocokkan sebelum dispatcher                         | Contoh suffix 404, metode salah 405, OPTIONS 204/Allow; seluruh API auth memakai kontrak library sendiri |

### Perbaikan HEAD OAuth

Sebelumnya HEAD pada `/api/auth/*` diterjemahkan menjadi GET, sehingga probe dapat
mengonsumsi state callback sekali pakai. Regression mereproduksi 302 saat seharusnya 405. HEAD kini 405/body kosong, OPTIONS 204, tanpa memanggil handler callback.
Integration membuktikan verification tidak berubah, cookie tidak dibuat dan GET
callback setelah probe tetap berhasil. Tidak ada bukti kompromi akun dari temuan
ini; dampak yang direproduksi adalah side effect pada state OAuth.

## Kontrol yang sudah tersedia

- Migration/RLS server-only, bucket privat, secrets di server; bukti agregat
  sebelumnya mencatat 12 migration dan 45 tabel aplikasi terlindungi. Audit ini
  tidak mengklaim telah mengulang seluruh probe RLS cloud.
- Exact route/method, validasi boundary, ownership server, role/status terbaru,
  version conflict, quota transaction, lease/checkpoint dan idempotency.
- Admin pricing/voucher/user/staf, kontrol operasional, audit, dukungan/privasi,
  permission dan perlindungan owner terakhir; payment nyata tetap nonaktif.
- Upload dibatasi, image signature/EXIF dibersihkan, parser terisolasi tanpa secret,
  bucket tidak publik, unduhan melalui API ownership dengan no-store/nosniff.
- CSP, HSTS, frame denial, secure cookie, Origin mutation dan pembatasan provider.
- Skill pack ditinjau/checksum/lisensi, tanpa eksekusi skrip dari request pengguna.
- Main protected, exact-SHA CI sebelum deployment, source secret scan dan baseline
  historis fingerprint untuk credential lama yang dicabut.

## Urutan penyelesaian

1. Terapkan build dengan origin benar; lengkapi Turnstile dan smoke Google nyata.
2. Benahi dispatcher email serverless, recovery dan enrollment MFA operator.
3. Selaraskan retensi mode request dengan kebijakan, isi kontak pengelola.
4. Buktikan dua akun pada cloud, backup/restore di luar host dan delivery alarm.
5. Ukur kapasitas/performa, tinjau batas hosting sebelum membuka penjualan.

Perintah, jumlah test, kegagalan fixture/sandbox, commit dan hasil deployment
tercatat di `VALIDATION.md`. Temuan terbuka tidak berubah menjadi lulus hanya
karena deployment berstatus Ready.
