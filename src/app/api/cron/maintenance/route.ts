import { createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/server/config";
import { requestMaintenance } from "@/server/request-maintenance";
import { assertRuntimeConfiguration } from "@/server/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const reply = (value: unknown, status: number) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  const env = getEnv();
  if (env.CRON_SECRET.length < 32 || env.PROCESSING_MODE !== "request")
    return reply({ ok: false }, 503);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (
    !timingSafeEqual(
      digest(request.headers.get("authorization") ?? ""),
      digest(`Bearer ${env.CRON_SECRET}`),
    )
  )
    return reply({ ok: false }, 401);
  try {
    assertRuntimeConfiguration();
    const result = await requestMaintenance();
    return reply({ ok: true, ...result }, 200);
  } catch {
    console.error(JSON.stringify({ event: "maintenance.request.failed" }));
    return reply({ ok: false }, 503);
  }
}
// Next otherwise aliases HEAD to GET; a probe must never trigger retention.
export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
