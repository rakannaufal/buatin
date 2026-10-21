# Auth

## Peran dan akses

Buat matriks peran/resource/aksi serta aturan ownership. Gunakan solusi auth terpelihara; jangan membuat kriptografi atau penyimpanan password sendiri.

## Siklus akun dan sesi

Jelaskan signup, verifikasi email, login/logout, reset password, session expiry/revocation serta perubahan data sensitif. Gunakan cookie secure/httpOnly/sameSite dan Origin/CSRF; token tidak disimpan pada storage browser yang tidak aman.

## Perlindungan akses

Rate limit login/recovery, cegah enumeration dan atur challenge hanya bila perlu. Akun operator publik memerlukan MFA, kode pemulihan privat dan prosedur kehilangan perangkat. Semua izin ditegakkan server.

## Verifikasi

Uji kredensial salah, akun belum diverifikasi, MFA salah/replay, session fixation, reset yang mencabut sesi lama, akun lain, role rendah, cookie dan trusted proxy pada staging.
