# API aplikasi

Semua `/api/*` selain health, pricing, public-config, site, callback Duitku, dan endpoint auth membutuhkan sesi akun aktif dengan email terverifikasi. Endpoint admin/settings memerlukan role owner/admin serta MFA aktif pada domain publik. Role/status dibaca dari database pada setiap request. Mutasi membutuhkan `Origin` tepat sama dengan `APP_URL`. Session memakai cookie Better Auth; jangan menyimpan password/token dalam browser storage. Respons privat memakai `Cache-Control: private, no-store`.

| Endpoint                                   | Isi / hasil                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `GET /api/health/live`                     | Liveness `{ok:true}`; hanya proses web                                                            |
| `GET /api/health/ready`                    | Database/migration dan worker; 200 atau 503 `{ok}`                                                |
| `GET /api/health`                          | Alias readiness, tanpa detail koneksi                                                             |
| `GET /api/session`                         | Identitas, role, mode mock                                                                        |
| `GET /api/projects?page=1`                 | 20 proyek/halaman, total, kuota, heartbeat                                                        |
| `POST /api/projects`                       | `{name,webType,brief,preferences?}`; 201 `{project}`                                              |
| `GET /api/projects/:id`                    | Brief, versi, plan terakhir, task, job                                                            |
| `PATCH /api/projects/:id`                  | `{briefVersion,name?,brief?,webType?,preferences?}`                                               |
| `DELETE /api/projects/:id`                 | Purge data; 409 bila proses masih aktif                                                           |
| `POST /api/projects/:id/imports`           | `{name,content,mode:"append"                                                                      | "replace",briefVersion}`; hanya UTF-8 `.md/.txt` |
| `POST /api/projects/:id/plans`             | `{briefVersion}`; 202 `{task}`                                                                    |
| `GET /api/planning-tasks/:id`              | Status task dan kode error                                                                        |
| `POST /api/projects/:id/clarification`     | `{briefVersion,answers:[]}`; satu putaran                                                         |
| `GET /api/projects/:id/plan`               | `{plan:{version,data},status}`                                                                    |
| `PATCH /api/projects/:id/plan`             | `{version,fileId,include}`; versi baru immutable                                                  |
| `POST /api/projects/:id/jobs`              | `{planVersion}` + `Idempotency-Key`; 202 `{job:{id}}`                                             |
| `GET /api/jobs/:id`                        | Status, progres, metadata file; tanpa konten penuh                                                |
| `POST /api/jobs/:id/cancel`                | `{}`; pembatalan persisten                                                                        |
| `POST /api/jobs/:id/resume`                | `{}` + `Idempotency-Key`; file belum sukses                                                       |
| `GET /api/jobs/:id/files`                  | Metadata hasil, lint dan manifest                                                                 |
| `GET /api/jobs/:id/files/:fileId`          | `{file:{content,path,...}}`                                                                       |
| `GET /api/jobs/:id/files/:fileId/download` | Attachment Markdown aman                                                                          |
| `GET /api/jobs/:id/download`               | ZIP + manifest; 409 jika berbahaya/rujukan putus                                                  |
| `GET /api/settings`                        | Batas, model, heartbeat; tanpa key atau URL internal                                              |
| `PATCH /api/settings`                      | Operator; `{planner,writer,version,reason}` + reauth/Idempotency-Key; model wajib lolos discovery |
| `POST /api/settings/llm-check`             | Daftar model tersedia; owner, rate limit                                                          |

## Keamanan akun dan operasi

