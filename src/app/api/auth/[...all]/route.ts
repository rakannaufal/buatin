import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { verifyChallenge } from "@/server/challenge";
import { AppError } from "@/server/errors";
import { db } from "@/server/db";
import { assertServiceOpen } from "@/server/admin/policies";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (pathname.endsWith("/sign-up/email")) {
    try {
      await assertServiceOpen("Signup");
    } catch (error) {
      return Response.json(
        {
          message:
            error instanceof AppError
              ? error.publicMessage
              : "Pendaftaran belum tersedia.",
        },
        { status: 503 },
      );
    }
  }
  const enrollment = pathname.endsWith("/two-factor/verify-totp")
    ? await auth.api.getSession({ headers: request.headers })
    : null;
  if (
    [
      "/sign-up/email",
      "/request-password-reset",
      "/send-verification-email",
    ].some((path) => pathname.endsWith(path))
  ) {
    try {
      const clone = request.clone();
      const reader = clone.body?.getReader();
      let bytes = 0;
      if (reader)
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 16384) {
            await reader.cancel();
            return Response.json(
              { message: "Permintaan terlalu besar." },
              { status: 413 },
            );
          }
        }
      await verifyChallenge(request.headers.get("x-turnstile-token"));
    } catch (error) {
      return Response.json(
        {
          message:
            error instanceof AppError
              ? error.publicMessage
              : "Verifikasi gagal.",
        },
        { status: error instanceof AppError ? error.status : 400 },
      );
    }
  }
  const response = await handlers.POST(request);
  if (response.ok && enrollment && !enrollment.user.twoFactorEnabled) {
    const cookies = new Map(
      (request.headers.get("cookie") ?? "").split(";").map((part) => {
        const [key, ...value] = part.trim().split("=");
        return [key, value.join("=")];
      }),
    );
    for (const value of response.headers.getSetCookie()) {
      const [key, ...data] = value.split(";")[0].split("=");
      cookies.set(key, data.join("="));
    }
    const verified = await auth.api.getSession({
      headers: new Headers({
        cookie: [...cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      }),
    });
    if (
      !verified?.user.twoFactorEnabled ||
      verified.user.id !== enrollment.user.id
    ) {
      await db.session.deleteMany({ where: { userId: enrollment.user.id } });
      return Response.json(
        { message: "Masuk kembali setelah mengaktifkan dua faktor." },
        { status: 401 },
      );
    }
    await db.session.deleteMany({
      where: { userId: verified.user.id, id: { not: verified.session.id } },
    });
    await db.auditEvent.create({
      data: { userId: verified.user.id, action: "account.two_factor.enabled" },
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const dynamic = "force-dynamic";
