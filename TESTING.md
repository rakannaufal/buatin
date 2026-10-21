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

Unit memeriksa preferensi, rekomendasi, konflik stack, HEX/kontras, katalog skill,
signature file serta batas input. Integration membuktikan persistence, version
conflict, ownership, lampiran privat, parser, revisi/preset dan snapshot. E2E
membuktikan editor sampai dokumen/ZIP, interaksi desktop/mobile dan failure paths.
Fixture memakai akun sementara; cleanup hanya menyentuh data milik fixture.

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

Operasi memerlukan regression untuk reservasi AI concurrent, usage hilang, MFA /
recovery code, pencabutan sesi, kesiapan dependency dan integritas backup. Jalankan
`backup:verify -- <bundle> --restore` ke database baru untuk bukti pemulihan lengkap;
unit enkripsi tidak cukup. `provider:check -- --smoke` adalah panggilan nyata yang
terpisah dari fixture dan dapat ditagih; jangan masukkan key nyata ke CI test.