| Endpoint                           | Kontrak                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/account/sessions`        | Maksimal 50 sesi aktif sendiri; ID, waktu, user-agent, `current`; tanpa token                                              |
| `DELETE /api/account/sessions/:id` | Cabut sesi sendiri; `{ok,current}`; keluar jika `current=true`                                                             |
| `GET /api/account/data-requests`   | Maksimal 20 permintaan sendiri, terbaru dahulu                                                                             |
| `POST /api/account/data-requests`  | `{kind:"export" atau "deletion",confirmation:emailAkun}`; 202 `{request:{id,kind,status}}`; maksimal tiga/hari             |
| `GET /api/admin/operations`        | Operator; `{checks,runtime,dataRequests}`; prioritas, antrean/disk/AI dan maksimal 30 permintaan terbuka                   |
| `POST /api/admin/privacy/:id`      | Operator; `{version,status,assignedTo?,evidence?,reason}` + reauth/Idempotency-Key; completed setelah processing dan bukti |

Permintaan sejenis yang masih terbuka dipakai ulang. Perubahan status tidak
mengirim export atau menghapus data otomatis; ikuti `docs/OPERATIONS.md`.

MFA memakai endpoint BetterAuth dengan cookie dan Origin yang sama:

1. `POST /api/auth/two-factor/enable` dengan `{password}` mengembalikan
   `totpURI` dan `backupCodes`. Simpan privat; jangan log atau simpan di browser
   storage. Akun belum dianggap MFA aktif sampai kode autentikator diverifikasi.
2. `POST /api/auth/two-factor/verify-totp` dengan `{code}` memverifikasi kode
   enam digit. Aktivasi mencabut sesi lain; terapkan cookie baru dari respons.
3. Login akun MFA mengembalikan `{twoFactorRedirect:true}` tanpa sesi penuh.
   Selesaikan `verify-totp`, atau `POST /api/auth/two-factor/verify-backup-code`
   dengan `{code,trustDevice:false}`. Recovery code hanya sekali pakai.
4. `POST /api/auth/two-factor/disable` dengan `{password}` menonaktifkan MFA;
   operator domain publik kehilangan akses admin sampai MFA diaktifkan kembali.

Request AI nyata memiliki reservasi persisten harian UTC. `LLM_DAILY_LIMIT` HTTP
429 menahan request berikutnya; `LLM_PRICING_REQUIRED` HTTP 503 menunjukkan batas
USD aktif tanpa tarif. Request ambigu mempertahankan reservasi; hitungan biaya
tetap estimasi operator dan tidak menggantikan tagihan/batas provider.

Login: `POST /api/auth/sign-in/email` dengan `{email,password}`. Logout: `POST /api/auth/sign-out` dengan `{}`. `POST /api/auth/sign-up/email` menerima `{name,email,password,callbackURL}`. Password minimal 12 karakter. Verifikasi email wajib; signup/recovery/resend memerlukan header `x-turnstile-token` ketika Turnstile aktif. Token ditukar hanya pada server dan tidak disimpan dalam browser storage.

Contoh mutasi setelah login, cookie dikirim otomatis browser:

```js
const response = await fetch("/api/projects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Studio Karsa",
    webType: "landing",
    brief: "Website jasa desain untuk UMKM, menampilkan layanan dan kontak.",
  }),
});
const { project } = await response.json();
```

Error konsisten: `{"error":{"code":"PLAN_STALE","message":"...","requestId":"..."}}`.
Status: 400 validasi, 401 session, 403 role/Origin, 404 resource bukan milik pengguna, 409 versi/idempotensi/status/dependensi/ekspor, 413 ukuran, 429 kuota/rate limit, 503 AI belum siap. Tidak ada stack trace atau respons upstream mentah dalam respons.

Key idempotensi 8-128 karakter, unik per akun dan operasi. Start dengan key/payload identik mengembalikan job sama, termasuk setelah selesai atau AI mati. Payload berbeda dengan key sama menghasilkan 409. Resume tidak menambah kuota. Free memakai periode lifetime; Pro memakai minggu kalender Senin 00.00 Asia/Jakarta. Mutasi pembayaran/perubahan tingkat tidak mereset periode. Key checkout disimpan bersama catatan pembayaran; key operasi generasi disimpan 180 hari. Hasil yang sudah kedaluwarsa mengembalikan 410.

## Preferensi dan referensi

`preferences` mengikuti schema versi 1. Draft lama dengan `{}` memakai default
otomatis. Field tidak dikenal/nilai di luar katalog ditolak. Contoh parsial:

```json
{
  "schemaVersion": 1,
  "technology": {
    "mode": "manual",
    "choices": { "frontend": "Astro", "rendering": "SSG", "database": "none" },
    "additional": "Hosting statis, tanpa autentikasi."
  },
  "colors": {
    "mode": "manual",
    "palette": [
      { "name": "Primary", "hex": "#113355" },
      { "name": "Secondary", "hex": "#FFEEDD" }
    ]
  },
  "style": {
    "mode": "manual",
    "values": {
      "headingFont": "Lora",
      "layout": "Asymmetric",
      "motion": "None"
    }
  },
  "skills": { "mode": "manual", "selected": ["ui-craft", "webapp-testing"] }
}
```

Mode `auto` mengabaikan nilai manual saat resolve tetapi mempertahankannya untuk
perpindahan mode. Kategori tech yang kosong direkomendasikan; `none` berarti
tidak diperlukan. Palet wajib 2–10 warna HEX #RGB/#RRGGBB, dinormalisasi enam digit
uppercase. Skill wajib tidak dapat dinonaktifkan. Konflik menghasilkan
`PREFERENCE_CONFLICT` HTTP 400; bukan sekadar validasi UI.

| Endpoint                                             | Kontrak                                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET /api/customization`                             | Katalog teknologi/skill/gaya, limit upload, ketersediaan vision/scanner; tanpa kredensial atau URL internal          |
| `GET /api/projects/:id/attachments`                  | `{attachments,briefVersion}`, metadata dan ekstraksi aman; tanpa storage key                                         |
| `POST /api/projects/:id/attachments`                 | Body file mentah, `X-File-Name: encodeURIComponent(name)`, `X-Brief-Version`; HTTP 202 `{attachmentId,briefVersion}` |
| `PATCH /api/projects/:id/attachments/:fileId`        | JSON `{briefVersion,role,note,sourceUrl,rights}`; versi baru                                                         |
| `DELETE /api/projects/:id/attachments/:fileId`       | `X-Brief-Version`; lepas dari draft, revisi lama tetap dipertahankan                                                 |
| `POST /api/projects/:id/attachments/:fileId/retry`   | `X-Brief-Version`; hanya rejected, HTTP 202                                                                          |
| `POST /api/projects/:id/attachments/:fileId/analyze` | JSON `{briefVersion}`; hanya gambar ready dan model vision terkonfigurasi non-mock                                   |
| `GET /api/projects/:id/attachments/:fileId/download` | Ownership wajib, hanya ready; WebP inline, dokumen attachment; no-store/nosniff/CSP sandbox                          |

