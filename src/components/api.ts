import { needsProcessing } from "@/domain/processing";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.location.reload();
    throw new ApiError(
      value.error?.message ?? value.message ?? "Permintaan gagal. Coba lagi.",
      value.error?.code ?? "REQUEST_FAILED",
      response.status,
    );
  }
  // Continuation is an authenticated POST. GET/HEAD never start server work.
  if (
    (!options.method || options.method === "GET") &&
    response.headers.get("X-Processing-Mode") === "request" &&
    needsProcessing(path, value)
  ) {
    await api("/processing", {
      method: "POST",
      body: "{}",
      signal: options.signal,
    });
    const refreshed = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
    });
    if (!refreshed.ok)
      throw new ApiError(
        "Pembaruan status gagal. Coba kembali.",
        "REFRESH_FAILED",
        refreshed.status,
      );
    return (await refreshed.json()) as T;
  }
  return value as T;
}
export const post = <T>(
  path: string,
  body: unknown = {},
  headers?: Record<string, string>,
) => api<T>(path, { method: "POST", body: JSON.stringify(body), headers });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Terjadi gangguan. Coba lagi.";
}
export const statusLabels: Record<string, string> = {
  draft: "Draft",
  planning: "Menyusun rencana",
  needs_clarification: "Perlu klarifikasi",
  plan_ready: "Rencana siap",
  generating: "Sedang dibuat",
  completed: "Selesai",
  completed_partial: "Selesai sebagian",
  queued: "Dalam antrean",
  running: "Sedang diproses",
  validating: "Memeriksa hasil",
  cancel_requested: "Menunggu pembatalan",
  succeeded: "Selesai",
  partial: "Selesai sebagian",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  pending: "Menunggu",
  blocked: "Terhalang dependensi",
  stale: "Perlu diperbarui",
};
export const errorLabels: Record<string, string> = {
  LLM_DAILY_LIMIT:
    "Batas penggunaan AI harian tercapai. Coba besok atau hubungi dukungan.",
  LLM_PRICING_REQUIRED: "Tarif AI perlu dikonfigurasi operator.",
  LLM_INPUT_TOO_LARGE:
    "Konteks AI melewati batas ukuran. Ringkas brief atau catatan referensi.",
  LLM_AUTH: "Autentikasi layanan AI gagal. Periksa konfigurasi server.",
  LLM_UNAVAILABLE: "Layanan AI belum dapat dijangkau.",
  LLM_MODEL_MISSING: "Model terpilih belum tersedia.",
  REQUEST_BUDGET: "Batas request proses tercapai.",
  WORKER_INTERRUPTED: "Worker terhenti. Hasil tersimpan dapat dilanjutkan.",
  LLM_TRANSIENT: "Layanan AI belum merespons setelah percobaan ulang.",
  CONTEXT_UNAVAILABLE: "Dokumen sumber konteks belum berhasil dibuat.",
  CLOSED_REFUNDED: "Proses ditutup; kuota sudah dikembalikan ke periode asal.",
};
