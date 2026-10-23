import { getEnv } from "./config";
import { AppError } from "./errors";

export function supabaseStorageConfigured() {
  const env = getEnv();
  try {
    const url = new URL(env.SUPABASE_URL);
    const secret = env.SUPABASE_SERVICE_ROLE_KEY;
    const serverKey =
      secret.startsWith("sb_secret_") ||
      (secret.startsWith("eyJ") &&
        JSON.parse(
          Buffer.from(secret.split(".")[1] ?? "", "base64url").toString("utf8"),
        ).role === "service_role");
    return (
      url.protocol === "https:" &&
      /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) &&
      url.origin === env.SUPABASE_URL &&
      serverKey
    );
  } catch {
    return false;
  }
}

async function request(path: string, options: RequestInit = {}) {
  if (!supabaseStorageConfigured())
    throw new AppError("STORAGE_UNCONFIGURED", 503);
  const env = getEnv();
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      ...(env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")
        ? { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
        : {}),
      ...options.headers,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new AppError(
      "STORAGE_REQUEST_FAILED",
      503,
      "Storage privat belum dapat diakses. Coba kembali.",
    );
  }
  return response;
}

async function bounded(response: Response, max: number) {
  if (Number(response.headers.get("Content-Length")) > max) {
    await response.body?.cancel();
    throw new AppError("REFERENCE_TOO_LARGE", 413);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new AppError("REFERENCE_MISSING", 404);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new AppError("REFERENCE_TOO_LARGE", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

// Check the actual bucket before every write. A public bucket must fail closed.
export async function assertPrivateSupabaseBucket() {
  const response = await request(`bucket/${getEnv().SUPABASE_STORAGE_BUCKET}`);
  const bucket: unknown = JSON.parse(
    (await bounded(response, 16384)).toString("utf8"),
  );
  if (
    !bucket ||
    typeof bucket !== "object" ||
    !("public" in bucket) ||
    bucket.public !== false
  )
    throw new AppError("UNSAFE_STORAGE", 503, "Bucket referensi harus privat.");
}

function objectPath(key: string) {
  if (!/^[a-f0-9-]{36}\.blob$/.test(key))
    throw new AppError("INVALID_STORAGE_KEY", 400);
  return `object/${getEnv().SUPABASE_STORAGE_BUCKET}/references/${key}`;
}
export async function putSupabaseReference(key: string, data: Buffer) {
  objectPath(key);
  await assertPrivateSupabaseBucket();
  const response = await request(objectPath(key), {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "x-upsert": "true" },
    body: new Uint8Array(data),
  });
  await response.body?.cancel();
}
export async function getSupabaseReference(key: string) {
  const response = await request(objectPath(key));
  return bounded(
    response,
    Math.max(
      getEnv().MAX_REFERENCE_IMAGE_BYTES,
      getEnv().MAX_REFERENCE_DOCUMENT_BYTES,
    ),
  );
}
export async function deleteSupabaseReference(key: string) {
  objectPath(key);
  const response = await request(`object/${getEnv().SUPABASE_STORAGE_BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [`references/${key}`] }),
  });
  await response.body?.cancel();
}
export async function listSupabaseReferences(offset: number) {
  const response = await request(
    `object/list/${getEnv().SUPABASE_STORAGE_BUCKET}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: "references",
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    },
  );
  const value: unknown = JSON.parse(
    (await bounded(response, 131072)).toString("utf8"),
  );
  if (!Array.isArray(value) || value.length > 100)
    throw new AppError("INVALID_STORAGE_RESPONSE", 503);
  return value.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return typeof row.name === "string" && typeof row.updated_at === "string"
      ? [{ key: row.name, modified: Date.parse(row.updated_at) }]
      : [];
  });
}