Role: `visual`, `brand`, `content`, `requirements`. Catatan maksimal 2000 karakter,
URL HTTP/HTTPS maksimal 2000, hak penggunaan maksimal 500. URL tidak di-fetch.
Nama file tidak boleh berisi slash/control character. Format/batas dijelaskan di
README dan dikembalikan oleh `/customization`; server memeriksa signature/ukuran
stream. Batas storage akun 20 kali total referensi per proyek, termasuk revisi.

Status: `queued`, `processing`, `ready`, `rejected`. Upload, metadata, penghapusan,
retry dan penerapan analisis AI menaikkan briefVersion. Penyelesaian ekstraksi
tidak menaikkan lagi: planner menolak `REFERENCES_PROCESSING` sampai seluruh file
selesai, lalu snapshot membekukan teks/checksum. File rejected menghasilkan
`REFERENCE_REJECTED` HTTP 409 pada planner; hapus atau perbaiki sebelum melanjutkan.
PDF scan yang lolos pemeriksaan dapat berstatus ready dengan `OCR_REQUIRED` dan
teks kosong; catatan manual tetap dapat dipakai. Tidak ada OCR otomatis. Worker
memeriksa status dan versi pemrosesan sebelum menulis hasil. Parser tidak menerima
environment secrets.

Upload maksimal 30/akun/jam, vision 10/akun/jam; vision satu panggilan tanpa retry,
usage dicatat. Vision memerlukan tindakan eksplisit dan dapat menagih provider.
`VISION_UNAVAILABLE` HTTP 409 pada mock/model kosong. `REFERENCE_LIMIT`,
`REFERENCE_TOO_LARGE`, `ACCOUNT_STORAGE_LIMIT` HTTP 413; `VERSION_CONFLICT` HTTP 409. Perubahan saat generasi aktif ditolak. Restore revisi menggunakan ID dan
metadata lampiran proyek sendiri; preset tidak membawa blob. Regenerasi/resume
memakai snapshot asal, termasuk skill/konfigurasi/referensi.

