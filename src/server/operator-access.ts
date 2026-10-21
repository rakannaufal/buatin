import { getEnv } from "./config";
import { localApp } from "./challenge";
import { AppError } from "./errors";
export function operatorMfaRequired() {
  return !localApp() && getEnv().ADMIN_REQUIRE_2FA === "true";
}
export function checkOperatorMfa(user: { twoFactorEnabled?: boolean | null }) {
  if (operatorMfaRequired() && !user.twoFactorEnabled)
    throw new AppError(
      "ADMIN_2FA_REQUIRED",
      403,
      "Aktifkan autentikasi dua faktor pada halaman Akun untuk membuka pengaturan operator.",
    );
}
