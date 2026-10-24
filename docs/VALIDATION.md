# Hasil verifikasi Buatin

## Dokumen layanan dan identitas pengelola - 24 Oktober 2026

Ketentuan layanan dan privasi ditulis ulang berdasarkan perilaku aplikasi.
Halaman refund, batas penggunaan hasil, cookie, FAQ dan kontak ditambahkan.
Ketujuh halaman tersedia tanpa login, mendapat metadata dan tautan footer,
serta masuk sitemap/robots. FAQ tambahan admin kini hanya tampil di halaman FAQ.
Tidak ada daftar skill baru pada UI.

Pengelola dikonfirmasi perorangan. Nama, alamat korespondensi dan email resmi
belum diberikan; tidak diisi dengan data rekaan. Pengaturan situs mendukung nama
dan alamat publik, tetap membaca pengaturan lama, serta memakai SUPPORT_EMAIL
sebagai fallback. Pengingat audit disimpan di `LEGAL_REVIEW.md`, checklist
perubahan, kesiapan produksi dan pemeriksaan operasional. Dasar hukum dan fakta
kode yang ditinjau tercatat di `LEGAL_REVIEW.md`.

Verifikasi memakai Node.js 24.22.0, production build terpisah
`.local/legal-fixture/next`, database PostgreSQL loopback khusus fixture sebelumnya
dan `MOCK_LLM=true`. Wrapper `.local/legal-fixture/run.mjs` membaca konfigurasi
privat tanpa mencetak kredensial. Tidak ada migration atau dependency baru.

| Perintah                                                                                                                                                  | Hasil aktual                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit terfokus sebelum edit                                                                                                                                | 18 test / tiga file lulus                                                                                                                                |
| `npm test`                                                                                                                                                | 159 test / 23 file lulus                                                                                                                                 |
| `npm run format:check`, `npm run lint`, `npm run typecheck`                                                                                               | Lulus                                                                                                                                                    |
| `npm run build:worker`, `npm run build`                                                                                                                   | Build worker dan production web lulus                                                                                                                    |
| `node_modules/vitest/vitest.mjs run tests/integration/admin.test.ts --maxWorkers=1 -t 'publishes operator details'`                                       | Satu test lulus, 17 tidak dipilih: persistence identitas, 401/403, versi lama 409, HTML escape dan email publik                                          |
| `node_modules/@playwright/test/cli.js test tests/e2e/service-pages.spec.ts tests/e2e/saas.spec.ts --grep 'service pages\|policy content\|public landing'` | Empat skenario lulus: tujuh halaman pada 1440/390px, navigasi keyboard, footer 44px, login guard, metadata, sitemap, robots, HTML awal dan halaman paket |
| `npm run test:assets`                                                                                                                                     | 145 file trace; parser terisolasi, normalisasi gambar dan penghapusan EXIF lulus                                                                         |
| `npm run skills:verify`, `npm run templates:verify`                                                                                                       | Enam pack dan 43 template lulus                                                                                                                          |
| `npm audit --omit=dev --audit-level=high`                                                                                                                 | Nol kerentanan                                                                                                                                           |
| `npm run security:scan`, `git diff --check`                                                                                                               | Lulus; 385 file source/config/dokumen diperiksa                                                                                                          |

Halaman terms/refund juga diamati melalui browser pada desktop dan ponsel.
Gaya dokumen mengikuti tampilan publik yang ada; lebar teks dibatasi untuk
keterbacaan, daftar memiliki penanda, dan footer dapat membungkus pada ponsel.
Tidak ada perubahan desain utama. HTML dokumen tidak memuat tracker pemasaran;
hasil ini tidak mencakup perilaku domain/provider eksternal.

Kendala lingkungan: listener loopback membutuhkan izin di luar sandbox. Cache
Next development sempat gagal dengan ENOSPC; hanya cache fixture tugas ini yang
dibersihkan. Uji landing berikutnya gagal karena PostgreSQL lokal berhenti,
sehingga halaman paket menampilkan error. Setelah database lokal dipulihkan,
empat skenario browser lulus pada build produksi. Perubahan otomatis Next pada
konfigurasi dipulihkan dari snapshot baseline; perubahan pengguna pada
`next-env.d.ts` dipertahankan dan tidak di-stage.

Full suite integrasi/E2E, migration rehearsal, recovery proses dan image Docker
tidak diulang untuk perubahan ini. Fixture bukan bukti provider nyata atau audit
hukum final. Kontak tanpa akun, identitas, retensi finansial/backup, inventaris
provider dan prosedur refund/privasi nyata masih wajib diaudit sebelum peluncuran.
Produksi belum diperbarui.

## Skill internal dan persiapan agent - 24 Oktober 2026

- Anti-slop core dari `miqdadbadjuber/anti-slop` dipin pada commit
  `671ab15c2ff6913cdd80717f602a89f0a9429a4b`, lisensi MIT. Sumber mentah,
  atribusi/lisensi, adaptasi dan checksum disimpan. Enam pack siap lulus verifikasi;
  wizard dan script upstream tidak dijalankan oleh Bantuin. Superdesign dihapus
  dari katalog web. Total katalog tetap 27, delapan siap dan 19 belum siap.
- Anti-slop juga dipasang dengan Skill Installer bawaan ke direktori skill Codex.
  Byte `SKILL.md` dibandingkan dengan sumber yang dikunci, SHA-256
  `64a1ff70bafbfb7a105083cdff0026a6f09baf7e19d3aa1bc3e880cf7233f90c`;
  lisensi MIT disimpan. Ini membuktikan instalasi lokal, bukan aktivasi di sesi
  agent lain atau instalasi pada mesin pengguna Bantuin.
- Pemilih dan ringkasan nama skill di editor/planner serta pengelolaan skill pada
  UI admin dihapus. Preferensi manual dan snapshot lama tetap disimpan; registry
  dan enforcement server tetap berlaku.
- Paket baru wajib memiliki `SKILLS.md`, sehingga katalog menjadi 43 Markdown
  ditambah satu manifest. AGENTS dan index menempatkan pemasangan/verifikasi
  sebelum perintah proyek. Definisi skill proyek berasal dari snapshot, memiliki
  namespace Buatin dan SHA-256 per berkas; tidak menimpa skill berbeda atau
  mengunduh/menjalankan installer upstream. Status instalasi target tetap belum
  diverifikasi sampai agent target membuktikannya.

Verifikasi memakai Node.js 24.22.0, production build terpisah pada
`.local/antislop-fixture/next`, database PostgreSQL loopback baru khusus fixture,
storage privat terpisah dan mock loopback. Wrapper `.local/antislop-fixture/run.mjs`
menetapkan environment fixture tanpa mencetak kredensial; perintah integrasi dan
browser berikut dijalankan melalui wrapper tersebut. Dua belas migration yang
sudah ada diterapkan pada database fixture; tidak ada migration baru.

| Perintah                                                                                                                                                | Hasil aktual                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `node --import tsx node_modules/vitest/vitest.mjs run tests/unit/customization.test.ts tests/unit/domain.test.ts tests/unit/template-variables.test.ts` | Baseline sebelum edit: 43 test / tiga file lulus                                                                              |
| `npm test`                                                                                                                                              | 156 test / 22 file lulus, termasuk setup skill sembilan tipe website, checksum definisi dan penolakan Superdesign             |
| `npm run format:check`, `npm run lint`, `npm run typecheck`                                                                                             | Lulus                                                                                                                         |
| `npm run skills:verify`, `npm run templates:verify`                                                                                                     | Enam pack ditinjau dan 43 template lulus                                                                                      |
| `npm run build:worker`, `npm run build`                                                                                                                 | Build worker dan production web lulus; build web diulang di luar sandbox setelah Turbopack sandbox tidak bergerak             |
| `node_modules/vitest/vitest.mjs run tests/integration/workflow.test.ts tests/integration/customization.test.ts --maxWorkers=1`                          | 14 test / dua file lulus; termasuk 43 dokumen plus tepat satu manifest dalam ZIP, persistence, ownership, revisi dan snapshot |
| `node_modules/@playwright/test/cli.js test tests/e2e/customization.spec.ts`                                                                             | Dua skenario desktop/mobile lulus dalam mode worker, lalu dua skenario yang sama lulus dalam mode request tanpa worker        |
| `node_modules/vitest/vitest.mjs run tests/request --maxWorkers=1`                                                                                       | Enam test lulus pada production build mode request; continuation, lease, kuota, parser dan ZIP                                |
| `scripts/check-hosted-assets.mjs`                                                                                                                       | 145 file trace; parser terisolasi, normalisasi gambar dan penghapusan EXIF lulus                                              |
| `npm audit --omit=dev --audit-level=high`                                                                                                               | Nol kerentanan; akses registry diulang dengan izin jaringan setelah DNS sandbox gagal                                         |
| `npm run security:scan`, `git diff --check`                                                                                                             | Lulus; 375 file source/config/dokumen diperiksa sebelum penambahan catatan ini                                                |

