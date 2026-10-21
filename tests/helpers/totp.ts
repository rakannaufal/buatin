import { base32 } from "@better-auth/utils/base32";
import { auth } from "../../src/server/auth";

export async function authenticatorCode(uri: string) {
  const encoded = new URL(uri).searchParams.get("secret");
  if (!encoded) throw new Error("Fixture TOTP URI has no secret");
  // Authenticator URIs use Base32; BetterAuth's server helper takes raw text.
  const secret = new TextDecoder().decode(base32.decode(encoded));
  return (await auth.api.generateTOTP({ body: { secret } })).code;
}