Snapshot konteks dan manifest mencatat rekomendasi `loading` berdasarkan jenis
website/rendering. Aturan lazy/skeleton bersifat kondisional; dokumen relevan
memuat aturan hero/LCP, batas async, aksesibilitas, dan pengukuran. Lihat
`docs/LOADING_STRATEGY.md`. Tidak menambah jumlah entri katalog atau ZIP.

## SaaS

| Endpoint                                             | Kontrak                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /api/pricing`                                   | Katalog paket, harga null jika belum diatur, kesiapan pembayaran                                 |
| `GET /api/public-config`                             | Mode mock, site key publik Turnstile dan kesiapan pendaftaran                                    |
| `GET /api/account`                                   | Profil dan entitlement: limit, used, remaining, resetsAt, activeUntil, fitur                     |
| `PATCH /api/account`                                 | `{name?,renewalReminders?}`                                                                      |
| `GET /api/billing`                                   | Paket, entitlement, 30 tagihan terakhir, interval sudah dibayar                                  |
| `POST /api/billing/quote`                            | `{planId,code?}`; quote bertanda tangan, subtotal/diskon/total dan expiry lima menit             |
| `POST /api/billing/checkout`                         | `{planId,quote?}` + Idempotency-Key; UI wajib mengirim quote yang ditinjau, 201 `{payment:{id}}` |
| `GET /api/billing/:id`                               | Invoice milik sendiri, status DB, QR data URL jika masih berlaku                                 |
| `POST /api/billing/duitku/callback`                  | Tanpa sesi/Origin; form-urlencoded, HMAC dan validasi merchant/order/amount/method/reference     |
| `GET /api/presets`                                   | Plus/Max; hingga 50 preset sendiri                                                               |
| `POST /api/presets`                                  | Plus/Max; `{name,webType,brief,preferences?}`; tanpa blob referensi                              |
| `DELETE /api/presets/:id`                            | Plus/Max; preset milik akun                                                                      |
| `GET /api/templates`                                 | Max; template sendiri                                                                            |
| `PUT /api/templates/:fileId`                         | Max; `{content}`, Markdown 10-32000 karakter, ID dari katalog                                    |
| `DELETE /api/templates/:fileId`                      | Max; kembali ke kerangka default                                                                 |
| `GET /api/projects/:id/revisions`                    | Plus/Max; versi brief tersimpan dan versi saat ini                                               |
| `POST /api/projects/:id/revisions`                   | Plus/Max; `{revisionId,briefVersion}`, pulihkan menjadi versi baru                               |
| `GET /api/projects/:id/history`                      | Plus/Max; hingga 50 hasil belum kedaluwarsa pada proyek sendiri                                  |
| `GET /api/jobs/:id/compare?with=:jobId&file=:fileId` | Plus/Max; dua hasil pada proyek sendiri, isi Markdown                                            |
| `PUT /api/jobs/:id/regenerate`                       | Plus/Max; `{fileIds:[]}`, preview dependency closure tanpa kuota                                 |
| `POST /api/jobs/:id/regenerate`                      | Plus/Max; `{fileIds:[]}` + Idempotency-Key; job baru, satu kuota                                 |
| `POST /api/jobs/:id/close`                           | Tutup proses failed/partial, refund sekali ke periode asal                                       |
| `GET /api/batch-ready`                               | Max; hingga 50 proyek dengan rencana siap                                                        |
| `POST /api/batch`                                    | Max; `{items:[{projectId,planVersion}]}` 1-10 + Idempotency-Key; reservasi atomik seluruh batch  |
| `GET /api/admin?page=1`                              | Operator; akun paginated, 30 tagihan/job terbaru, pemakaian AI, kesiapan                         |
| `POST /api/admin/payments/:id/reconcile`             | Operator; `{reason}` + reauth/Idempotency-Key; rekonsiliasi terbatasi, tanpa lunas manual        |

`GET /api/projects` kini menyertakan objek entitlement; `usage`/`limit` tetap alias
untuk jumlah periode saat ini. `GET /api/jobs/:id` menyertakan `expiresAt`,
`billingPlanId`, `sourceJobId`, dan `quotaRefundedAt`. Snapshot/kunci server tidak
pernah dikirim utuh. Peran admin tidak melewati pemeriksaan ownership dokumen.

Password recovery: `POST /api/auth/request-password-reset` dengan `{email,redirectTo}`;
Better Auth mengirim tautan. `POST /api/auth/reset-password` dengan
`{token,newPassword}` memakai token sekali pakai. Verifikasi ulang:
`POST /api/auth/send-verification-email` dengan `{email,callbackURL}`. Role signup
tidak dapat ditentukan klien. Jangan memakai tautan callback pembayaran atau query
browser untuk menentukan status lunas.

## Pengelolaan admin

`GET /api/admin/identity` mengembalikan role dan masa reauth sesi sendiri.
`POST /api/admin/reauth` menerima `{password,code?}`; TOTP wajib ketika aktif,
maksimal lima percobaan/lima menit. Hak mutasi berlaku lima menit pada sesi itu.
Semua mutasi admin berikut membutuhkan `Idempotency-Key` 8-128 karakter dan
`reason` 8-500 karakter. Key sama dengan payload berbeda menghasilkan 409.
Payload ketat; field tidak dikenal ditolak. Versi lama menghasilkan
`VERSION_CONFLICT` 409. Efek dan audit disimpan dalam transaksi yang sama.

| Endpoint                                     | Kontrak                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/users`                       | 20/halaman; `page,q,status,role,planId,verified,from,to`                                                    |
| `GET /api/admin/users/:id`                   | Ringkasan, sesi tanpa token, invoice/job dan grant/kredit terbatas; tanpa isi proyek                        |
| `POST /api/admin/users/:id/:action`          | `suspend`, `restore`, `sessions`, `access`, `credits`; `{version,reason,...}`                               |
| `POST /api/admin/users/:id/:action/:grantId` | `revoke-access` atau `revoke-credit`; `{version,reason}`                                                    |
| `GET /api/admin/staff`                       | Owner; staf dan undangan terbaru                                                                            |
| `POST /api/admin/staff`                      | Owner; `{email,reason}`; undangan sekali pakai melalui antrean email                                        |
| `POST /api/admin/staff/:id/revoke`           | Owner; cabut undangan pending                                                                               |
| `POST /api/admin/staff/:userId/role`         | Owner; `{version,role,reason}`; cabut sesi, proteksi owner terakhir                                         |
| `POST /api/account/invitations/accept`       | Akun terverifikasi/MFA sesuai deployment; `{token}`; email harus cocok, sesi dicabut                        |
| `GET /api/admin/plans`                       | Empat paket aktif serta riwayat versi/draft                                                                 |
| `POST /api/admin/plans/:planId/draft`        | `{version,value,reason}`; harga, kuota, retensi, prioritas, plannerLimit dan features                       |
| `POST /api/admin/plans/:planId/publish`      | `{version,draftId,reason}`; hanya draft dengan baseVersion masih berlaku                                    |
| `GET /api/admin/vouchers`                    | 20/halaman; `q,status,page`; konsumsi/reservasi aktif                                                       |
| `GET /api/admin/vouchers/:id`                | Aturan, riwayat immutable, 100 redemption terbaru                                                           |
| `POST /api/admin/vouchers`                   | `{value,reason}`; kode unik uppercase, periode, syarat, batas global/per akun                               |
| `PATCH /api/admin/vouchers/:id`              | `{version,value,reason}`; kode tetap, arsip permanen, batas tidak di bawah penggunaan                       |
| `GET /api/admin/payments`                    | 20/halaman; `q,status,planId,voucher,from,to,page`                                                          |
| `GET /api/admin/payments/:id`                | Snapshot nominal/manfaat, receipt, callback terpilih dan timeline audit                                     |
| `GET /api/admin/refunds`                     | 20/halaman; status dan pencarian                                                                            |
| `POST /api/admin/refunds`                    | `{paymentId,reason}`; refund penuh untuk invoice paid                                                       |
| `POST /api/admin/refunds/:id`                | Owner; `{version,status,merchantReference?,evidence?,reason}`; transisi ketat, tanpa transfer dana otomatis |
| `GET /api/admin/jobs`                        | 20/halaman; `q,status,page`, lease/kuota/progres                                                            |
| `POST /api/admin/jobs/:id/cancel`            | `{reason}`; pembatalan dan refund sebelum AI sesuai ledger asal                                             |
| `POST /api/admin/jobs/:id/resume`            | `{reason}`; snapshot/reservasi asal, satu job eksekusi per akun                                             |
| `GET /api/admin/ai`                          | Penggunaan per akun/model/job dan tarif versi; `q,model,from,to,page`                                       |
| `GET /api/admin/audit`                       | 20/halaman; actor/target/action/alasan/requestId, before/after disunting dari secret                        |
| `GET /api/admin/privacy`                     | 20/halaman; status dan pencarian                                                                            |
| `GET /api/admin/settings`                    | Pengaturan situs, kontrol efektif, batas environment dan 100 revisi terakhir                                |
| `POST /api/admin/settings/site`              | `{version,value,reason}`; pengumuman/kontak/FAQ/tambahan legal sebagai teks                                 |
| `POST /api/admin/settings/controls`          | Owner; `{version,value,reason}`; jeda layanan, cap AI, tarif, batas grant admin                             |
| `GET /api/admin/content`                     | Katalog siap, versi konten, checksum/sumber/lisensi                                                         |
| `POST /api/admin/content`                    | `{kind,key,content,source,license,reason}`; draft baru, key katalog yang diizinkan                          |
| `POST /api/admin/content/:id/:action`        | `review`, `publish`, `unpublish`; `{version,reason}`; publish versi reviewed lama untuk rollback            |
| `GET /api/admin/reports`                     | Agregat UTC; `from,to`, maksimum 366 hari                                                                   |
| `POST /api/admin/reports/export`             | `{reason}`, `from,to` di query; CSV no-store, maksimum 31 hari/1.000 invoice                                |

