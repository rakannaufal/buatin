# Spesifikasi Autentikasi — {{projectName}}

> Dokumen ini mendefinisikan strategi autentikasi, otorisasi, dan manajemen sesi untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Metode Autentikasi

### Email & Password (Primary)

| Aspek                  | Detail                                                |
| ---------------------- | ----------------------------------------------------- |
| **Registrasi**         | Email + password + nama                               |
| **Login**              | Email + password                                      |
| **Password Hashing**   | bcrypt (cost factor 12)                               |
| **Password Policy**    | Min 8 karakter, kombinasi huruf besar + kecil + angka |
| **Email Verification** | Wajib — link verifikasi dikirim saat registrasi       |
| **Password Reset**     | Via email — token valid 1 jam                         |

### Social Login

| Provider | Status                                                 | Data yang Diambil        |
| -------- | ------------------------------------------------------ | ------------------------ |
| Google   | {{#if hasAuth}}Direkomendasikan{{else}}Opsional{{/if}} | Email, nama, foto profil |
| GitHub   | Opsional                                               | Email, nama, avatar      |
| Apple    | Opsional (iOS)                                         | Email, nama              |

**Flow OAuth 2.0:**

1. User klik "Login dengan Google"
2. Redirect ke Google OAuth consent screen
3. User approve → redirect ke callback URL
4. Server tukar authorization code → access token
5. Server ambil profil user dari Google
6. Buat/link akun → generate session token

### Multi-Factor Authentication (MFA)

| Aspek             | Detail                                                       |
| ----------------- | ------------------------------------------------------------ |
| **Metode**        | TOTP (Google Authenticator / Authy)                          |
| **Kapan Diminta** | Setiap login setelah email + password berhasil               |
| **Recovery**      | Backup codes (8 kode sekali pakai)                           |
| **Enforcement**   | Opsional untuk user biasa, wajib untuk admin                 |
| **Setup Flow**    | Generate secret → tampilkan QR → user scan → verifikasi kode |

---

## Manajemen Token & Sesi

### Token Strategy

| Aspek                 | Detail                                                   |
| --------------------- | -------------------------------------------------------- |
| **Tipe**              | JWT (access token) + opaque (refresh token)              |
| **Access Token TTL**  | 15 menit                                                 |
| **Refresh Token TTL** | 7 hari (30 hari jika "Remember me")                      |
| **Storage (Client)**  | Access token di memory, refresh token di httpOnly cookie |
| **Token Refresh**     | Silent refresh sebelum access token expired              |
| **Token Revocation**  | Logout menghapus refresh token dari server               |

### JWT Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "member",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Session Security

| Aspek                   | Detail                                        |
| ----------------------- | --------------------------------------------- |
| **Concurrent Sessions** | Maksimal 5 device aktif                       |
| **Session List**        | User bisa melihat semua sesi aktif            |
| **Remote Logout**       | User bisa logout sesi lain                    |
| **Inactivity Timeout**  | 30 menit tanpa aktivitas                      |
| **IP Binding**          | Opsional — peringatan jika IP berubah drastis |
| **Device Fingerprint**  | User-agent + IP untuk deteksi anomali         |

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

| Role          | Level | Deskripsi                     |
| ------------- | ----- | ----------------------------- |
| `super_admin` | 100   | Akses penuh ke seluruh sistem |
| `admin`       | 80    | Manajemen data dan user       |
| `editor`      | 60    | Buat dan edit konten          |
| `member`      | 40    | Akses fitur standar           |
| `viewer`      | 20    | Hanya baca                    |
| `guest`       | 0     | Akses publik saja             |

### Permission Matrix

| Resource         | Viewer  | Member  | Editor  | Admin          | Super Admin |
| ---------------- | ------- | ------- | ------- | -------------- | ----------- |
| Profil sendiri   | ✅ Read | ✅ CRUD | ✅ CRUD | ✅ CRUD        | ✅ CRUD     |
| Profil user lain | ❌      | ❌      | ❌      | ✅ Read/Update | ✅ CRUD     |
{{#if isEcommerce}}
| Produk | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| Order sendiri | ❌ | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD |
| Semua order | ❌ | ❌ | ❌ | ✅ CRUD | ✅ CRUD |
{{/if}}
{{#if hasCms}}
| Post (published) | ✅ Read | ✅ Read | ✅ CRUD | ✅ CRUD | ✅ CRUD |
| Post (draft) | ❌ | ❌ | ✅ CRUD | ✅ CRUD | ✅ CRUD |
{{/if}}
{{#if hasAdmin}}
| Admin dashboard | ❌ | ❌ | ❌ | ✅ Read | ✅ CRUD |
| System settings | ❌ | ❌ | ❌ | ❌ | ✅ CRUD |
| Audit logs | ❌ | ❌ | ❌ | ✅ Read | ✅ Read |
{{/if}}

---

## Keamanan

### Proteksi Serangan

| Serangan                | Mitigasi                                                       |
| ----------------------- | -------------------------------------------------------------- |
| **Brute Force**         | Rate limit login (10x/15min), account lockout setelah 5x gagal |
| **CSRF**                | CSRF token untuk form, SameSite cookie                         |
| **XSS**                 | httpOnly cookie, CSP header, sanitize input                    |
| **Session Hijacking**   | Secure + httpOnly cookie, token rotation                       |
| **Token Theft**         | Short-lived access token, refresh token rotation               |
| **SQL Injection**       | Parameterized queries, ORM                                     |
| **Credential Stuffing** | Rate limiting, CAPTCHA setelah 3x gagal                        |

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

### Password Storage

| Aspek           | Detail                                        |
| --------------- | --------------------------------------------- |
| **Algorithm**   | bcrypt                                        |
| **Cost Factor** | 12 (adjust sesuai hardware)                   |
| **Salt**        | Auto-generated per password (built-in bcrypt) |
| **Pepper**      | Server-side secret (environment variable)     |
| **Migration**   | Rehash saat login jika cost factor berubah    |

---

## Flow Diagram

### Login Flow

```
User → [Email + Password] → Server
  ├─ Invalid → 401 + increment attempt counter
  ├─ Locked → 403 + show lockout duration
  └─ Valid
      ├─ MFA enabled → [Require TOTP code]
      │   ├─ Invalid → 401
      │   └─ Valid → Generate tokens → 200
      └─ MFA disabled → Generate tokens → 200
```

### Token Refresh Flow

```
Client → [Refresh Token in Cookie] → Server
  ├─ Token expired/invalid → 401 → Redirect to login
  └─ Token valid
      ├─ Rotate refresh token
      ├─ Generate new access token
      └─ 200 + new tokens
```

---

## Implementasi

### Middleware Stack

```
Request
  → Rate Limiter
  → CORS Check
  → Auth Token Extraction
  → Token Validation
  → Role/Permission Check
  → Route Handler
  → Response
```

### Environment Variables

| Variable                   | Deskripsi                  |
| -------------------------- | -------------------------- |
| `JWT_SECRET`               | Secret key untuk sign JWT  |
| `JWT_EXPIRES_IN`           | TTL access token           |
| `REFRESH_TOKEN_EXPIRES_IN` | TTL refresh token          |
| `BCRYPT_ROUNDS`            | Cost factor bcrypt         |
| `PASSWORD_PEPPER`          | Server-side pepper         |
| `GOOGLE_CLIENT_ID`         | Google OAuth client ID     |
| `GOOGLE_CLIENT_SECRET`     | Google OAuth client secret |
| `MFA_ISSUER`               | Nama issuer untuk TOTP     |

---

> Implementasi autentikasi harus di-audit keamanannya sebelum launch **{{projectName}}**.