Browser membuktikan daftar/ringkasan skill tidak terlihat pada editor dan planner,
pilihan warna/font tetap tersimpan, layout mobile tidak overflow, serta API hasil
memuat `SKILLS.md` dengan Anti-slop dan status belum diverifikasi. Output semua
sembilan tipe diperiksa terhadap tautan internal dan checksum definisi. Build
tidak membuktikan integrasi provider nyata. Full suite integrasi/E2E, rehearsal
migration, recovery proses dan image Docker tidak diulang lokal untuk perubahan
ini; tetap menjadi gate CI. Produksi belum diperbarui dalam verifikasi lokal.
Perubahan `next-env.d.ts` milik pengguna dipertahankan persis dari baseline;
perubahan konfigurasi Next akibat build fixture dipulihkan dan tidak di-stage.

## Audit domain dan aktivasi Google - 23 Oktober 2026

Laporan rinci: `PRODUCTION_AUDIT_2026-10-23_DOMAIN_AUTH.md`. Audit dimulai dari
source `45f64eb` dan production `fd240bb`. Pembayaran nyata tetap ditunda.
Tidak ada migration baru, fixture produksi, pembelian hosting atau bypass guard.

### Bukti domain dan konfigurasi cloud

- HTTPS `bantuin.ai.id` dan www valid. Root, login, privacy, terms, liveness dan
  readiness HTTP 200. HTTP root redirect 308 ke HTTPS. CSP, HSTS, nosniff dan
  frame denial tersedia. Canonical/og:url/sitemap/robots pada deployment lama
  ternyata masih menunjuk `https://buatin.vercel.app`.
- Production Vercel `APP_URL` dan `BETTER_AUTH_URL` diperbarui ke
  `https://bantuin.ai.id`, respons 200. www diset redirect 308 ke apex, respons 200. GitHub variable `PRODUCTION_URL` diperbarui ke origin yang sama, respons 204. Efek env baru harus dibuktikan setelah deployment baru.
- Endpoint anonim project/admin users/settings/download/cron 401; processing GET
  dan pricing POST 405; OPTIONS 204; suffix asing 404. Cron bersecret tidak
  dipanggil untuk audit karena menjalankan penghapusan retensi nyata.
- `/api/site` 200 dengan supportEmail kosong. `/privacy` masih menyebut penyiapan
  lokal. Source mengonfirmasi email hanya dikirim worker dan retensi request belum
  mencakup seluruh janji kebijakan; keduanya dicatat sebagai temuan terbuka.
- GitHub Environment production semula tanpa pembatasan branch. Policy diubah
  menjadi protected_branches true/custom_branch_policies false; GET baru
  mengonfirmasi rule branch_policy aktif. Proteksi main tetap wajib dipertahankan.

### Provider Google dan Turnstile

- Operator masuk ke akun pemilik Google Cloud, menyetujui pembuatan branding dan
  OAuth web client pada `bantuin-512507`. Client `Buatin production web` memakai
  origin `https://bantuin.ai.id` dan callback
  `https://bantuin.ai.id/api/auth/callback/google`. Client ID/Secret disimpan
  sebagai sensitive environment Production Vercel; metadata diverifikasi.
- Branding homepage, privacy, terms dan authorized domain disimpan; UI menunjukkan
  Branding changes saved. Sesudah persetujuan publikasi, Audience menunjukkan
  **In production**, External. Tidak ada akses Gmail/Drive yang diminta.
- Operator membuat dan login akun Cloudflare langsung. Widget `Buatin production`
  dibuat setelah persetujuan Create: Managed, satu hostname domain final,
  pre-clearance nonaktif. Daftar widget mengonfirmasi konfigurasi tersebut.
- Site Key dan Secret Key disimpan sensitive pada Production Vercel; metadata
  dibaca ulang. Kedua transfer browser-ke-host memakai RSA-OAEP SHA-256; ciphertext
  dan pasangan key sementara dihapus sesudah storage sukses. Nilai tidak dicetak
  atau dimasukkan ke repository. DNS tidak dipindahkan.
- Konfigurasi provider tersimpan belum membuktikan Google callback/sesi nyata;
  hasil runtime setelah deployment dicatat terpisah. Owner/admin dan akun MFA
  tetap tidak menggunakan social login untuk menghindari bypass TOTP aplikasi.

### Reproduksi, regression dan build

- Baseline `npm test`: 144 test/21 file lulus. Regression HEAD callback mereproduksi
  respons 302 ketika seharusnya 405; regression domain/private boundary juga gagal
  sebelum perbaikan. HEAD kini 405 dan OPTIONS 204 tanpa memanggil callback.
- `npm test` sesudah perubahan: **145 test/21 file lulus** dengan default mode
  worker fixture. Percobaan unit pada env request tidak cocok dengan empat
  asumsi worker suite; pengulangan memakai mode yang tepat lulus.
- `npm run lint` dan `npm run typecheck`: lulus. `npm run build` dengan dist
  terpisah serta `npm run build:worker`: lulus, tanpa koneksi DB produksi.
- Google OAuth + route contracts: **9 integration test/2 file lulus**, termasuk
  state/PKCE, issuer/audience/expiry, email verified, linking, replay, suspend,
  role/MFA, signup pause, RLS fixture, serta HEAD/OPTIONS yang tidak mengubah
  verification/cookie. Diulang pada build produksi: sembilan lulus.
- `npm run test:request`: **6 test lulus** pada dev fixture, kemudian enam lulus
  pada build produksi tanpa worker. Google browser: **3 test lulus**, termasuk
  keyboard/mobile/error/retry/redirect domain palsu; diulang pada build produksi,
  tiga lulus.
- Percobaan request dan full integration di sandbox ditolak EPERM untuk socket
  loopback sebelum test berjalan (enam/59 skipped). Request diulang dengan akses
  loopback dan lulus. Full suite worker belum diulang lokal pada profil ini;
  required CI tetap menjalankan suite lengkap dengan worker terisolasi.
- Fixture memakai database baru khusus loopback dengan 12 migration, mock dan
  kredensial provider palsu. Konfigurasi Next yang dihasilkan fixture dipulihkan
  dari snapshot; perubahan next-env milik pengguna dipertahankan dan tidak di-stage.
- `npm audit --omit=dev --audit-level=high`: nol kerentanan. `security:history`:
  644 objek, dua kecocokan legacy revoked, nol belum ditinjau. `skills:verify`:
  lima pack lulus, tanpa eksekusi upstream. `templates:verify`: 42 lulus.
- `npm run test:assets`: 145 file trace, parser terisolasi dan penghapusan EXIF
  lulus. Format seluruh repository, typecheck setelah pemulihan konfigurasi Next,
  `git diff --check` serta secret scan 369 file lulus.
- Perubahan paket dari pekerjaan lain ditinjau setelah izin pengguna: commit
  `6a441f7` menambahkan `@vercel/analytics` 2.0.1 (MIT) dan
  `@vercel/speed-insights` 2.0.0 (Apache-2.0), keduanya terkunci di lockfile.
  Commit dan perubahan tersebut dipertahankan. Instalasi paket sendiri belum
  membuktikan pengumpulan metrik pada domain produksi.
- Commit aplikasi `c37a9272abe25040a7a4a0c1607ee183692a8ae2` telah didorong
  ke `codex/admin-management`. Native validation run `39928432150`, job
  `120330456977`, completed/success: seluruh tahap termasuk integration, browser,
  recovery, request tanpa worker, backup/restore dan image Docker lulus.
  SHA yang sama dipromosikan fast-forward ke protected main setelah CI sukses.
- Native validation main run `39929811653`, job `120335004012`, juga
  completed/success untuk SHA yang sama. Workflow `Deploy verified production`
  run `39931002408` dipicu otomatis sesudah validasi tersebut.
- Deploy run `39931002408`, job `120338970856`, completed/success. Deployment
  `dpl_BLBo6PhfoN7BoMG2RyKttAtbf7ED` Ready/Production, gitSource main dan
  validatedCommit cocok dengan `c37a927`, validationRun `39929811653`.
  `npm run deploy:smoke -- https://bantuin.ai.id --scope=operations`: **19/19
  lulus**, scopeReady true/publicLaunchAccepted false. Kontrak callback HEAD 405
  dan endpoint privat anonim 401 teramati pada deployment tersebut.
- HTTP root/www redirect 308 ke HTTPS apex; canonical, Open Graph, sitemap dan
  robots memakai domain final. Public config menunjukkan googleReady true,
  mock false, processingMode request, generationMode template dan
  registrationReady false. Readiness 200 tidak membuktikan pengiriman email.
- Browser produksi sempat menerima challenge error `600010`. Operator kemudian
  menyelesaikan verifikasi langsung; widget Success dan redirect Google nyata
  teramati. Sesudah persetujuan identitas dasar, dashboard menampilkan satu akun
  biasa role user. Reload tetap membuka workspace, paket dan kuota termuat.
  Pembacaan admin users dengan sesi itu ditolak FORBIDDEN. Tidak ada bypass MFA,
  key pengujian atau fixture pada produksi. Matriks cloud dua akun belum diuji.
