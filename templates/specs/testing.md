# Pengujian — {{projectName}}

## Strategi

**Stack target:** Berdasarkan teknologi yang dipilih di [architecture.md](architecture.md).

Pengujian mengikuti prinsip:

1. **Test perilaku pengguna**, bukan detail implementasi
2. **Setiap REQ memiliki test** yang dapat dijalankan ulang
3. **Bug fix dimulai dengan regression test** yang gagal sebelum perbaikan
4. **Test berjalan di CI** — kegagalan memblokir rilis

Prasyarat:

- Environment test terpisah dari produksi
- Database test dengan seed data (bukan data pengguna nyata)
- Mock/sandbox untuk layanan pihak ketiga
- Fixture yang mencakup kasus normal, batas, dan error

## Lapisan

### Unit Test

Fokus: aturan domain, validasi, perhitungan, transisi state.

| Area              | Contoh Kasus                                    |
| ----------------- | ----------------------------------------------- |
| Validasi input    | Format email, panjang password, karakter khusus |
| Perhitungan       | Kalkulasi harga, diskon, pajak                  |
| Transformasi data | Formatting, sanitasi, serialisasi               |
| Batas nilai       | Min/max, empty, null, overflow                  |
| State transition  | Status order, lifecycle entitas                 |

### Integration Test

Fokus: interaksi antar komponen, API, database.

| Area                       | Contoh Kasus                                  |
| -------------------------- | --------------------------------------------- |
| API endpoint               | Request/response, status code, error handling |
| Database                   | CRUD, constraint, migration, rollback         |
| {{#if hasAuth}}            | Autentikasi                                   | Login/logout, session, token refresh, RBAC     |
| Otorisasi                  | Akses resource per role, ownership check      |
| {{/if}}{{#if hasPayments}} | Pembayaran                                    | Webhook processing, status update, idempotensi |
| {{/if}}                    | Timeout/retry                                 | Layanan eksternal down, retry logic            |

### E2E Test

Fokus: alur pengguna dari awal sampai hasil.

| Alur                       | Kasus                                     |
| -------------------------- | ----------------------------------------- |
| Halaman utama              | Load, navigasi, responsif desktop/mobile  |
| {{#if hasAuth}}            | Registrasi → Login → Logout               | Flow lengkap, error handling, redirect |
| {{/if}}{{#if hasPayments}} | Checkout → Pembayaran                     | Pilih produk → bayar → konfirmasi      |
| {{/if}}{{#if hasSearch}}   | Pencarian                                 | Ketik query → hasil → klik → detail    |
| {{/if}}                    | Form submission                           | Isi → validasi → submit → feedback     |
| Error state                | 404, 500, network error, empty state      |
| Keyboard navigasi          | Tab order, focus visible, enter/space     |
| Loading state              | Skeleton untuk async, konten SSR langsung |
| Double submit              | Form tidak terkirim dua kali              |

### Security Test

| Skenario                         | Referensi                                  |
| -------------------------------- | ------------------------------------------ |
| Input berbahaya (XSS, injection) | [security.md](security.md) TEST-SEC-01..02 |
| {{#if hasAuth}}                  | Akses lintas akun                          | TEST-SEC-04     |
| Sesi kedaluwarsa                 | TEST-SEC-05                                |
| {{/if}}{{#if hasUploads}}        | Upload file berbahaya                      | TEST-SEC-07..08 |
| {{/if}}                          | Secrets di client                          | TEST-SEC-11     |

## Setelah Perubahan

Setiap perubahan kode mengikuti urutan:

1. **Reproduksi** — Tulis test yang gagal (untuk bug) atau test baru (untuk fitur)
2. **Perbaikan** — Implementasi sampai test hijau
3. **Verifikasi lokal:**
   - `format` + `lint` + `typecheck`
   - Test yang relevan dengan perubahan
   - Build berhasil
4. **UI check** — Desktop dan mobile, keyboard navigasi, kontras
5. **Schema change** — Migration + verifikasi data existing
6. **Sebelum rilis:**
   - CI hijau (semua test)
   - Security audit dependency
   - Smoke test di staging
   - Kegagalan memblokir rilis sampai diperbaiki atau ada pengecualian beralasan

## Traceability

Setiap kebutuhan (REQ-xx) terhubung ke acceptance criteria (AC-xx) dan test case (TEST-xx):

| REQ    | AC    | TEST    | Status  |
| ------ | ----- | ------- | ------- |
| REQ-01 | AC-01 | TEST-01 | pending |
| REQ-02 | AC-02 | TEST-02 | pending |
| REQ-03 | AC-03 | TEST-03 | pending |
| REQ-04 | AC-04 | TEST-04 | pending |
| REQ-05 | AC-05 | TEST-05 | pending |
| REQ-06 | AC-06 | TEST-06 | pending |
| REQ-07 | AC-07 | TEST-07 | pending |
| REQ-08 | AC-08 | TEST-08 | pending |
| REQ-09 | AC-09 | TEST-09 | pending |
| REQ-10 | AC-10 | TEST-10 | pending |

Detail pemetaan lengkap tersedia di [acceptance.md](acceptance.md).

## Lazy Loading Testing

Pengujian loading disesuaikan dengan strategi rendering:

| Skenario                   | Perilaku yang Diharapkan                                        | Test                     |
| -------------------------- | --------------------------------------------------------------- | ------------------------ |
| Konten SSG/SSR             | Langsung terlihat, tanpa skeleton atau delay buatan             | Visual + network trace   |
| Hero/LCP above-the-fold    | Tersedia tanpa scroll, tanpa lazy-load                          | Lighthouse LCP           |
| Data async cepat (<300ms)  | Tidak ada flicker atau delay minimum                            | Timing assertion         |
| Data async sedang (0,5–3s) | Skeleton sesuai bentuk akhir, layout stabil                     | CLS check                |
| Request panjang (>10s)     | Status/progres nyata, timeout, error + retry                    | E2E scenario             |
| Refresh halaman            | Data sebelumnya dipertahankan, response lama tidak menimpa baru | State assertion          |
| Empty state                | Pesan informatif dengan aksi                                    | Visual check             |
| Error state                | Pesan deskriptif, opsi retry                                    | Visual check             |
| Reduced motion             | Placeholder statis, tanpa shimmer                               | `prefers-reduced-motion` |
| Keyboard/screen reader     | `aria-busy`, fokus terjaga, tidak berulang                      | A11y test                |

**Target performa (persentil ke-75):**

- LCP ≤ 2,5 detik
- CLS ≤ 0,1
- INP ≤ 200ms

Diukur pada desktop dan mobile dengan kondisi jaringan dan cache yang dicatat. Semua test berstatus **pending** sampai dijalankan.
