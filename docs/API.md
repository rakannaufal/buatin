# API aplikasi

Semua `/api/*` selain health, pricing, public-config, callback Duitku, dan endpoint auth membutuhkan sesi akun dengan email terverifikasi. Endpoint admin/settings memerlukan role owner/admin serta MFA aktif pada domain publik. Mutasi membutuhkan `Origin` tepat sama dengan `APP_URL`. Session memakai cookie Better Auth; jangan menyimpan password/token dalam browser storage. Respons privat memakai `Cache-Control: private, no-store`.

| Endpoint                                   | Isi / hasil                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| `GET /api/health/live`                     | Liveness `{ok:true}`; hanya proses web                |
| `GET /api/health/ready`                    | Database/migration dan worker; 200 atau 503 `{ok}`    |
| `GET /api/health`                          | Alias readiness, tanpa detail koneksi                 |
| `GET /api/session`                         | Identitas, role, mode mock                            |
| `GET /api/projects?page=1`                 | 20 proyek/halaman, total, kuota, heartbeat            |
| `POST /api/projects`                       | `{name,webType,brief,preferences?}`; 201 `{project}`  |
| `GET /api/projects/:id`                    | Brief, versi, plan terakhir, task, job                |
| `PATCH /api/projects/:id`                  | `{briefVersion,name?,brief?,webType?,preferences?}`   |
| `DELETE /api/projects/:id`                 | Purge data; 409 bila proses masih aktif               |
| `POST /api/projects/:id/imports`           | `{name,content,mode:"append"                          | "replace",briefVersion}`; hanya UTF-8 `.md/.txt` |
| `POST /api/projects/:id/plans`             | `{briefVersion}`; 202 `{task}`                        |
| `GET /api/planning-tasks/:id`              | Status task dan kode error                            |
| `POST /api/projects/:id/clarification`     | `{briefVersion,answers:[]}`; satu putaran             |
| `GET /api/projects/:id/plan`               | `{plan:{version,data},status}`                        |
| `PATCH /api/projects/:id/plan`             | `{version,fileId,include}`; versi baru immutable      |
| `POST /api/projects/:id/jobs`              | `{planVersion}` + `Idempotency-Key`; 202 `{job:{id}}` |
| `GET /api/jobs/:id`                        | Status, progres, metadata file; tanpa konten penuh    |
| `POST /api/jobs/:id/cancel`                | `{}`; pembatalan persisten                            |
| `POST /api/jobs/:id/resume`                | `{}` + `Idempotency-Key`; file belum sukses           |
| `GET /api/jobs/:id/files`                  | Metadata hasil, lint dan manifest                     |
| `GET /api/jobs/:id/files/:fileId`          | `{file:{content,path,...}}`                           |
| `GET /api/jobs/:id/files/:fileId/download` | Attachment Markdown aman                              |
| `GET /api/jobs/:id/download`               | ZIP + manifest; 409 jika berbahaya/rujukan putus      |
| `GET /api/settings`                        | Batas, model, heartbeat; tanpa key atau URL internal  |
| `PATCH /api/settings`                      | `{planner,writer}`; model wajib lolos health check    |
| `POST /api/settings/llm-check`             | Daftar model tersedia; owner, rate limit              |

## Keamanan akun dan operasi

| Endpoint                             | Kontrak                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/account/sessions`          | Maksimal 50 sesi aktif sendiri; ID, waktu, user-agent, `current`; tanpa token                                              |
| `DELETE /api/account/sessions/:id`   | Cabut sesi sendiri; `{ok,current}`; keluar jika `current=true`                                                             |
| `GET /api/account/data-requests`     | Maksimal 20 permintaan sendiri, terbaru dahulu                                                                             |
| `POST /api/account/data-requests`    | `{kind:"export" atau "deletion",confirmation:emailAkun}`; 202 `{request:{id,kind,status}}`; maksimal tiga/hari             |
| `GET /api/admin/operations`          | Operator; `{checks,runtime,dataRequests}`; prioritas, antrean/disk/AI dan maksimal 30 permintaan terbuka                   |
| `PATCH /api/admin/data-requests/:id` | Operator; `{status:"processing" atau "completed" atau "rejected"}`; perubahan diaudit, status terminal tidak dapat ditimpa |

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

| Endpoint                                             | Kontrak                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/pricing`                                   | Katalog paket, harga null jika belum diatur, kesiapan pembayaran                                |
| `GET /api/public-config`                             | Mode mock, site key publik Turnstile dan kesiapan pendaftaran                                   |
| `GET /api/account`                                   | Profil dan entitlement: limit, used, remaining, resetsAt, activeUntil, fitur                    |
| `PATCH /api/account`                                 | `{name?,renewalReminders?}`                                                                     |
| `GET /api/billing`                                   | Paket, entitlement, 30 tagihan terakhir, interval sudah dibayar                                 |
| `POST /api/billing/checkout`                         | `{planId:"starter"                                                                              | "plus" | "max"}`+ Idempotency-Key, 201`{payment:{id}}` |
| `GET /api/billing/:id`                               | Invoice milik sendiri, status DB, QR data URL jika masih berlaku                                |
| `POST /api/billing/duitku/callback`                  | Tanpa sesi/Origin; form-urlencoded, HMAC dan validasi merchant/order/amount/method/reference    |
| `GET /api/presets`                                   | Plus/Max; hingga 50 preset sendiri                                                              |
| `POST /api/presets`                                  | Plus/Max; `{name,webType,brief,preferences?}`; tanpa blob referensi                             |
| `DELETE /api/presets/:id`                            | Plus/Max; preset milik akun                                                                     |
| `GET /api/templates`                                 | Max; template sendiri                                                                           |
| `PUT /api/templates/:fileId`                         | Max; `{content}`, Markdown 10-32000 karakter, ID dari katalog                                   |
| `DELETE /api/templates/:fileId`                      | Max; kembali ke kerangka default                                                                |
| `GET /api/projects/:id/revisions`                    | Plus/Max; versi brief tersimpan dan versi saat ini                                              |
| `POST /api/projects/:id/revisions`                   | Plus/Max; `{revisionId,briefVersion}`, pulihkan menjadi versi baru                              |
| `GET /api/projects/:id/history`                      | Plus/Max; hingga 50 hasil belum kedaluwarsa pada proyek sendiri                                 |
| `GET /api/jobs/:id/compare?with=:jobId&file=:fileId` | Plus/Max; dua hasil pada proyek sendiri, isi Markdown                                           |
| `PUT /api/jobs/:id/regenerate`                       | Plus/Max; `{fileIds:[]}`, preview dependency closure tanpa kuota                                |
| `POST /api/jobs/:id/regenerate`                      | Plus/Max; `{fileIds:[]}` + Idempotency-Key; job baru, satu kuota                                |
| `POST /api/jobs/:id/close`                           | Tutup proses failed/partial, refund sekali ke periode asal                                      |
| `GET /api/batch-ready`                               | Max; hingga 50 proyek dengan rencana siap                                                       |
| `POST /api/batch`                                    | Max; `{items:[{projectId,planVersion}]}` 1-10 + Idempotency-Key; reservasi atomik seluruh batch |
| `GET /api/admin?page=1`                              | Operator; akun paginated, 30 tagihan/job terbaru, pemakaian AI, kesiapan                        |
| `PATCH /api/admin/plans/:planId`                     | Operator; `{monthlyPrice,available,weeklyQuota,retentionDays}`, harga IDR integer/null          |
| `POST /api/admin/payments/:id`                       | Operator; jadwalkan rekonsiliasi dengan backoff/rate limit, tidak dapat menandai lunas manual   |

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