- Screenshot operator juga mereproduksi pesan error widget yang tetap muncul
  setelah Success. Regresi browser baru semula gagal tepat pada ekspektasi pesan
  harus hilang; callback sukses kemudian memperbarui failed menjadi false.
  Regresi lulus, termasuk retry dan pemblokiran token kosong/kedaluwarsa. Satu
  percobaan awal perlu mempersempit locator alert ke main karena Next memiliki
  route announcer sendiri; itu kegagalan locator fixture, bukan provider.
- Setelah perbaikan widget, `npm run lint`, `npm run typecheck`, `npm test`
  (145 test/21 file), build Next.js serta `npm run build:worker` lulus.
  Regresi `tests/e2e/challenge.spec.ts` lulus pada dev fixture desktop/mobile,
  kemudian lulus pada build produksi. Site Key palsu dan intersepsi skrip
  hanya ada di fixture loopback. CI menambahkan regresi pada tahap mode request.
- Percobaan build Next.js dalam sandbox tertahan saat kompilasi tanpa progres;
  dihentikan terarah (143), kemudian build yang sama dengan akses proses/socket
  lokal selesai sukses. Server fixture sudah dihentikan. Config Next yang
  dihasilkan dipulihkan setelah memeriksa tidak ada perubahan lain; next-env
  pengguna tetap dipertahankan.
- `npm audit --omit=dev --audit-level=high`: nol kerentanan setelah perbaikan.
  `npm run security:scan`: 370 file lulus, nilai rahasia tidak dicetak.
  `npm run format:check`, typecheck setelah pemulihan config dan
  `git diff --check` juga lulus.
- Tinjauan lanjutan menemukan `verifyChallenge()` berjalan sebelum database rate
  limit Better Auth. Percobaan yang ditolak challenge tidak mencapai limiter
  tersebut; temuan dicatat sebagai P1-09. Tidak dilakukan burst pada produksi,
  dan tidak ada klaim perlindungan DDoS atau perbaikan limiter telah terbukti.

### Rilis perbaikan pesan widget

- Commit `c051ec67fb28c3e0f078a35826b5b552c42d12cc` dipush ke
  `codex/admin-management`. Native validation `39934260838`, job `120349803971`,
  completed/success, termasuk regresi challenge pada tahap mode request.
- Sebelum promosi, API GitHub mengonfirmasi verify/strict/enforce-admins aktif,
  force push dan deletion nonaktif, serta environment hanya protected branch.
  Main masih `c37a927`; pemeriksaan ancestor dan fetch terbaru berhasil.
  SHA `c051ec6` kemudian dipush fast-forward ke main tanpa bypass proteksi.
- Native validation main `39935608936`, job `120354274203`,
  completed/success untuk SHA `c051ec6`; seluruh tahap termasuk integration,
  E2E, recovery, mode request/challenge, backup fixture dan Docker selesai.
- Deployment otomatis `39936591073`, job `120357523875`, completed/success.
  `dpl_8hG3EBksrZo5Ys83GtFJhWoBSMRk` Ready/Production; gitSource main,
  validatedCommit `c051ec6` dan validationRun `39935608936` cocok.
- `npm run deploy:smoke -- https://bantuin.ai.id --scope=operations`
  sesudah rilis lulus **19/19**. Probe terpisah menunjukkan appOrigin domain
  final, googleReady true, mock false, processingMode request,
  generationMode template dan registrationReady false.
- Sesi Google yang sudah diuji tetap membuka dashboard setelah reload pada
  deployment baru; paket/kuota termuat. Ini tidak mengulang seluruh matriks
  akun baru/lama, recovery email atau perjalanan cloud dua akun.
- Scope operasi tetap publicLaunchAccepted false. Bukti Google nyata tidak
  menutup temuan email, retensi, operator, backup dan alarm pada audit. Catatan
  susulan ini hanya memperbarui bukti; commit runtime yang dirilis `c051ec6`.

## Profil request Vercel + Supabase - 23 Oktober 2026

Bagian ini menggantikan kebutuhan worker pada catatan anggaran/deployment lama.
Tidak ada migration baru atau fixture yang dijalankan pada database produksi.

### Hasil cloud akhir

- Implementasi `fd240bbcca98f76e43abf82e95e67acadd152101` didorong ke
  `codex/admin-management`. Required `verify` sukses pada run `39908519789`;
  seluruh tahap, termasuk browser, mode request dan Docker, selesai tanpa failure.
  Sesudah sukses, push fast-forward SHA yang sama ke `main` berhasil.
- Proteksi main diperiksa kembali sebelum deploy: verify wajib, strict,
  enforce-admins aktif, force push dan deletion nonaktif.
- Deployment Vercel `dpl_3yrGjjYjkcBSqBst2VcoJBtAXiaK` Ready/Production;
  gitSource main/SHA dan metadata validatedCommit cocok dengan SHA terverifikasi.
  Team tetap memakai paket Hobby. Tidak ada worker berbayar yang dibuat.
- `npm run deploy:smoke -- https://buatin-kappa.vercel.app --scope=operations`:
  **14/14 lulus**, `scopeReady:true`, `publicLaunchAccepted:false`.
  Readiness HTTP 200; private projects 401; suffix 404; metode 405; OPTIONS 204.
- Probe terpisah: public-config 200, mock false, processingMode request,
  generationMode template, registrationReady false dan googleReady false.
  Cron tanpa secret 401, HEAD cron 405/body kosong; POST processing anonim 401,
  HEAD processing 405/body kosong, suffix processing asing 404.
  Cron bersecret tidak dipanggil secara manual karena menjalankan retensi nyata.
- Agregat Supabase read-only: 12 migration selesai, satu bucket referensi privat,
  satu owner aktif. Dua akun privileged belum MFA, dua credential account belum
  memiliki password; aktivasi/recovery login tidak dilakukan dalam scope ini.
  Tidak ada heartbeat worker atau receipt backup/off-host. Mode request tidak
  membutuhkan heartbeat; ketiadaan receipt backup tetap gap operasi.
- Monitoring HTTP GitHub diaktifkan melalui MONITOR_ENABLED dan PRODUCTION_URL;
  run manual dikirim sesudah smoke sukses. Repository publik, tanpa upgrade
  hosting atau penyimpanan secret tambahan. Run `39910384926` completed/success
  untuk SHA `fd240bb`; delivery alert gangguan belum diuji.
- Deployment ini dijalankan manual melalui API resmi Vercel memakai CLI login
  operator. Automatic Git deployment main tetap nonaktif.

### Koneksi deployment otomatis

- Pengguna mengizinkan token khusus proyek Buatin selama 90 hari, disimpan
  terenkripsi pada GitHub Environment `production`. Token CLI akun tidak disalin.
- Permintaan resmi Vercel dengan `projectId` dan expiry 90 hari semula ditolak
  HTTP 403: `Cannot create tokens for this app.`. Token kemudian dibuat melalui
  dashboard setelah konfirmasi akhir dan verifikasi email oleh operator. Scope
  dipilih pada proyek `buatin`, bukan All Projects/Full Account.
- `VERCEL_TOKEN`, `VERCEL_TEAM_ID` dan `VERCEL_PROJECT_ID` disimpan menggunakan
  GitHub Environment Secrets API dengan public key dan SealedBox. Akses token
  ke project ID tujuan serta scope tim/expiry diperiksa; berakhir tepat
  `2027-01-21T07:14:13.440Z`. Token CLI tidak disalin; nilai token tidak dicetak.
  Transfer sementara dienkripsi RSA-OAEP SHA-256, diuji dengan fixture, kemudian
  ciphertext dan pasangan key sementara dihapus setelah penyimpanan sukses.
- Run deploy `39910789451` awalnya gagal pada step `Deploy the validated commit`. Log
  mengonfirmasi `VERCEL_TOKEN must be configured in the protected production environment.`.
  Required Native validation pada main `fd240bb` tetap sukses
  (run `39910003059`); CI branch dokumentasi `af36c05` sukses (`39910651700`).
- Setelah secret tersimpan, main masih pada SHA `fd240bb`; required verify dan
  proteksi strict/enforce-admins/no-force/no-delete diperiksa sebelum menjalankan
  ulang job gagal. Attempt kedua menghasilkan job `120292987716`, completed/success,
  selesai `2026-10-23T07:22:31Z` menurut GitHub API.
- Workflow membuat deployment `dpl_7K3e2RMfokDTevESByqgMKN2CRjm`, Ready/Production.
  GitSource main SHA `fd240bbcca98f76e43abf82e95e67acadd152101`, metadata
  validatedCommit dan validationRun `39910003059` cocok dengan CI sukses.
  Log job membuktikan deployment Ready serta smoke `scopeReady:true`,
  `publicLaunchAccepted:false`; check-run deploy juga success. Respons status
  antrean sempat tertinggal; request baru dan log job mengonfirmasi penyelesaian.
- Pemeriksaan ulang dari operator dengan `npm run deploy:smoke -- https://buatin-kappa.vercel.app --scope=operations`
  pada deployment baru lulus 14/14, readiness 200, private projects 401.
- CI commit dokumentasi `638770b` juga completed/success (`39916167677`).
  Perubahan setelahnya hanya catatan bukti dan panduan rotasi, tanpa perubahan
  aplikasi atau migration; suite aplikasi tidak diulang untuk dokumentasi.