Restore pengaturan mengirim ulang nilai revisi lama sebagai perubahan versi baru.
Pengaturan tidak dapat menaikkan cap di atas environment. AI tanpa tarif/usage
yang diketahui ditandai; agregat estimasi bukan tagihan provider.
Legacy `PATCH /api/admin/plans/:id` dan `PATCH /api/admin/data-requests/:id`
tidak lagi tersedia. Prosedur dan batas operasional ada di `ADMIN_GUIDE.md`.

## Bantuan

`GET /api/support` memberi 20 tiket sendiri per halaman; `GET /api/support/:id`
memberi detail dan 20 pesan publik per halaman, `messagesPage=1` membuka pesan
terbaru dalam urutan baca kronologis. `messageTotal` tidak menghitung catatan
internal untuk pengguna. `POST /api/support` menerima
`{subject,message}`, `POST /api/support/:id` menerima `{message}`. Keduanya
memerlukan Idempotency-Key, ownership dan rate limit. Tiket closed tidak menerima
balasan pengguna. Tidak tersedia upload lampiran atau HTML pesan.

Operator memakai `GET /api/admin/support` dan `GET /api/admin/support/:id`.
`POST /api/admin/support/:id` menerima
`{version,status,priority,assignedTo,message?,internal,reason}` dengan reauth
dan Idempotency-Key. Catatan internal tidak dikirim ke API pengguna.
