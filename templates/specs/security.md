# Keamanan — {{projectName}}

## Cakupan

**Tipe website:** {{webTypeLabel}}

Dokumen ini mencakup kontrol keamanan yang relevan untuk fitur yang dipilih. Aset yang dilindungi:

- Kode sumber dan konfigurasi
- Data pengguna dan sesi
  {{#if hasAuth}}- Kredensial autentikasi dan token sesi
  {{/if}}{{#if hasPayments}}- Data transaksi dan informasi pembayaran
  {{/if}}{{#if hasUploads}}- File yang diunggah pengguna
  {{/if}}{{#if hasAdmin}}- Akses panel admin dan data operasional
{{/if}}

**Batas kepercayaan:**

- Input pengguna (form, URL, header, cookie): **tidak tepercaya**
- Brief, referensi, data AI, skill: **tidak tepercaya**
- Environment variables server-side: **tepercaya**
- Database internal: **tepercaya** (dengan parameterized queries)

## Kontrol

### Validasi Input

- Semua input divalidasi di **server** — validasi client hanya untuk UX
- Tipe, format, panjang, rentang dan ukuran diperiksa
- Query database menggunakan parameterized queries — tidak ada string concatenation
- Rate limiting pada endpoint publik (login, registrasi, kontak, API)
- Timeout pada semua operasi eksternal

### Output dan Header

- Output di-escape sesuai konteks (HTML, URL, JSON)
- Header keamanan:
  - `Content-Security-Policy` — membatasi sumber script/style
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (atau `SAMEORIGIN` jika perlu iframe)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` — HTTPS wajib
- CORS terbatas pada origin yang diizinkan

### CSRF

- Cookie menggunakan `SameSite=Lax` atau `Strict`, `Secure`, `HttpOnly`
- Mutasi (POST/PUT/DELETE) memerlukan pemeriksaan Origin header atau CSRF token
- GET request tidak mengubah state

{{#if hasAuth}}
### Autentikasi dan Otorisasi

- Session/token memiliki masa berlaku terbatas
- Refresh token dirotasi setelah penggunaan
- Password di-hash dengan algoritma yang aman (bcrypt/argon2)
- Setiap operasi resource memeriksa: autentikasi → ownership → permission
- Uji dengan: akun lain, role rendah, sesi kedaluwarsa, token invalid
- Halaman/API yang dilindungi mengembalikan 401/403, bukan data kosong
{{/if}}

### Secrets

- Secrets **tidak** masuk bundle client, repository, log, error message atau response
- File `.env.example` mencantumkan variabel tanpa nilai
- Secrets di-rotate tanpa downtime (gunakan versioned secrets)
- Error message tidak mengekspos detail internal (stack trace, query, path)

{{#if hasUploads}}
### Upload File

- Allowlist ekstensi dan MIME type — bukan blocklist
- Validasi magic bytes, bukan hanya ekstensi
- Nama file diganti dengan random string
- Storage terpisah dari direktori publik
- Akses file melalui signed URL atau endpoint dengan otorisasi
- Batas ukuran file dan dimensi gambar
- Scanning untuk konten berbahaya
- Batas dekompresi untuk arsip
- Cleanup file yang sudah melewati masa retensi
{{/if}}

{{#if hasPayments}}
### Pembayaran

- Webhook signature diverifikasi dari server payment gateway
- Status pembayaran dikonfirmasi via API server, bukan redirect
- Transaksi menggunakan idempotensi key untuk mencegah duplikasi
- Nominal dan currency diverifikasi ulang di server
- Replay attack dicegah dengan timestamp dan nonce
- Redirect setelah pembayaran bukan bukti pembayaran berhasil
{{/if}}

## Uji Negatif

| Skenario                    | Kontrol                        | Test                             |
| --------------------------- | ------------------------------ | -------------------------------- |
| SQL/NoSQL injection         | Parameterized queries          | TEST-SEC-01                      |
| XSS (reflected/stored)      | Output escaping, CSP           | TEST-SEC-02                      |
| CSRF                        | SameSite cookie, Origin check  | TEST-SEC-03                      |
| {{#if hasAuth}}             | Akses resource milik user lain | Ownership check per operasi      | TEST-SEC-04 |
| Sesi kedaluwarsa            | Token expiry, refresh rotation | TEST-SEC-05                      |
| Brute force login           | Rate limiting, lockout         | TEST-SEC-06                      |
| {{/if}}{{#if hasUploads}}   | Upload file berbahaya          | Allowlist, magic bytes, scanning | TEST-SEC-07 |
| Path traversal via filename | Random filename, no user path  | TEST-SEC-08                      |
| {{/if}}{{#if hasPayments}}  | Payment replay                 | Idempotensi, nonce, timestamp    | TEST-SEC-09 |
| Manipulasi nominal          | Server-side verification       | TEST-SEC-10                      |
| {{/if}}                     | Secrets di client bundle       | Build inspection, CSP            | TEST-SEC-11 |
| Error message leaking info  | Generic error response         | TEST-SEC-12                      |

Semua uji negatif berstatus **pending** sampai dijalankan pada implementasi target.

## Insiden

### Prosedur Respons

1. **Deteksi:** Monitoring, log anomali, laporan pengguna
2. **Eskalasi:** Penanggung jawab keamanan diberitahu via kanal privat
3. **Mitigasi:**
   - Cabut/rotasi kredensial yang terdampak
   - Batasi akses yang terkompromi
   - Aktifkan maintenance mode jika diperlukan
4. **Pemulihan:** Restore dari backup, verifikasi integritas data
5. **Dokumentasi:** Catat timeline, dampak, perbaikan — tanpa menyertakan secrets

### Kanal Pelaporan

- Email keamanan khusus (perlu ditentukan)
- Tidak melalui issue tracker publik