- Dokumentasi akhir: `npm run format:check`, `npm run security:scan` (368 file)
  dan `git diff --check` lulus. Anotasi deploy mencatat actions/checkout@v4 dan
  setup-node@v4 menargetkan Node 20 tetapi dipaksa runner memakai Node 24,
  serta pemberitahuan migrasi ubuntu-latest ke Ubuntu 26. Job tetap sukses;
  pembaruan versi action/runner memerlukan validasi CI tersendiri.

### Bukti fixture dan build

- `npm test`: 144 test, 21 file lulus.
- `npm run lint` dan `npm run typecheck`: lulus.
- `npm run test:request`: enam test lulus pada dev fixture loopback tanpa worker,
  mencakup ownership/Origin/metode, checkpoint/recovery, quota/cancellation,
  parser privat, penolakan PDF serta cron/retensi.
- Journey workspace desktop dan mobile: dua test lulus. Test kini menunggu
  seluruh dokumen selesai sebelum membuka hasil; link partial sebelumnya dapat
  muncul saat slice pertama selesai dan menyebabkan race pada test.
- Regression kegagalan enam file pertama berhasil direproduksi: slice mengulang
  checkpoint gagal tanpa maju. Mode slice kini melewati checkpoint gagal sampai
  explicit resume meresetnya; test partial sampai selesai lulus.
- `npm run test:migrations`: rehearsal database baru lulus; dua pembayaran
  historis dan manfaat asli dipertahankan.
- `npm audit --omit=dev --audit-level=high`: nol kerentanan.
- `npm run security:scan`: 367 file lulus. `security:history`: 588 objek ditinjau,
  dua kecocokan legacy revoked, nol kecocokan belum ditinjau.
- `skills:verify`: lima pack ditinjau lulus, tanpa eksekusi upstream.
  `templates:verify`: 42 template lulus.
- Supabase Storage nyata, pemeriksaan read-only memakai server key: autentikasi
  berhasil, bucket sesuai dan privat, limit 20 MiB, MIME application/octet-stream.
  Ini belum membuktikan upload/download melalui fungsi Vercel.
- Login Vercel CLI berhasil setelah pengguna menyelesaikan verifikasi akun.
  Environment Production untuk mode request, adapter storage Supabase, URL/bucket,
  key server dan secret cron disimpan; nilai secret tidak dicetak atau di-commit.
- Instalasi bersih `npm ci --include=dev --no-audit` berhasil. Build pertama
  mereproduksi kegagalan bundling `child_process.fork` oleh Turbopack; perubahan
  path saja tetap gagal. Parser kini diluncurkan lewat builtin Node runtime dan
  disertakan secara eksplisit pada tracing. Hasil build ulang dicatat berikutnya.

- Build hosted final dan build worker: lulus pada salinan source dengan instalasi
  bersih sebelumnya. Percobaan instalasi salinan kedua gagal `ENOSPC`; salinan
  belum lengkap dihapus, build diulang pada salinan bersih pertama. Tidak ada
  artefak pengguna yang dibersihkan.
- `npm run test:assets`: lulus, 145 file trace disalin terisolasi; parser JPEG
  menghasilkan WebP tanpa EXIF. Tracing mencakup sharp, @img, detect-libc, semver,
  yauzl, pend dan buffer-crc32. Ini membuktikan paket parser lokal, bukan upload
  melalui fungsi Vercel yang sudah live.
- `npm run test:integration`: 58 test, sembilan file lulus pada production fixture.
- `npm run test:e2e`: 18/19 lulus pada run pertama; satu failure bersamaan dengan
  `ENOSPC` dari Playwright. Setelah cache fixture milik tugas dibersihkan, test
  Max private template/batch diulang tanpa perubahan aplikasi dan lulus.
- `npm run test:recovery`: SIGKILL, lease expiry, worker baru, resume 42/42 dan
  checkpoint lama tetap utuh: lulus.
- `npm run test:backup`: backup terenkripsi dan restore ke database baru lulus;
  dua blob diperiksa, lampiran fixture identik. Key fixture yang sudah ada
  dipertahankan; `backup:key` menolak menimpanya dengan EEXIST.
- Enam test request diulang pada build produksi final tanpa worker: lulus.
  Journey workspace desktop/mobile build final: dua test lulus (13,3 detik).
  Lint akhir lulus. Secret scan akhir mencakup 368 file dan lulus.

Login publik, enrollment MFA dan payment tetap ditunda. Mock tidak membuktikan
provider nyata atau kapasitas. Backup/restore lokal bukan bukti off-host produksi.
Alur privat upload/generasi melalui akun cloud belum diuji; fixture tidak membuat
akun produksi atau melewati proteksi untuk menutup gap tersebut.

## Batas anggaran hosting awal - 23 Oktober 2026

- Pengguna menolak paket Render US$25/bulan dan meminta gratis pada tahap awal.
  Worker Render belum dibuat; tidak ada pembelian atau provisioning berbayar.
- Dokumentasi resmi Render, Oracle Always Free/FAQ dan Vercel Terms diperiksa.
  Render tidak menyediakan worker gratis. Oracle menjadi kandidat VM persisten,
  dengan batas kapasitas/idle reclamation serta verifikasi kartu. Akun dan image
  ARM belum diuji; tidak ada klaim alternatif gratis sudah berjalan.
- Permintaan informasi ketersediaan akun Oracle/kebutuhan tanpa kartu dikirim.
  Tidak ada perubahan aplikasi, database, kredensial atau deployment dalam
  pembaruan anggaran ini. Rincian dan sumber: `PRODUCTION_AUDIT_2026-10-23.md`.
- Prettier kedua laporan, `git diff --check` dan secret scan 358 file lulus.
  Pengujian aplikasi tidak diulang untuk perubahan laporan saja.

## Aktivasi mode produksi dan redeploy - 23 Oktober 2026

Bagian ini menggantikan status konfigurasi/consent pada catatan sebelumnya.
Tidak ada perubahan kode aplikasi atau skema database dalam verifikasi ini.

- Pengguna menyetujui `MOCK_LLM=false` dan redeploy secara eksplisit.
  Formulir Vercel menyimpan nilai `false`; daftar environment kemudian
  menampilkan `MOCK_LLM` bertipe Config dengan cakupan Production.
- Required check `verify` untuk SHA `e3fa6414052746089f3af53a4ff18953c0e41646`
  teramati completed/success sebelum push fast-forward `HEAD:main` berhasil.
  Dashboard memvalidasi sumber main pada SHA yang sama sebelum deployment dibuat.
- Deployment `Ags1WizPkdbQ8SvfZC5rdg3P5cgm` teramati Ready/Production,
  sumber `main`/`e3fa641`, domain `buatin-kappa.vercel.app`, durasi build 1m 1s.
- `npm run deploy:smoke -- https://buatin-kappa.vercel.app --scope=operations`:
  13 dari 14 pemeriksaan HTTP lulus. Pricing/session/public-config 200,
  projects anonim 401, suffix asing 404, metode salah 405 dan OPTIONS 204
  dengan Allow sesuai. Readiness masih 503; gate keseluruhan gagal.
- Pembacaan public config terpisah: HTTP 200, `mock:false`. Readiness terpisah:
  HTTP 503 dengan `ok:false`. Tidak ada klaim provider AI nyata sudah diuji.
- Query agregat Supabase terbaru: 12 migration selesai, satu bucket privat,
  heartbeat worker/receipt backup aplikasi/receipt off-host belum tersedia.
  Tidak ada perubahan data produksi pada query ini.
- Akun Render sudah terautentikasi; consent identitas/email telah disetujui
  pengguna. Formulir worker disiapkan dari repository publik tanpa memberikan
  akses repository GitHub tambahan: nama `buatin-worker`, branch main, Dockerfile
  `deploy/worker.Dockerfile`, Singapore, 1 CPU/2 GB RAM, US$25/bulan.
  Konfigurasi nonrahasia ditambahkan ke formulir. Service belum dibuat;
  persetujuan biaya berulang dan pengisian secret langsung di dashboard diminta.
- Deploy otomatis GitHub masih memerlukan secret deployment Vercel. Storage
  bersama, scanner cloud, backup/off-host restore dan monitoring masih terbuka.
  Login publik/MFA enrollment dan payment tetap ditunda sesuai arahan pengguna.
- Pemeriksaan laporan: Prettier kedua Markdown, `npm run security:scan`
  (358 file) dan `git diff --check` lulus. Tidak ada perubahan perilaku aplikasi;
  suite aplikasi tidak diulang untuk pembaruan laporan ini.

## Verifikasi setelah pembaruan kredensial hosting - 23 Oktober 2026

Bagian ini memperbarui status cloud pada bagian terdahulu; tidak ada perubahan
kode aplikasi atau skema database dalam verifikasi ini.

- Native validation `main` untuk `d70a600` selesai sukses, run `39894504574`,
  termasuk gate Docker worker. Deploy workflow run `39895276441` gagal;
  nama secret deployment Vercel masih tidak tersedia pada repository maupun
  environment GitHub `production`.
