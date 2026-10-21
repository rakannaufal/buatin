import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { verifyChallenge } from "@/server/challenge";
import { AppError } from "@/server/errors";
import { db } from "@/server/db";
import { assertServiceOpen } from "@/server/admin/policies";
import { googleAuthReady } from "@/server/google-auth";
import { getEnv } from "@/server/config";
import { z } from "zod";
const handlers = toNextJsHandler(auth);
export async function GET(request: Request) {
  const response = await handlers.GET(request);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function POST(request: Request) {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname)
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");
  } catch {
    return Response.json({ message: "URL tidak valid." }, { status: 400 });
  }
  const social = pathname.endsWith("/sign-in/social");
  if (social) {
    if (request.headers.get("origin") !== getEnv().APP_URL)
      return Response.json(
        { message: "Origin tidak diizinkan." },
        { status: 403 },
      );
    if (!googleAuthReady())
      return Response.json(
        { message: "Login Google belum diaktifkan pengelola." },
        { status: 503 },
      );
  }
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
      "/sign-in/social",
    ].some((path) => pathname.endsWith(path))
  ) {
    try {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (reader)
        try {
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
            chunks.push(next.value);
          }
        } finally {
          reader.releaseLock();
        }
      const payload = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks),
      );
      request = new Request(request, { body: payload });
      if (social) {
        const input = z
          .object({
            provider: z.literal("google"),
            callbackURL: z.literal("/dashboard"),
            errorCallbackURL: z.literal("/login"),
            disableRedirect: z.literal(true),
          })
          .strict()
          .safeParse(JSON.parse(payload));
        if (!input.success)
          return Response.json(
            { message: "Permintaan login Google tidak valid." },
            { status: 400 },
          );
      }
      await verifyChallenge(request.headers.get("x-turnstile-token"), !social);
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
