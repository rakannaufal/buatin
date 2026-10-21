"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, post, message } from "@/components/api";
import { Button, Notice } from "@/components/ui";
export function AccountPrivacy({ email }: { email: string }) {
  const [kind, setKind] = useState("export");
  const query = useQuery({
    queryKey: ["data-requests"],
    queryFn: () =>
      api<{
        requests: {
          id: string;
          kind: string;
          status: string;
          createdAt: string;
        }[];
      }>("/account/data-requests"),
  });
  const send = useMutation({
    mutationFn: (confirmation: string) =>
      post("/account/data-requests", { kind, confirmation }),
    onSuccess: () => void query.refetch(),
  });
  const labels: Record<string, string> = {
    open: "Menunggu pengelola",
    processing: "Sedang ditinjau",
    completed: "Selesai",
    rejected: "Tidak dapat dipenuhi",
  };
  return (
    <section aria-labelledby="privacy-request-heading">
      <h2 id="privacy-request-heading">Hak atas data</h2>
      <p>
        Minta salinan atau penghapusan data akun. Pengelola meninjau permintaan;
        pengiriman ini belum menghapus akun. Catatan pembayaran dapat memerlukan
        retensi sesuai kewajiban administrasi.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send.mutate(
            String(new FormData(event.currentTarget).get("confirmation-email")),
          );
        }}
      >
        <div className="field">
          <label htmlFor="data-request-kind">Jenis permintaan</label>
          <select
            id="data-request-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="export">Salinan data saya</option>
            <option value="deletion">Penghapusan data saya</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="confirmation-email">
            Ketik email akun untuk konfirmasi
          </label>
          <input
            id="confirmation-email"
            name="confirmation-email"
            type="email"
            placeholder={email}
            required
            autoComplete="email"
          />
        </div>
        {send.error && <Notice tone="error">{message(send.error)}</Notice>}
        {send.isSuccess && (
          <p role="status">
            Permintaan tercatat. Status tersedia pada daftar berikut.
          </p>
        )}
        <Button type="submit" variant="secondary" busy={send.isPending}>
          Kirim permintaan data
        </Button>
      </form>
      {query.isPending && <p role="status">Memuat permintaan...</p>}
      {query.error && <Notice tone="error">{message(query.error)}</Notice>}
      {query.data &&
        (query.data.requests.length ? (
          <ul>
            {query.data.requests.map((request) => (
              <li key={request.id}>
                {request.kind === "export"
                  ? "Salinan data"
                  : "Penghapusan data"}
                : {labels[request.status] ?? request.status} ·{" "}
                {new Date(request.createdAt).toLocaleDateString("id-ID")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Belum ada permintaan data.</p>
        ))}
    </section>
  );
}