- Dashboard Vercel menunjukkan `DATABASE_URL` dan `DATABASE_WORKER_URL`
  diperbarui pengguna. Redeploy `a251218`, ID
  `7eo1XgyaUGmpGqZs2N5KCjgE9XNb`, Ready/Production. Smoke nyata sesudahnya:
  pricing 200, session 200; ini membuktikan pemulihan koneksi pada build tersebut.
- Sesudah memeriksa SHA `main` dan required check `verify` sukses, deployment
  produksi `d70a600` dibuat melalui dashboard. ID
  `AYgzMZsHJsgnWAFvEn3L3PEPNQLk` teramati Ready/Production dengan domain
  `buatin-kappa.vercel.app`.
- `npm run deploy:smoke -- https://buatin-kappa.vercel.app --scope=operations`
  setelah deployment baru: HEAD/GET liveness 200, suffix publik/account asing
  404, POST pricing 405, OPTIONS pricing 204 dengan Allow benar. Gate keseluruhan
  gagal: readiness/pricing/session/public-config/private projects mendapat 503.
  Respons publik `SERVICE_UNCONFIGURED`; log dashboard deployment terbaru
  `runtime.configuration.invalid` menyebut hanya `MOCK_LLM`.
- Penyimpanan `MOCK_LLM=false` belum dilakukan. Pemeriksaan persetujuan otomatis
  menolak karena belum ada konfirmasi spesifik pengaturan dan provider nyata
  belum diverifikasi. Permintaan konfirmasi dikirim; tidak ada jalur lain yang
  dipakai untuk menyimpan konfigurasi tersebut.
- Query agregat Supabase: 12 migration selesai, satu bucket privat, heartbeat
  worker/receipt backup aplikasi/receipt off-host belum ada. Tidak ada migrasi,
  perubahan akun atau data produksi pada pemeriksaan ini.
- Integrasi Vercel/Render terdeteksi belum terpasang. Login Render melalui
  GitHub mencapai halaman consent identitas/email read; pemberian akses baru
  ditahan sampai konfirmasi pengguna. Worker/scan/storage/backup cloud belum
  terbukti berfungsi.

## Penyelesaian operasional dan proteksi main - 23 Oktober 2026

Bagian ini menggantikan angka/status terdahulu yang berubah. Login/provider auth,
enrollment MFA dan payment gateway ditunda atas permintaan pengguna; keamanan
route, ownership dan MFA yang sudah aktif tidak dinonaktifkan.

- `npm test`: 138 tes dalam 19 file lulus.
- Pemeriksaan akhir `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm run security:scan` dan `git diff --check` lulus.
- `npm run test:integration`: 57 tes dalam 9 file lulus sebelum penambahan satu
  regresi isolasi scanner. Setelah penambahan, file `customization.test.ts`
  dijalankan ulang: 5/5 lulus. Suite penuh terbaru menunggu CI.
- `npm run test:e2e`: 19 tes Chromium desktop/mobile lulus.
- `npm run test:migrations`: upgrade mempertahankan invoice/manfaat/ledger.
- `npm run build:hosted` dan `npm run build:worker` lulus. Instalasi/build bersih
  terakhir: `/private/tmp/buatin-production-build-1792724401010`, memakai
  `npm ci --include=dev --no-audit` lalu `npm run build:hosted`, tanpa `.env` atau
  cache workspace. Kehabisan disk pada percobaan sebelumnya selesai setelah
  menghapus hanya snapshot build sementara milik pengujian ini.
- `npm run test:recovery`: SIGKILL, lease 31 detik, worker baru, resume 42/42,
  checkpoint tetap. Ini fixture; bukan bukti failover host cloud.
- `npm run db:backup` dan `npm run test:backup`: backup terenkripsi, restore
  database UUID baru, dua file dan checksum lampiran lulus. Download S3 memakai
  mock; backup/restore off-host sesungguhnya belum diuji.
- `npm audit --omit=dev --audit-level=high`: nol vulnerability. `tsx` kini runtime
  dependency agar bootstrap worker tetap tersedia setelah pruning.
- Secret scan 358 file lulus; history scan 548 blob, dua kecocokan legacy yang
  dicabut, nol temuan belum ditinjau. Lima skill pack/42 template terverifikasi.
- HTTP build fixture: 13 kontrak route lulus. Public config sengaja menggagalkan
  gate produksi karena `mock:true`; hasil ini tidak menyatakan produksi siap.
- Proteksi GitHub `main` diterapkan dan dibaca ulang melalui API: `verify` dari
  GitHub Actions app 15368 wajib, strict/up-to-date, admin ikut aturan,
  force push dan penghapusan branch dilarang. PUT/GET berhasil HTTP 200.

Docker daemon lokal tidak tersedia; image ClamAV/PostgreSQL 17 harus dibangun
dan diuji oleh step CI sebelum commit diterima ke `main`. Belum ada bukti
signature update, EICAR atau readiness scanner pada Render.

Cloud terakhir: 12 migration Supabase selesai dan bucket privat tersedia;
heartbeat worker/receipt backup aplikasi belum ada. Produksi masih pricing/session
500, readiness 503, kontrak route lama dan `mock:true`. Repository/environment
GitHub produksi belum memiliki secret deployment Vercel. Persetujuan menghubungkan
Vercel/Render sudah ada; koneksi akun yang dapat digunakan belum tersedia.
Dashboard log Vercel kemudian berhasil dibaca: Prisma `P1000` /
`AuthenticationFailed` pada query RateLimit/Setting membuktikan kredensial
PostgreSQL ditolak. Password database yang benar belum tersedia; publishable key
bukan kredensial PostgreSQL. Perubahan environment hosting masih diperlukan. Lihat
`PRODUCTION_AUDIT_2026-10-23.md` untuk prioritas penutupan.

## Perbaikan audit produksi - 23 Oktober 2026

Bagian ini memperbarui status terdahulu. Lingkungan pengujian: Node 24,
PostgreSQL 17 khusus fixture, web port 3100, worker dan storage/outbox/backup
terpisah. Tidak ada data atau kredensial produksi pada integration/E2E.

| Perintah / pemeriksaan                                                         | Hasil aktual                                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `npm run format:check`, `npm run lint`, `npm run typecheck`                    | Lulus                                                                                                   |
| `npm test`                                                                     | 131 tes, 18 file, lulus                                                                                 |
| `npm run test:integration`                                                     | 57 tes, 9 file, lulus                                                                                   |
| `npm run test:e2e`                                                             | 19 tes Chromium desktop/mobile, lulus                                                                   |
| `npm run test:migrations`                                                      | Upgrade mempertahankan invoice/manfaat/ledger, lulus                                                    |
| `npm run build:hosted`                                                         | Build Next.js dan worker lulus                                                                          |
| Instalasi/build bersih di `/private/tmp/buatin-production-build-1792721293966` | `npm ci --include=dev --no-audit` lalu `npm run build:hosted`, tanpa `.env` atau cache workspace, lulus |
| `npm run test:recovery`                                                        | SIGKILL nyata, lease kedaluwarsa, worker baru, resume 42/42 dokumen; checkpoint tidak berubah           |
| `npm run backup:key`, `npm run db:backup`, `npm run test:backup`               | Backup terenkripsi, restore database baru dan checksum lampiran lulus                                   |
| `npm audit --omit=dev --audit-level=high`                                      | Nol vulnerability dilaporkan                                                                            |
| `npm run security:scan`                                                        | 347 file source/config/docs, lulus; nilai secret tidak dicetak                                          |
| `npm run security:history`                                                     | 468 blob ditinjau sebelum commit; 2 kecocokan legacy yang dicabut, nol temuan belum ditinjau            |
| `npm run skills:verify`, `npm run templates:verify`                            | 5 skill pack ditinjau, 42 template lulus                                                                |
| HTTP metadata build lokal                                                      | Canonical/Open Graph empat halaman publik, sitemap empat URL, robots dan login noindex lulus            |

Regresi yang ditemukan selama verifikasi: batas template 32.000 byte memblokir
ekspor seluruh katalog; refund pembatalan menganggap nol request AI berarti belum
ada hasil; gate worker sempat memblokir penyimpanan draft; restore dump schema
aplikasi berbenturan dengan schema public bawaan. Semuanya diperbaiki dan
diverifikasi. Restore membersihkan objek hanya dalam database UUID baru yang
dibuat script, tidak menimpa sumber. Ekspektasi tes lama tentang mock AI diganti
dengan pemeriksaan dokumen template sebenarnya; cakupan kegagalan worker,
partial checkpoint, pembatalan dan ownership tetap diuji.

Tindakan cloud terbatas yang diminta pengguna: tiga credential lama yang
terekspos dicabut, sesi terkait dicabut, owner dipulihkan dengan password acak
privat dan MFA dipertahankan; bucket Supabase privat `buatin-references` dibuat.
Recovery tidak mempromosikan akun dan tidak mengaktifkan MFA tanpa operator.
Tidak ada password, hash, email akun nyata, atau token pemulihan dalam Git.

