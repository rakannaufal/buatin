# Spesifikasi Upload File — {{projectName}}

> Dokumen ini mendefinisikan spesifikasi upload file termasuk tipe yang diizinkan, batasan ukuran, penyimpanan, validasi, dan keamanan untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Tipe File yang Diizinkan

### Gambar

| Format | MIME Type       | Max Size | Use Case                          |
| ------ | --------------- | -------- | --------------------------------- |
| JPEG   | `image/jpeg`    | 5 MB     | Foto produk, avatar, konten       |
| PNG    | `image/png`     | 5 MB     | Screenshot, ikon, grafik          |
| WebP   | `image/webp`    | 5 MB     | Gambar optimized                  |
| SVG    | `image/svg+xml` | 1 MB     | Logo, ikon (hanya trusted source) |
| GIF    | `image/gif`     | 10 MB    | Animasi                           |

### Dokumen

| Format | MIME Type                                                                 | Max Size | Use Case         |
| ------ | ------------------------------------------------------------------------- | -------- | ---------------- |
| PDF    | `application/pdf`                                                         | 10 MB    | Dokumen, invoice |
| DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 10 MB    | Dokumen          |
| XLSX   | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`       | 10 MB    | Spreadsheet      |
| CSV    | `text/csv`                                                                | 5 MB     | Data import      |

### Video (jika diperlukan)

| Format | MIME Type    | Max Size | Use Case     |
| ------ | ------------ | -------- | ------------ |
| MP4    | `video/mp4`  | 100 MB   | Video konten |
| WebM   | `video/webm` | 100 MB   | Video web    |

---

## Batasan & Konfigurasi

| Aspek                       | Nilai                      | Keterangan                          |
| --------------------------- | -------------------------- | ----------------------------------- |
| **Max file size (default)** | 10 MB                      | Per file                            |
| **Max file size (gambar)**  | 5 MB                       | Per file                            |
| **Max file size (video)**   | 100 MB                     | Per file                            |
| **Max files per request**   | 10                         | Batch upload                        |
| **Max total per request**   | 50 MB                      | Total semua file dalam 1 request    |
| **Max storage per user**    | 500 MB                     | Quota per akun (sesuaikan per plan) |
| **Filename max length**     | 255 karakter               | —                                   |
| **Allowed characters**      | Alfanumerik, `-`, `_`, `.` | Karakter lain di-strip              |

{{#if isSaas}}

### Quota per Plan

| Plan       | Storage | Max File Size | Fitur              |
| ---------- | ------- | ------------- | ------------------ |
| Free       | 100 MB  | 5 MB          | Gambar saja        |
| Pro        | 5 GB    | 50 MB         | Semua tipe         |
| Enterprise | 50 GB   | 100 MB        | Semua tipe + video |

{{/if}}

---

## Arsitektur Upload

### Flow Upload

```
Client
  │
  ├─ Validasi client-side (tipe, ukuran)
  │
  ├─ POST /api/v1/uploads (multipart/form-data)
  │
Server
  │
  ├─ Auth check
  ├─ Rate limit check
  ├─ Quota check
  ├─ File validation:
  │   ├─ MIME type check (magic bytes, bukan extension)
  │   ├─ File size check
  │   ├─ Filename sanitize
  │   └─ Content scan (malware)
  │
  ├─ Processing:
  │   ├─ Generate UUID filename
  │   ├─ Image resize/optimize (jika gambar)
  │   └─ Generate thumbnails (jika gambar)
  │
  ├─ Storage:
  │   ├─ Upload ke object storage (S3/R2)
  │   └─ Simpan metadata ke database
  │
  └─ Response: file ID, URL, metadata
