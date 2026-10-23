# Pengujian Buatin

Gunakan Node.js 24, PostgreSQL lokal, `MOCK_LLM=true`, web dan worker lokal.
Prasyarat setup ada di README. Jangan arahkan test ke database produksi.

## Setelah perubahan

Jalankan test yang memeriksa perilaku yang berubah. Bug perlu reproduksi atau
regression test yang gagal sebelum perbaikan. Catat hasil aktual; kegagalan lama
dipisahkan dari perubahan baru.

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:migrations
npm run test:integration
npm run test:e2e
npm run build:worker
npm run build
npm audit --omit=dev --audit-level=high
npm run security:scan
npm run skills:verify
npm run templates:verify
```

## Cakupan

Google diuji dengan callback Better Auth sesungguhnya dan token/JWKS fixture
RSA di proses test; tidak menghubungi atau membuat akun Google nyata. Cakupan:
PKCE, state cookie, replay, audience, email terverifikasi, linking aman, unique
identity, role/suspend/MFA serta signup pause pada callback. Browser memeriksa
tombol Google, keyboard, mobile dan kegagalan yang bisa dicoba ulang. Kelulusan
fixture bukan bukti OAuth Google pada domain publik; smoke staging tetap wajib.
Variable Google fixture tidak boleh berisi credential sebenarnya.
Uji RLS beralih ke `pg_read_all_data` agar role non-pemilik tetap tidak dapat
membaca row. Role fixture CI diberi keanggotaan role baca tersebut; ini hanya
untuk database test terisolasi, bukan instruksi akses produksi.

Konfigurasi hosted diuji menolak loopback/mock/secret yang belum lengkap, memilih
koneksi direct/session, serta tidak mencetak nilai rahasia. Script hosted bukan
test beban atau bukti provider. Integration/E2E juga menolak direct/worker URL
yang menunjuk database non-loopback.

Perubahan jalur build perlu diperiksa pada salinan repository bersih di luar
workspace sumber: `npm ci --include=dev`, lalu `npm run build:hosted`. Gunakan
variable fixture, tanpa `.env` sumber atau koneksi database produksi. Perintah
`npm run build` menghasilkan Prisma Client sendiri sebelum Next.js; jangan
mengandalkan client hasil development atau cache dari commit/schema lain.

Unit memeriksa preferensi, rekomendasi, konflik stack, HEX/kontras, katalog skill,
signature file serta batas input. Integration membuktikan persistence, version
conflict, ownership, lampiran privat, parser, revisi/preset dan snapshot. E2E
membuktikan editor sampai dokumen/ZIP, interaksi desktop/mobile dan failure paths.
Fixture memakai akun sementara; cleanup hanya menyentuh data milik fixture.

Admin memerlukan regression untuk role/status terbaru, MFA/reauth, owner terakhir
concurrent, undangan email sekali pakai, suspend dan pencabutan sesi, cap grant
kumulatif UTC, refund kredit ke sumber asal, snapshot paket dan konflik versi.
Voucher diuji untuk slot terakhir concurrent, batas per akun, quote berubah/
kedaluwarsa, provider ambigu, callback berulang dan paid terlambat. Refund uang
memeriksa transisi, bukti, approval owner dan revokasi subscription sekali.
Rekonsiliasi tidak boleh menurunkan invoice paid ketika request bersamaan.

Konten diuji draft/review/publish/unpublish, checksum dan snapshot job lama.
Bantuan memeriksa ownership/internal note serta retry tanpa duplikasi. Privasi
memerlukan bukti/status/antrean pemberitahuan. CSV diperiksa izin, batas dan
formula injection. E2E admin mencakup kredit, voucher versi, audit, keyboard,
tampilan desktop/mobile; fixture menunggu halaman detail siap sebelum mengisi.

Strategi loading diuji sebagai rekomendasi kontekstual dan kontrak dokumen hasil:
jenis website/rendering, hero/LCP tanpa lazy, skeleton kondisional, tanpa delay
buatan, reduced motion dan status/progres nyata. Pemeriksaan performa website
target mengikuti `docs/LOADING_STRATEGY.md` setelah target diimplementasikan.

Mock membuktikan pipeline, bukan kualitas AI atau kemampuan provider nyata.
Vision, scanner produksi dan storage S3 perlu smoke test staging dengan adapter
yang dikonfigurasi. Bukti dan keterbatasan dicatat di `docs/VALIDATION.md`.

Vitest mengisolasi MOCK_LLM=true dan mengosongkan key 9router fixture. Integration
dan E2E memeriksa mode server aktual sebelum membuat akun/proyek. Jalankan web
dan worker test dengan override MOCK_LLM=true meski `.env` lokal memakai AI nyata.
Jangan menjalankan integration/E2E bersamaan karena kontrol mock digunakan bersama.

Jangan mengarahkan fixture admin ke database lokal yang berisi owner nyata:
uji owner terakhir membutuhkan database khusus tanpa owner yang sudah ada.
Suite menolak database dengan owner; CI tidak menjalankan bootstrap owner.
Pakai database baru, storage/outbox/backup terpisah dan kosongkan semua kredensial
AI, merchant, email serta S3 nyata. Untuk web dev/build bersamaan, gunakan
`NEXT_BUILD_DIR` berbeda agar hasil compile tidak saling menimpa. Jangan commit
path dist sementara yang otomatis ditambahkan Next ke next-env/tsconfig.

Migration admin perlu rehearsal pada salinan backup terlebih dahulu. Bandingkan
nominal/status invoice, manfaat, masa subscription dan ledger sebelum/sesudah.
FK Restrict baru berarti cleanup fixture harus menghapus catatan miliknya secara
eksplisit dalam urutan yang benar. Jangan mengubah migration yang sudah diterapkan.
Uji restore ke database baru serta recovery worker setelah perubahan keuangan.

`test:migrations` membuat database baru dengan prefix `buatin_admin_upgrade_`,
menerapkan schema lama, mengisi invoice paid/pending, subscription dan ledger,
lalu menjalankan upgrade dan memeriksa backfill/manfaat/data asal. Database
inspeksi dipertahankan; perintah memerlukan PostgreSQL CLI dan izin CREATEDB,
loopback serta MOCK_LLM=true. Tidak menimpa database sumber. CI menjalankannya
sebelum migration database fixture utama. Migration yang sudah dipublikasikan
tidak boleh ditulis ulang; koreksi memakai migration baru dan runbook yang ditinjau.

Operasi memerlukan regression untuk reservasi AI concurrent, usage hilang, MFA /
recovery code, pencabutan sesi, kesiapan dependency dan integritas backup. Jalankan
`backup:verify -- <bundle> --restore` ke database baru untuk bukti pemulihan lengkap;
unit enkripsi tidak cukup. `provider:check -- --smoke` adalah panggilan nyata yang
terpisah dari fixture dan dapat ditagih; jangan masukkan key nyata ke CI test.

## Production hardening regressions

- `tests/integration/route-contracts.test.ts`: exact suffix rejection, 404/405,
  method-specific Allow, bodyless HEAD, mutation-free OPTIONS.
- `tests/e2e/cache-isolation.spec.ts`: logout/login for two users in one tab,
  cleared document state, account isolation and offline view.
- `tests/integration/owner-recovery.test.ts`: concurrent first-owner guard,
  session revocation, retained MFA, no promotion via reset.
- `tests/integration/workflow.test.ts`: template package export, worker outage
  before quota reservation, checkpoint resume, running cancellation, metadata
  without document bodies. Provider failure is injected only at test boundaries.
- `tests/integration/saas.test.ts`: no cancellation refund after a template
  checkpoint, including stale leases with zero AI requests.
- `tests/unit/backup-remote.test.ts`: mocked remote round-trip integrity; corrupt
  responses cannot publish completion receipts. This does not prove real S3.

Release validation also runs `npm run security:history`; the baseline contains
fingerprints of revoked legacy credentials only. Current source must pass the
separate scanner without that baseline. Never add a new secret to the baseline
instead of revoking it. See `docs/PRODUCTION_RELEASE.md` for provider activation.

Operations scope regressions live in `tests/unit/deployment-checks.test.ts`:
dependency, mock, route and private-access blockers remain active; malformed,
redirected and false-health responses fail. `tests/unit/worker-status.test.ts`
checks scanner health failure, isolated environment and missing/stale signatures.
Native CI builds the worker Docker image and checks bundled PostgreSQL/ClamAV;
an image without downloaded signatures must fail scanner health.

Remote download tests reject traversal, duplicate names, ID/size mismatches and
corrupted bytes, preserving private file permissions. They use mocked S3;
real off-host restore remains a separate provider exercise. Full setup commands
and scope limitations are in `docs/PRODUCTION_RELEASE.md`.