Query agregat Supabase terakhir: 12 migration selesai, satu owner aktif, dua
operator belum MFA, dua credential account tanpa password, satu bucket privat,
tidak ada heartbeat worker segar atau receipt backup aplikasi/luar host.
Tidak adanya receipt aplikasi tidak menyimpulkan status backup managed Supabase.

HTTP deployment aktif sebelum push: pricing 500, auth session 500, readiness
503, liveness 200; mode mock aktif, signup dan Google belum siap. Detail log
runtime Vercel dan environment hosting belum dapat diakses dari sesi ini;
akar error DB/auth belum dibuktikan. Guard konfigurasi/error aman, pipeline
deploy dan smoke sudah disiapkan di kode, belum menjadi bukti runtime pulih.

Gate terbuka: koneksi runtime Vercel, worker persisten/scanner, Google/Resend/
Turnstile, MFA operator, secret/environment GitHub produksi serta branch rules,
S3 web/worker, backup luar host dan restore cloud. Pembayaran nyata, inference
9router, load/soak, Safari/Firefox dan CWV produksi belum diuji. Rilis publik
atau pembayaran belum diterima. Runbook: `docs/PRODUCTION_RELEASE.md`.

CI push pertama (`52f6c43`) berhenti pada secret scan: URL database fixture yang
dipublikasikan workflow cocok dengan variable runtime CI. Pengecualian kini
dibatasi pada password disposable CI yang diketahui dan host loopback; bukan
pengecualian semua database lokal. Dua regresi subprocess membuktikan fixture
diterima dan credential lokal acak tetap ditolak tanpa mencetak nilainya.
Format, lint, typecheck, 131 unit, source scan dan history scan diulang lulus.

## Database dan perbaikan build Vercel - 21 Oktober 2026

Screenshot pengguna menunjukkan deployment Vercel project `buatin`, team
`rakannaufals-projects`, dari branch `main` commit `2adb968`. Commit itu belum
memuat implementasi admin dan konfigurasi hosted pada `codex/admin-management`.
Push berikutnya harus memperbarui `main` secara fast-forward, bukan sekadar
redeploy commit lama. Provider worker pengganti ditunda sesuai arahan pengguna.

Reproduksi pada instalasi `npm ci --include=dev` tanpa Prisma Client menghasilkan
TS2305 (`PrismaClient`/`Prisma` tidak diekspor) dan TS18046 yang sama dengan
screenshot pada `workflow.test.ts` baris 458/461. Reproduksi akhir dijalankan di
`/private/tmp/buatin-vercel-build-0xkaygjp/source`, terpisah dari node_modules
workspace. Percobaan build yang masih berada di bawah `.local` mendeteksi parent
workspace/client dan tidak dipakai sebagai bukti reproduksi bersih.

`npm run build` sekarang menghasilkan Prisma Client sebelum Next.js. Jalur hosted
memanggil build tersebut, lalu kompilasi worker. Typecheck tetap ketat, semua test
tetap diperiksa; tidak ada migration, pembuatan owner atau akses Supabase saat
build. Salinan candidate menggunakan lockfile identik dan instalasi bersih yang
sudah selesai, tanpa `.env` sumber atau client hasil development. Satu percobaan
instalasi tambahan terhenti ENOSPC; hanya artefak test yang dibuat tugas ini
dibersihkan sebelum pemeriksaan berhasil dilanjutkan.