```

### Presigned Upload (File Besar)

Untuk file besar (>10 MB), gunakan presigned URL:

```
1. Client request presigned URL → POST /api/v1/uploads/presign
2. Server validasi & generate presigned URL
3. Client upload langsung ke storage (S3/R2)
4. Client konfirmasi → POST /api/v1/uploads/confirm
5. Server validasi file di storage & simpan metadata
```

---

## Validasi & Keamanan

### Validasi File

| Check               | Layer           | Detail                                     |
| ------------------- | --------------- | ------------------------------------------ |
| **Extension**       | Client + Server | Whitelist extension                        |
| **MIME Type**       | Server          | Cek magic bytes, bukan Content-Type header |
| **File Size**       | Client + Server | Double check di server                     |
| **Filename**        | Server          | Sanitize, strip path traversal             |
| **Content**         | Server          | Scan malware (ClamAV / VirusTotal API)     |
| **Image Dimension** | Server          | Max 10000x10000 px                         |
| **SVG Sanitize**    | Server          | Strip script tags, event handlers          |

### Keamanan

| Ancaman               | Mitigasi                                                     |
| --------------------- | ------------------------------------------------------------ |
| **Malware Upload**    | Scan antivirus sebelum simpan                                |
| **Path Traversal**    | UUID filename, jangan pakai nama asli                        |
| **XSS via SVG**       | Sanitize SVG, serve dengan `Content-Disposition: attachment` |
| **SSRF**              | Jangan proses URL dari user tanpa validasi                   |
| **Zip Bomb**          | Limit decompression ratio                                    |
| **Storage Abuse**     | Quota per user, rate limiting                                |
| **Serving Malicious** | Serve dari domain terpisah (CDN), set CSP                    |

### Content-Type Headers saat Serving

```
Content-Type: image/jpeg  (sesuai tipe)
Content-Disposition: inline  (gambar) / attachment (dokumen)
X-Content-Type-Options: nosniff
Cache-Control: public, max-age=31536000, immutable
```

---

## Image Processing

### Resize & Thumbnail

| Variant     | Dimensi         | Quality | Use Case    |
| ----------- | --------------- | ------- | ----------- |
| `thumbnail` | 150×150 (crop)  | 80%     | List, grid  |
| `small`     | 300×300 (fit)   | 80%     | Card        |
| `medium`    | 800×800 (fit)   | 85%     | Detail page |
| `large`     | 1600×1600 (fit) | 90%     | Full view   |
| `original`  | As-is           | As-is   | Download    |

### Format Optimization

| Input | Output               | Strategi                        |
| ----- | -------------------- | ------------------------------- |
| JPEG  | WebP + JPEG fallback | Serve WebP jika browser support |
| PNG   | WebP + PNG fallback  | Serve WebP jika browser support |
| GIF   | As-is                | Tidak dikonversi                |

---

## Storage

### Struktur Path

```
{bucket}/
  uploads/
    {year}/
      {month}/
        {uuid}.{ext}
        {uuid}_thumb.{ext}
        {uuid}_small.{ext}
        {uuid}_medium.{ext}
```

### Konfigurasi Storage

| Aspek         | Detail                                             |
| ------------- | -------------------------------------------------- |
| **Provider**  | AWS S3 / Cloudflare R2 / Supabase Storage          |
| **Region**    | ap-southeast-1 (Singapore) — terdekat ke Indonesia |
| **ACL**       | Private (serve via signed URL atau CDN)            |
| **Lifecycle** | Hapus orphan files setelah 30 hari                 |
| **Backup**    | Cross-region replication (production)              |
| **CDN**       | Cloudflare / CloudFront di depan storage           |

---

## Cleanup & Lifecycle

| Skenario                         | Aksi                                    | Trigger               |
| -------------------------------- | --------------------------------------- | --------------------- |
| File upload tapi tidak di-attach | Hapus setelah 24 jam                    | Cron job              |
| User hapus konten yang ada file  | Soft delete file, hapus setelah 30 hari | Event handler         |
| User hapus akun                  | Hapus semua file user                   | Account deletion flow |
| Quota exceeded                   | Tolak upload baru                       | Upload endpoint       |

---

## Environment Variables

| Variable             | Deskripsi               |
| -------------------- | ----------------------- |
| `STORAGE_PROVIDER`   | s3/r2/supabase          |
| `STORAGE_BUCKET`     | Nama bucket             |
| `STORAGE_REGION`     | Region                  |
| `STORAGE_ACCESS_KEY` | Access key              |
| `STORAGE_SECRET_KEY` | Secret key              |
| `STORAGE_CDN_URL`    | Base URL CDN            |
| `MAX_FILE_SIZE`      | Max upload size (bytes) |
| `CLAMAV_HOST`        | Host antivirus scanner  |

---

> Implementasi upload harus diuji dengan berbagai tipe file dan edge case sebelum deployment **{{projectName}}**.
