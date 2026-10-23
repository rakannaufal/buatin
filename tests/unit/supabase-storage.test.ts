import { afterEach, expect, it, vi } from "vitest";
import {
  assertPrivateSupabaseBucket,
  supabaseStorageConfigured,
  getSupabaseReference,
  putSupabaseReference,
} from "../../src/server/supabase-storage";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function configure() {
  vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_fixture_only");
}
it("rejects publishable keys, arbitrary hosts, credentials and insecure endpoints", () => {
  configure();
  expect(supabaseStorageConfigured()).toBe(true);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_fixture_only");
  expect(supabaseStorageConfigured()).toBe(false);
  configure();
  for (const url of [
    "http://abcdefghijklmnopqrst.supabase.co",
    "https://other.example",
    "https://user:pass@abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co/path",
  ]) {
    vi.stubEnv("SUPABASE_URL", url);
    expect(supabaseStorageConfigured()).toBe(false);
  }
});
it("refuses public or malformed buckets before writing, never returns provider error bodies", async () => {
  configure();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ public: true })));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    putSupabaseReference(`${crypto.randomUUID()}.blob`, Buffer.from("fixture")),
  ).rejects.toMatchObject({ code: "UNSAFE_STORAGE" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockResolvedValue(
    new Response("sensitive upstream detail", { status: 403 }),
  );
  await expect(assertPrivateSupabaseBucket()).rejects.toMatchObject({
    code: "STORAGE_REQUEST_FAILED",
  });
});
it("bounds downloads even when Content-Length is absent", async () => {
  configure();
  vi.stubEnv("MAX_REFERENCE_DOCUMENT_BYTES", "1024");
  vi.stubEnv("MAX_REFERENCE_IMAGE_BYTES", "1024");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(new Uint8Array(2048))),
  );
  await expect(
    getSupabaseReference(`${crypto.randomUUID()}.blob`),
  ).rejects.toMatchObject({ code: "REFERENCE_TOO_LARGE" });
});