| Pemeriksaan                                  | Hasil aktual                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run build:hosted` pada candidate bersih | Lulus: Prisma Client 7.10.1, Next.js 16.4.2 termasuk TypeScript/prerender, dan build worker                      |
| `npm run lint`                               | Lulus tanpa warning                                                                                              |
| `npm run typecheck`                          | Lulus                                                                                                            |
| `npm test`                                   | 70 tes unit, 11 file, lulus                                                                                      |
| `npm audit --audit-level=high`               | 0 vulnerabilities, termasuk dependency development                                                               |
| `npm run format:check`                       | Semua file cocok dengan Prettier                                                                                 |
| `npm run security:scan`                      | Lulus; 316 file source/config/dokumen diperiksa tanpa mencetak secret                                            |
| `git diff --check`                           | Lulus                                                                                                            |
| Smoke server hasil build                     | `/api/health/live` HTTP 200; `/api/health/ready` HTTP 503 saat DB fixture sengaja tidak tersedia                 |
| Verifikasi ulang Supabase                    | 46 tabel public, 13 tabel queue; metadata dan checksum 12 migration tetap cocok                                  |
| Izin schema/fungsi cloud                     | Nol EXECUTE fungsi queue untuk anon/authenticated; tanpa USAGE/CREATE pgboss atau CREATE public untuk kedua role |

`supabase db advisors --linked --project-ref oeznehkxknbgvbtunebu --type security
--level warn --fail-on error --output-format json` selesai dengan exit 0. Hasilnya
enam warning `function_search_path_mutable` pada fungsi pg-boss bawaan, tanpa
temuan error. Warning dicatat, tidak dianggap nol temuan. Schema antrean privat
dan hak browser dicabut; fungsi belum dimodifikasi dari library. Tinjau ulang
saat upgrade library atau pemberian role baru. Hasil read-only cloud tersimpan
privat pada `.local/supabase-bootstrap-20261021/release-security-result.json`.

Build memakai variable fixture dengan database sengaja tidak terjangkau; hasilnya
membuktikan build tidak memerlukan query database. Ini belum membuktikan koneksi
runtime Vercel, Google OAuth atau worker cloud. Integration/E2E tidak diulang
secara lokal untuk perubahan script build/dokumentasi; CI GitHub terbaru
menjalankan suite lengkap seperti dicatat berikut. Tidak ada test dijalankan ke
Supabase produksi.

Push commit `a76426e` berhasil secara fast-forward ke `main` dan
`codex/admin-management`; kedua ref remote diverifikasi menunjuk SHA yang sama.
Workflow GitHub `Native validation` main, run `39578199291`, selesai dengan
status **success**, diverifikasi melalui API jobs. Seluruh langkah wajib lulus:
instalasi bersih, migration/upgrade, format, lint, typecheck, secret/skill/template
scan, unit, build web/worker, integration, Chromium E2E, backup/restore dan audit.
Fixture CI tetap terpisah dari Supabase produksi. Status integrasi
Vercel untuk deployment `DKH1HDJV7qGwscNE6V27SrXgtzm9` adalah failure. Pengguna
memberikan error pertama dari Build Logs:

```text
PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
Command "npm run build:hosted" exited with 1
```

Kegagalan cloud ini berasal dari environment hosting yang belum diisi. Database
Supabase tetap sudah diterapkan. Operator perlu menyimpan Transaction pooler URI
project tersebut sebagai `DATABASE_URL` pada environment Production Vercel,
melengkapi `BETTER_AUTH_SECRET` acak minimal 32 karakter dan origin `APP_URL`,
lalu redeploy. Password/URI tidak dikirim melalui chat atau dimasukkan ke Git.
Connection string runtime belum tersedia pada tugas ini; deployment publik belum
dinyatakan berhasil. Credential dummy tidak disimpan pada hosting.

## Penerapan schema Supabase - 21 Oktober 2026

Atas instruksi pengguna, schema diterapkan ke project **buatin**, ref
`oeznehkxknbgvbtunebu`. Preflight Supabase CLI memverifikasi database `postgres`,
role operator `postgres`, nol tabel `public`, nol tabel `pgboss` dan belum ada
riwayat Prisma. Tidak ada data aplikasi cloud untuk dicadangkan sebelum bootstrap.
Project lain tidak disentuh. Database dan `.env` sumber lokal dipertahankan.

Rehearsal memakai database lokal baru
`buatin_supabase_rehearsal_2fc958bd1df7`, dibuat melalui environment fixture mock
terpisah. Tidak ada test suite, akun fixture atau inferensi AI yang dijalankan
pada Supabase produksi. Verifikasi cloud hanya membaca metadata schema, konfigurasi
paket/antrean dan jumlah row akun/proyek/pembayaran.

| Pemeriksaan                      | Hasil aktual                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Bootstrap rehearsal              | 12 SQL migration berhasil dalam transaksi; guard menolak schema berisi tabel                       |
| Kesetaraan rehearsal             | Tabel, RLS, kolom, constraint dan index sama dengan database fixture yang dimigrasikan Prisma      |
| Prisma pada rehearsal            | `prisma migrate status`: up to date; `prisma migrate deploy`: no pending migrations                |
| Kompatibilitas pg-boss rehearsal | Startup library 12.38.0 berhasil; empat antrean terbaca                                            |
| Bootstrap Supabase nyata         | 45 tabel aplikasi dan `_prisma_migrations` dibuat; 12 migration selesai                            |
| Checksum cloud                   | Seluruh 12 nama/checksum sama dengan file repository; finished, tanpa rollback, applied steps satu |
| Kesetaraan cloud                 | Seluruh tabel, RLS, kolom, constraint dan index cocok dengan rehearsal                             |
| Privasi tabel cloud              | RLS aktif pada 46 tabel public; nol hak tabel untuk PUBLIC/anon/authenticated                      |
| Antrean cloud                    | 13 tabel schema `pgboss`, versi 46; `plan`, `generate`, `reference`, `maintenance` tersedia        |
| Konfigurasi antrean              | Policy short, retry nol, expiry 28.800 detik dan retention 86.400 detik sesuai worker              |
| Privasi antrean cloud            | Role anon dan authenticated tidak memiliki USAGE schema `pgboss`                                   |
| Data awal                        | Empat paket, features/planner limit terisi; harga null dan checkout nonaktif                       |
| Data pengguna                    | Nol akun, proyek dan pembayaran; tidak menyalin data laptop                                        |

Penerapan memakai `supabase db query --linked --project-ref
oeznehkxknbgvbtunebu --file ... --output-format json` melalui Management API yang
terautentikasi. Seluruh SQL migration repository dijalankan sesuai urutan dalam
satu transaksi. Dua wrapper BEGIN/COMMIT migration digabung ke transaksi luar;
isi migration dan checksum file sumber tidak diubah. Struktur ledger mengikuti
Prisma terpasang; riwayat dicatat setelah seluruh SQL berhasil. Pengujian engine
Prisma pada rehearsal mengonfirmasi deployment berikutnya tidak mengulang migration.
Cloud diverifikasi melalui metadata dan checksum, bukan koneksi langsung Prisma.

Schema antrean berasal dari `getConstructionPlans('pgboss')` library terkunci,
bukan salinan DDL buatan. Pembuatan antrean memakai opsi worker yang ada. Hak
schema/table/function untuk browser dicabut; tidak ada worker, panggilan AI,
pengiriman email atau heartbeat worker yang dijalankan pada cloud.

Artefak privat SQL, manifest checksum dan hasil inspeksi berada di
`.local/supabase-bootstrap-20261021/`, tidak disertakan ke Git. Jangan menjalankan
ulang bootstrap pada schema terisi. Migration selanjutnya memakai
`npm run db:migrate` dengan `DATABASE_DIRECT_URL` pada environment hosting.

Koneksi runtime Vercel/worker belum dikonfigurasi pada checkout; project Vercel
`buatin` sudah diketahui melalui screenshot berikutnya, origin final belum
diverifikasi. Aplikasi tetap memerlukan connection string
server pada secret environment hosting, bucket/S3, Google OAuth, email, Turnstile,
scanner dan konfigurasi anggaran AI sesuai `DEPLOYMENT.md`. Schema sudah ada;
hal ini belum membuktikan web publik, Google login atau worker cloud berfungsi.
Pemeriksaan build dan unit terbaru dicatat pada bagian perbaikan Vercel; suite
integration/E2E sebelumnya tetap tercatat pada bagian berikut.

## Hosting bersama dan Google login - 21 Oktober 2026

Target: Vercel web, Supabase PostgreSQL/storage privat dan Railway worker Node 24.
Pengujian aplikasi memakai PostgreSQL 17 lokal dengan database
`buatin_admin_fixture_20261021`, web port 3108 dan mock port 4118, build terpisah
`.local/admin-next`. Semua credential AI, pembayaran, email dan S3 nyata dihapus
dari environment fixture. `.env`, database dan layanan sumber tidak dimigrasikan
atau ditimpa oleh tugas ini. Integration/E2E/restore dijalankan bergantian.

| Pemeriksaan                    | Hasil aktual                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                     | 70 tes unit, 11 file, lulus                                                                                                                                                                   |
| `npm run test:integration`     | 50 tes, tujuh file, lulus dalam 218,93 detik                                                                                                                                                  |
| `npm run test:e2e`             | 18 skenario Chromium lulus dalam 2,6 menit                                                                                                                                                    |
| `npm run build:hosted`         | Prisma generate, build worker dan Next.js 16.4.2 lulus                                                                                                                                        |
| Prisma migrate status          | 12 migration terpasang dan up to date pada fixture                                                                                                                                            |
| `npm run test:migrations`      | Upgrade invoice historis, subscription, manfaat dan ledger lulus pada database inspeksi baru                                                                                                  |
| `npm run test:backup`          | Backup database/blob terenkripsi, restore baru, checksum dan isi lampiran lulus; receipt terbaca tanpa filesystem host backup                                                                 |
| `npm run test:recovery`        | SIGKILL, lease kedaluwarsa, worker baru dan resume 20/20 dokumen lulus; checksum serta attempts checkpoint sukses tetap                                                                       |
| `npm audit --audit-level=high` | 0 vulnerabilities                                                                                                                                                                             |
| Katalog reviewed               | Lima skill pack dan 42 template lolos checksum                                                                                                                                                |
| Konfigurasi provider           | `vercel.json` dan `railpack.json` lolos validasi constraints schema resmi menggunakan Ajv; deployment nyata belum dijalankan                                                                  |
| Runtime assets                 | Trace build API menyertakan 43 file template, dua prompt, sepuluh config dan 16 file skill pack                                                                                               |
| Akses Supabase operator        | Project `oeznehkxknbgvbtunebu` bernama `buatin`, `ACTIVE_HEALTHY`, region `ap-south-1`; SELECT metadata berhasil sebagai `postgres`, PostgreSQL 17.11; izin CREATE tabel/schema terkonfirmasi |

Pemeriksaan akhir `npm run format:check`, `npm run lint`, `npm run typecheck`
dan `git diff --check` lulus; lint tanpa warning. `npm run security:scan` lulus,
316 file source/config/dokumen diperiksa tanpa mencetak nilai secret. Format check
sempat menemukan cache yang dibuat Supabase CLI; `supabase/.temp/` sekarang
dikecualikan dari Git dan formatter, lalu pemeriksaan diulang hingga lulus.

Cakupan Google memakai callback Better Auth sebenarnya dengan respons provider
yang diganti lewat fetch fixture, RSA/JWKS dan credential test. Cakupan: state cookie/database sekali pakai,
PKCE S256, cancel, replay, signature/issuer/audience/expiry token, email terverifikasi,
linking aman, signup pause, suspend, unique provider identity, penolakan login
Google untuk staf/MFA dan pembuangan token provider. Direct idToken, callback
override, Origin salah serta body lebih dari 16 KiB ditolak. Browser memeriksa
keyboard, error yang dapat dicoba ulang dan pesan callback yang aman. Screenshot
Google login desktop/mobile diperiksa secara visual; mobile tidak overflow.
Tidak ada akun Google nyata atau credential produksi dipakai oleh fixture.

Temuan yang direproduksi dan diperbaiki:

- Callback code pada versi Better Auth terpasang semula hanya men-decode ID token.
  Token fixture dengan audience salah berhasil masuk. Callback sekarang memanggil
  verifier Google resmi library secara eksplisit; regression audience/issuer/expiry
  salah ditolak. Tidak ada implementasi kriptografi buatan sendiri.
- Pembatas body yang membaca clone request dapat menunggu selamanya saat cancel
  stream bercabang. Handler kini membaca body asli secara terbatas, melepas reader
  dan membentuk request baru. Regression oversized request menghasilkan HTTP 413.
- Locator browser `getByRole('alert')` semula juga memilih route announcer Next.
  Dua tes Google gagal strict mode, sementara UI menampilkan pesan yang benar.
  Locator dibatasi ke `main`; seluruh 18 skenario kemudian lulus.
- Kesiapan scanner dan waktu backup tidak dapat dibaca dari filesystem Vercel
  karena worker/backup berada di host lain. Scanner sekarang dibaca dari heartbeat
  worker segar, backup dari receipt DB setelah bundle selesai. Regression
  memeriksa heartbeat hilang/stale/legacy dan pembacaan receipt lintas host.

Uji backup memakai bundle privat
`.local/admin-fixture-backups/buatin-2026-10-21T08-26-45-561Z-40d8fc77-fec8-44b9-89d6-b934152d67be`,
database restore `buatin_restore_1df0f7ebfe69487ab3436801da9e5c24` dan inspeksi
`.local/restore-check-18df4264-d414-4b2b-8df7-dff6902b003e`.
Dua file diverifikasi, `attachmentVerified:true`. Uji upgrade menggunakan
`buatin_admin_upgrade_718f1a9a98ad4c0b94abb09c2b85cd40`. Semua artefak tersebut
privat dan tidak disertakan ke Git atau hosting.

Pada pemeriksaan awal sebelum bootstrap yang dicatat terpisah di atas,
query Supabase hanya memeriksa metadata: schema `public` memiliki nol tabel dan
`_prisma_migrations` belum ada. Belum ada migration, seed, akun, perubahan data
pengguna atau deployment cloud pada project itu saat pemeriksaan awal. Akses SQL operator bukan bukti
connection string runtime Vercel/Railway sudah tersedia. Publishable/anon key
tidak diperlukan untuk Prisma + Better Auth. Konfigurasi server database, S3,
domain web, Google OAuth, email, Turnstile, scanner, backup luar host dan batas
AI nyata tetap diperlukan. RLS sudah diuji pada fixture; smoke role Supabase,
OAuth publik, upload lintas host, reboot Railway dan kapasitas belum diverifikasi.
Receipt backup bukan bukti volume/offsite/restore produksi. Panduan dan prioritas
ada di `DEPLOYMENT.md` serta `PRODUCTION_READINESS.md`.

## Implementasi admin - 21 Oktober 2026

Implementasi dan batas operasional ada di `ADMIN_GUIDE.md`. Pengujian pada macOS
arm64, Node.js 24.22.0, PostgreSQL 17 lokal, database/storage/email fixture terpisah.
Server dan worker fixture memakai mock dengan seluruh kredensial layanan nyata
dikosongkan. Suite dijalankan bergantian. Konfigurasi `.env` sumber dipertahankan.

| Pemeriksaan                               | Hasil aktual                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Migration admin                           | Dua migration baru diterapkan setelah backup/rehearsal; total sepuluh migration                                        |
| Kesetaraan data lama                      | Invoice/status/manfaat, masa subscription, ledger dan usage sama dengan salinan rehearsal; subtotal backfill valid     |
| Prisma validate/status/diff               | Schema valid, seluruh migration terpasang; tidak ada drift setelah normalisasi ekspresi default PostgreSQL yang setara |
| `npm test`                                | 62 tes unit dalam sembilan file lulus                                                                                  |
| Format/lint/typecheck                     | Lulus; lint tanpa warning                                                                                              |
| Build web/worker                          | Keduanya lulus; web mencakup admin dinamis dan bantuan pengguna                                                        |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities                                                                                                      |
| Verifikasi katalog                        | Lima skill pack reviewed dan 42 template lolos checksum; upstream tidak dieksekusi                                     |
| `npm run security:scan`                   | Lulus, 297 file source/config/dokumen; secret tidak dicetak                                                            |
| `npm run test:backup`                     | Database dan blob fixture terenkripsi, restore ke database baru, checksum/isi lampiran lulus                           |
| `npm run test:recovery`                   | SIGKILL, lease kedaluwarsa, worker baru, resume 20/20 dokumen; checkpoint sukses tidak berubah                         |

Suite integrasi akhir: 44 tes dalam enam file lulus, 149,84 detik, pada build
produksi. Audit dependency lengkap maupun produksi: 0 vulnerabilities.
Suite browser akhir: 16 skenario Chromium lulus dalam 2,7 menit, mencakup
desktop/mobile, keyboard, riwayat bantuan serta balasan dari halaman pesan lama.
Screenshot voucher desktop dan audit mobile diperiksa secara visual.
`test:migrations` lulus pada database inspeksi baru berisi dua invoice historis;
nominal/manfaat/periode/ledger/usage dipertahankan, subtotal diisi dan default
sementara dilepas. Migration sudah selaras pada sumber lokal dan fixture.

Cakupan mencakup permission owner/admin, password/TOTP reauth, owner terakhir
concurrent, undangan single-use, suspend, pencabutan sesi, grant/kredit kumulatif,
versi harga/manfaat, reservasi voucher concurrent, quote expired/berubah, callback
duplikat/ambigu/terlambat, rekonsiliasi tanpa penurunan paid, refund uang dengan
approval/bukti dan revokasi akses idempotent. Bantuan memeriksa ownership, catatan
internal, retry dan pagination; privasi memeriksa bukti/notifikasi; CSV memeriksa
izin, batas dan formula. Konten reviewed/checksum dibekukan dalam snapshot job.

Temuan selama validasi:

- Fixture voucher awal mencari kode lowercase sementara produk menormalisasi
  uppercase; fixture diperbaiki. Navigasi browser kemudian masih mengisi form
  lama sebelum detail siap; fixture sekarang menunggu heading detail.
- Riwayat tiket semula hanya mengambil 100 pesan pertama. Regression dengan 105
  pesan publik membuktikan balasan terbaru hilang. API/UI kini memakai 20 pesan
  per halaman, halaman terbaru dahulu, count publik tanpa catatan internal;
  balasan dari halaman lama kembali ke halaman terbaru.
- Cache detail tidak mempertahankan data target lain saat ID berubah; daftar
  dengan filter pada target yang sama tetap mempertahankan data selama fetch.
- Model AI kini membutuhkan alasan dan versi aktif, memakai key retry stabil;
  audit mencatat reauth sukses/gagal tanpa payload autentikasi. Laporan AI
  menampilkan versi/tarif yang tersimpan dan model provider.
- Bootstrap owner dikeluarkan dari CI fixture. Suite admin menolak database
  yang sudah berisi owner, sehingga tes owner terakhir tidak mengubah akun nyata.
- Percobaan backup fixture pertama gagal karena kunci khusus fixture belum ada.
  Kunci privat baru dibuat; pengulangan backup/restore lulus. Kunci sumber tidak
  dipakai ulang atau dicetak.
- Tinjauan SQL menemukan `subtotal NOT NULL` tanpa default sementara invoice
  historis belum terisi. Uji upgrade berisi dua invoice mereproduksi `23502`.
  Migration admin baru yang belum dipush/dirilis dikoreksi memakai default nol
  sementara; backfill mengisi nominal asal, lalu default dihapus. Uji ulang lulus,
  termasuk subscription, fitur, masa bayar, ledger dan usage lama. Checksum tiga
  database lokal diselaraskan setelah metadata dibackup; tabel aplikasi tidak
  diubah oleh penyelarasan. Migration lama yang sudah dipublikasikan tidak diubah.
  Regression permanen `npm run test:migrations` ditambahkan ke CI.

Backup sebelum migration sumber dipertahankan privat di
`.local/backups/buatin-2026-10-21T03-51-02-090Z-3172d129-2e8e-4d45-85d6-2f5af5509035`.
Bundle admin yang diuji:
`.local/admin-fixture-backups/buatin-2026-10-21T05-12-12-395Z-8f0e1e5d-2e0f-4059-b66e-9983d4182caa`.
Database restore: `buatin_restore_b1abffcbe75a4c51b5ed81201d625bd6`.
Hasil inspeksi: `.local/restore-check-a3ba48a1-e092-4d19-b271-208e74c8f1f1`.
Database sumber tidak ditimpa oleh restore. Path build fixture otomatis di
next-env/tsconfig telah dikembalikan ke `.next` sebelum verifikasi akhir.

Web/worker sumber kembali memakai konfigurasi privat non-mock. Pemulihan worker
awalnya ditolak tinjauan otomatis karena potensi inferensi berbayar. Pembacaan
read-only membuktikan nol job/task/lampiran/outbox/antrean AI; pemulihan kemudian
diizinkan. Tidak ada inferensi tambahan. Halaman publik dan health HTTP 200,
admin anonim 401, bantuan anonim redirect login. `ops:check` exit 0: DB/worker
sehat, antrean kosong, tanpa alert. `check:production` exit 1 sesuai tujuan:
tujuh konfigurasi P0 belum siap dan empat tindak lanjut P1 manual.

Hosting/domain/database produksi tetap ditunda. Merchant/refund uang, email,
challenge, MFA owner sebenarnya, scanner, storage produksi, backup luar host,
alert dan CI pada runner GitHub memerlukan bukti staging. Tarif AI tetap perlu
ditetapkan berdasarkan provider; mock tidak membuktikan mutu/biaya inference.
Refund uang dan pemenuhan privasi tetap membutuhkan tindakan operator yang
diverifikasi. Tidak ada klaim peluncuran publik dari pengujian lokal ini.

## Rencana pengembangan admin - 21 Oktober 2026

Catatan historis sebelum implementasi. Perubahan hanya dokumentasi: kondisi admin saat itu, matriks izin, manajemen
pengguna/paket/voucher, integritas pembayaran, perubahan data/API, tahapan dan
kriteria penerimaan dicatat di `ADMIN_PLAN.md` serta ditautkan dari README.
Tidak ada implementasi fitur admin baru atau perubahan schema/runtime.

Pemeriksaan dokumentasi dengan Node.js 24:

- Prettier pada README dan rencana admin lulus.
- `npm run security:scan`: lulus, 261 file source/config/dokumen diperiksa;
  nilai secret tidak dicetak.
- `git diff --check` pada perubahan dokumentasi lulus. Snapshot skill upstream
  yang dikunci checksum tetap dipertahankan.

Build, lint, typecheck dan suite aplikasi tidak diulang karena perilaku aplikasi
tidak berubah. Hasil pengujian implementasi sebelumnya tercatat terpisah di bawah;
hasil tersebut tidak membuktikan fitur yang masih berupa rencana.

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

## 2026-10-23 - Instalasi paket observability Vercel

- `npm install --save-exact @vercel/analytics @vercel/speed-insights`: berhasil;
  analytics 2.0.1 (MIT), speed-insights 2.0.0 (Apache-2.0), sumber npm registry.
  Versi dikunci di manifest dan lockfile. Komponen belum dipasang pada aplikasi.
- `npm ls @vercel/analytics @vercel/speed-insights`: kedua versi terpasang.
- `npx prettier --check package.json package-lock.json`: lulus.
- `npm run typecheck`: lulus. Audit bawaan instalasi: 0 vulnerabilities.
- Node lokal 26.8.2 menghasilkan EBADENGINE karena proyek meminta Node 24.
  Lint, unit/integration/E2E, build dan secret scan tidak dijalankan untuk
  instalasi dependency ini; hasil ini bukan validasi rilis atau telemetry produksi.
