export function googleLoginError(code?: string) {
  if (!code) return "";
  if (code === "credential_login_required")
    return "Akun ini memakai perlindungan tambahan. Masuk dengan email, password dan autentikator. Akun Google tanpa password dapat membuatnya lewat Lupa password.";
  if (code === "account_not_linked")
    return "Email sudah terdaftar. Verifikasi email akun terlebih dahulu, lalu coba Google kembali.";
  if (code === "signup_paused")
    return "Pendaftaran akun baru sedang dijeda. Pengguna terdaftar tetap dapat masuk.";
  if (code === "email_not_verified")
    return "Google belum memverifikasi email Anda. Verifikasi email Google lalu coba kembali.";
  if (code === "account_unavailable")
    return "Akses akun dibatasi. Hubungi bantuan untuk peninjauan.";
  if (code === "access_denied")
    return "Login Google dibatalkan. Coba kembali atau masuk dengan email.";
  return "Login Google belum berhasil atau sesi berakhir. Coba kembali dari halaman ini.";
}
