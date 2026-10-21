# Implementasi Buatin tanpa Docker

Lihat `BUATIN_IMPLEMENTATION.md` untuk irisan teknis dan keputusan data.

| Fase            | Implementasi                                                  | Penerimaan                                                                        |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Fondasi web     | Next.js, TypeScript, Tailwind/Radix, PostgreSQL/Prisma        | Web/API dan worker berjalan native                                                |
| Akun publik     | Better Auth, email, Turnstile, recovery, RBAC                 | Verifikasi wajib; resource akun lain 404; admin 403 untuk user                    |
| Paket dan kuota | Free lifetime; Starter/Plus/Max weekly; ledger atomik         | Klik paralel tidak menggandakan potongan; reset WIB; delete tidak menambah kredit |
| QRIS            | Duitku inquiry, callback HMAC, rekonsiliasi, invoice, receipt | Hanya QRIS; aktivasi dari status server; webhook idempotent                       |
| Pro             | Revisi/compare, preset, regenerasi, private templates, batch  | Server menegakkan tingkat paket dan ownership                                     |
| Worker          | Snapshot/checkpoint, bounded concurrency, fairness, refunds   | Resume setelah expiry tanpa reservasi baru; crash dapat dipulihkan                |
| Operasional     | Retensi per job, admin usage, backup timer, CI native         | Data pembayaran dan lifetime grant tidak terhapus bersama hasil                   |
| Peluncuran      | Domain/HTTPS, sender email, QRIS merchant, harga, AI asli     | Check konfigurasi, sandbox merchant, staging, restore backup                      |

## Batas cakupan

Hasil utama adalah paket dokumen perencanaan website, bukan kode aplikasi target.
Kolaborasi tim, kursi anggota, API publik berbayar, annual billing, kupon, prorata,
autodebit, kanal selain QRIS, dan deploy website target belum termasuk.

Harga tidak diputuskan otomatis. Kuota 3/10/25 per minggu serta fitur paket berasal
dari rencana yang disetujui. Penerimaan aktual ada di `VALIDATION.md`; fitur eksternal
belum dianggap siap produksi hanya karena mock lulus.
