# Release produksi

Web: Vercel. PostgreSQL dan bucket referensi: Supabase. Worker harus berjalan
sebagai proses persisten di host terpisah. Dokumen inti memakai template
terstruktur; analisis gambar melalui 9router bersifat opsional.

## Urutan aktivasi

1. **Operator:** pasang connection string PostgreSQL pada secret environment
   Vercel dan worker. Publishable key Supabase tidak menggantikan password
   PostgreSQL. Web boleh memakai transaction pooler dengan pool kecil; worker,
   migration, dan backup wajib direct/session. Pertahankan TLS; jangan mematikan
   pemeriksaan sertifikat untuk menyembunyikan masalah koneksi. Role runtime
   sebaiknya terpisah dari role migration, tanpa hak administratif Supabase.
2. **Operator:** jalankan recovery owner melalui terminal berizin database:
   `OWNER_EMAIL=<email> npm run owner:reset -- --generate`. Password tersimpan
   privat di `.local/owner-password`, tidak boleh dikirim lewat chat atau Git.
   File lama tidak ditimpa. Aktifkan autentikator dan simpan kode pemulihan.
   Bootstrap hanya membuat owner pertama; staff memakai undangan admin.
3. **Operator:** konfigurasi `APP_URL` sebagai origin HTTPS final,
   `MOCK_LLM=false`, `ADMIN_REQUIRE_2FA=true`, `BETTER_AUTH_SECRET` kuat.
   Runtime Vercel memeriksa konfigurasi dasar juga; pemeriksaan bukan hanya pada
   script startup. Liveness berbeda dari readiness database/worker.
4. **Operator:** pasang Resend, pengirim/domain terverifikasi dan Turnstile.
   Pasang Google OAuth web client dengan callback
   `/api/auth/callback/google` pada origin final. Jalankan login, verifikasi,
   reset, logout dan pencabutan sesi nyata. Konfigurasi saja belum membuktikan
   pengiriman email atau callback provider.
5. **Operator:** hubungkan S3-compatible Supabase ke `REFERENCE_S3_*` pada kedua
   host. Bucket `buatin-references` privat; konfigurasi idempotennya tersedia di
   `deploy/supabase-storage.sql`. Objek disimpan sebagai octet-stream di prefix
   `references/`. Kunci server tidak boleh masuk browser. Unggahan ditolak bila
   storage/worker belum siap; filesystem Vercel tidak menjadi fallback.
6. **Operator:** pilih host worker. `deploy/render-worker.yaml` merupakan opsi
   Blueprint native Node tanpa Docker. Tinjau biaya provider sebelum membuat
   layanan; push tidak membuat layanan. Satu replica, session connection, restart
   otomatis dan shutdown SIGTERM diperlukan. PDF/DOCX memerlukan executable
   ClamAV-compatible, signature terbaru dan uji file bersih/berbahaya. Blueprint
   native belum memasang scanner; gunakan host yang mendukungnya sebelum
   mengaktifkan dokumen biner. Gambar/teks tetap melalui validasi aplikasi.
7. **Operator:** jadwalkan `npm run db:backup` pada host dengan PostgreSQL tools,
   volume privat dan `BACKUP_KEY_FILE` mode 0600. `BACKUP_S3_*` memakai target
   privat terpisah. Arsip terenkripsi dibaca kembali dan diperiksa SHA-256 sebelum
   receipt `backup.remote` ditulis. Kunci enkripsi tidak ikut diunggah. Tetapkan
   lifecycle/retensi serta salinan kunci di tempat berbeda. Dump hanya schema
   aplikasi `public` dan antrean `pgboss`, bukan schema internal Supabase.
8. **Operator:** uji restore dari salinan luar host ke PostgreSQL terisolasi.
   Unduh satu prefix `backups/<id>/`, periksa `COMPLETE.json`, lalu gunakan
   `npm run db:backup -- <directory> --restore` dengan environment **database
   latihan**, bukan produksi. Jangan memakai script legacy untuk dump plaintext
   pada database produksi.
   Restore membersihkan objek hanya pada database UUID baru yang dibuat script;
   schema dan data database sumber tidak ditimpa.
   Target RPO 24 jam, RTO 4 jam merupakan tujuan awal;
   ukur dan catat waktu nyata sebelum menjanjikannya. Systemd timer yang tersedia
   dapat dipakai pada VPS. Alert uptime harus memeriksa `/api/health/ready` dan
   `npm run ops:check`; receipt backup lokal saja tidak cukup.

## Gate GitHub dan Vercel

- `Native validation` wajib lulus untuk commit yang akan dirilis. CI menguji
  migration, format, lint, typecheck, secret scan saat ini/riwayat, unit,
  integrasi, browser, build, backup/restore dan dependency audit.
- Automatic Git deployment branch `main` dinonaktifkan melalui `vercel.json`.
  Workflow `Deploy verified production` hanya menerima hasil sukses dari push
  `main` repository yang sama, memeriksa SHA terbaru, lalu meminta deployment
  commit tersebut melalui API Vercel resmi.
- **Operator:** isi GitHub Environment `production` dengan `VERCEL_TOKEN`,
  `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`; batasi deployment branch ke `main`.
  Isi variable `PRODUCTION_URL`. Jangan tempel token di issue, chat atau file.
  Tanpa secret ini deployment berhenti, tidak kembali melewati CI.
- **Operator:** aktifkan branch protection/ruleset `main` dengan required check
  `verify`, larangan force push dan review sesuai tim. File workflow tidak
  otomatis mengubah ruleset repository.
- Setelah deployment READY, `npm run deploy:smoke -- <origin>` memeriksa route
  publik, auth/session, readiness, 404/405/HEAD/OPTIONS dan kesiapan login publik.
  Smoke gagal berarti rilis belum diterima meskipun build sukses.
- Smoke berjalan setelah deployment, sehingga tidak menggantikan staging.
  Untuk rollback, pilih deployment terakhir yang terbukti sehat di Vercel.
  Rollback kode tidak membatalkan schema atau menghidupkan kredensial yang dicabut.
  Jangan force-push riwayat untuk rollback.

## Kontrak dan pengujian

`src/domain/api-routes.ts` menjadi daftar path/metode dispatcher utama. Path
asing mendapat 404 sebelum auth/body/mutasi. Path dikenal dengan metode salah
mendapat 405 dan `Allow`; HEAD menjalankan GET tanpa body, OPTIONS tidak bermutasi.
Better Auth dan callback Duitku tetap mempunyai handler khusus. Ownership, role,
MFA, Origin, rate limit dan idempotency tetap diperiksa server.

Perubahan sesi memakai navigasi dokumen penuh; QueryClient workspace juga
terikat user/session. Polling job membaca metadata tanpa isi dokumen, melambat
ketika worker terputus atau request gagal, mempertahankan status terakhir.
Tidak ada delay buatan, lazy pada hero, maupun skeleton untuk pekerjaan panjang.
Draft tetap dapat disimpan saat worker mati; hanya pekerjaan antrean baru yang
ditahan. Sitemap hanya mencakup halaman publik, canonical/Open Graph mengikuti
origin APP_URL, workspace dan halaman autentikasi tidak diindeks. Informasi
privasi dan pembatalan mengikuti mode template serta checkpoint sebenarnya.
Refund pembatalan memerlukan nol request provider **dan** nol checkpoint berhasil;
nol request AI tidak berarti generator template belum menghasilkan dokumen.

Hasil fixture lokal, mock S3, atau build tidak membuktikan layanan cloud siap.
Aktivasi provider, akses runtime dan pengujian pemulihan nyata tetap release gate.
