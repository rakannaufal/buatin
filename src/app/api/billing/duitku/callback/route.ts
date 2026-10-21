import { receiveCallback } from "@/server/billing";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    if (
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      return new Response("Unsupported content type", { status: 415 });
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader)
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 16384) {
          await reader.cancel();
          return new Response("Payload too large", { status: 413 });
        }
        chunks.push(next.value);
      }
    const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    for (const key of form.keys())
      if (form.getAll(key).length > 1)
        return new Response("Duplicate field", { status: 400 });
    await receiveCallback(Object.fromEntries(form));
    return new Response("OK", { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(
      error instanceof AppError ? error.code : "INVALID_CALLBACK",
      { status: error instanceof AppError ? error.status : 400 },
    );
  }
}
