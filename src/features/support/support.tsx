"use client";
import Link from "next/link";
import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api, post, message } from "@/components/api";
import { Button, Notice, Loading } from "@/components/ui";
import { formatDate } from "@/domain/billing";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  messagePage: number;
  messageTotal: number;
  messages: { id: string; body: string; authorId: string; createdAt: string }[];
};
export function SupportPage({ id }: { id?: string }) {
  const client = useQueryClient(),
    router = useRouter(),
    search = useSearchParams();
  const page = Math.max(1, Math.min(Number(search.get("page")) || 1, 10000));
  const messagePage = Math.max(
    1,
    Math.min(Number(search.get("messagesPage")) || 1, 10000),
  );
  const receipt = useRef<{ payload: string; key: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const query = useQuery({
    queryKey: ["support", id, page, messagePage],
    queryFn: () =>
      api<{ ticket?: Ticket; items?: Ticket[]; total: number }>(
        `/support${id ? `/${encodeURIComponent(id)}?messagesPage=${messagePage}` : `?page=${page}`}`,
      ),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === id ? previous : undefined,
  });
  const send = useMutation({
    mutationFn: (body: { subject?: string; message: string }) => {
      const payload = JSON.stringify(body);
      if (receipt.current?.payload !== payload)
        receipt.current = { payload, key: crypto.randomUUID() };
      return post<{ id?: string }>(`/support${id ? `/${id}` : ""}`, body, {
        "Idempotency-Key": receipt.current!.key,
      });
    },
    onSuccess: async (value) => {
      receipt.current = null;
      formRef.current?.reset();
      await client.invalidateQueries({ queryKey: ["support"] });
      if (value.id) router.push(`/support/${value.id}`);
      else if (id && messagePage !== 1) router.replace(`/support/${id}`);
    },
  });
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <>
        <Notice tone="error">{message(query.error)}</Notice>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Coba lagi
        </Button>
      </>
    );
  const ticket = query.data.ticket;
  return (
    <>
      <div className="page-heading compact">
        <div>
          {id && (
            <Link className="back-link" href="/support">
              Kembali ke bantuan
            </Link>
          )}
          <h1>{ticket?.subject ?? "Bantuan."}</h1>
          <p>
            {ticket
              ? `Status: ${ticket.status}`
              : "Sampaikan kendala akun, generasi atau tagihan. Jangan kirim password dan kunci API."}
          </p>
        </div>
      </div>
      {query.error && <Notice tone="error">{message(query.error)}</Notice>}
      {ticket?.messages.map((entry) => (
        <article className="panel" key={entry.id}>
          <small>{formatDate(entry.createdAt)}</small>
          <p className="preserve-lines">{entry.body}</p>
        </article>
      ))}
      {ticket && (
        <nav className="results-actions" aria-label="Halaman pesan tiket">
          <Button
            variant="ghost"
            disabled={ticket.messagePage <= 1}
            onClick={() =>
              router.push(
                `/support/${id}?messagesPage=${ticket.messagePage - 1}`,
              )
            }
          >
            Pesan lebih baru
          </Button>
          <span>
            Halaman {ticket.messagePage}; {ticket.messageTotal} pesan
          </span>
          <Button
            variant="ghost"
            disabled={ticket.messagePage * 20 >= ticket.messageTotal}
            onClick={() =>
              router.push(
                `/support/${id}?messagesPage=${ticket.messagePage + 1}`,
              )
            }
          >
            Pesan sebelumnya
          </Button>
        </nav>
      )}
      {(!ticket || ticket.status !== "closed") && (
        <form
          className="panel"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            send.mutate({
              ...(!id ? { subject: String(form.get("subject")) } : {}),
              message: String(form.get("message")),
            });
          }}
        >
          {!id && (
            <label className="field">
              Judul permintaan
              <input name="subject" required minLength={5} maxLength={150} />
            </label>
          )}
          <label className="field">
            Pesan
            <textarea
              name="message"
              required
              minLength={8}
              maxLength={3000}
              rows={5}
            />
          </label>
          {send.error && <Notice tone="error">{message(send.error)}</Notice>}
          {send.isSuccess && <Notice tone="info">Pesan tersimpan.</Notice>}
          <Button type="submit" busy={send.isPending}>
            {id ? "Kirim balasan" : "Buat tiket bantuan"}
          </Button>
        </form>
      )}
      {query.data.items?.map((entry) => (
        <article className="panel" key={entry.id}>
          <h2>
            <Link href={`/support/${entry.id}`}>{entry.subject}</Link>
          </h2>
          <p className="muted">{entry.status}</p>
        </article>
      ))}
      {!id && (
        <nav className="results-actions" aria-label="Halaman tiket bantuan">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => router.push(`/support?page=${page - 1}`)}
          >
            Sebelumnya
          </Button>
          <span>
            Halaman {page}; {query.data.total} tiket
          </span>
          <Button
            variant="ghost"
            disabled={page * 20 >= query.data.total}
            onClick={() => router.push(`/support?page=${page + 1}`)}
          >
            Berikutnya
          </Button>
        </nav>
      )}
    </>
  );
}
