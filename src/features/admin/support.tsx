"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { formatDate } from "@/domain/billing";
import {
  ActionForm,
  DataTable,
  Field,
  Filters,
  QueryState,
  SectionHeading,
  reason,
  useAdminData,
  useOperator,
  type PageList,
} from "./shared";
type Ticket = {
  id: string;
  userId: string;
  subject: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  version: number;
  updatedAt: string;
  messagePage: number;
  messageTotal: number;
  messages: {
    id: string;
    body: string;
    internal: boolean;
    authorId: string;
    createdAt: string;
  }[];
};
export function SupportAdmin({ id }: { id?: string }) {
  return id ? <TicketDetail id={id} /> : <TicketsList />;
}
function TicketsList() {
  const query = useAdminData<PageList<Ticket>>("support");
  return (
    <>
      <SectionHeading
        section="support"
        description="Permintaan pengguna, prioritas dan balasan. Catatan internal tidak terlihat pengguna."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={["open", "waiting", "resolved", "closed"]}
          />
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Tiket",
                cell: (ticket) => (
                  <Link href={`/admin/support/${ticket.id}`}>
                    {ticket.subject}
                  </Link>
                ),
              },
              {
                label: "Pengguna",
                cell: (ticket) => (
                  <Link href={`/admin/users/${ticket.userId}`}>
                    {ticket.userId}
                  </Link>
                ),
              },
              {
                label: "Status / prioritas",
                cell: (ticket) => `${ticket.status} / ${ticket.priority}`,
              },
              {
                label: "Diperbarui",
                cell: (ticket) => formatDate(ticket.updatedAt),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
function TicketDetail({ id }: { id: string }) {
  const router = useRouter();
  const query = useAdminData<{ ticket: Ticket }>("support", id),
    operator = useOperator();
  if (!query.data)
    return <QueryState pending={query.isPending} error={query.error} />;
  const ticket = query.data.ticket;
  return (
    <>
      <SectionHeading section="support" id={id} description={ticket.subject} />
      <div className="admin-messages">
        {ticket.messages.map((entry) => (
          <article className="panel" key={entry.id}>
            <small>
              {entry.internal ? "Catatan internal" : "Balasan"} -{" "}
              {formatDate(entry.createdAt)}
            </small>
            <p className="preserve-lines">{entry.body}</p>
          </article>
        ))}
      </div>
      <nav className="results-actions" aria-label="Halaman pesan tiket">
        <Button
          variant="ghost"
          disabled={ticket.messagePage <= 1}
          onClick={() =>
            router.push(
              `/admin/support/${id}?messagesPage=${ticket.messagePage - 1}`,
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
              `/admin/support/${id}?messagesPage=${ticket.messagePage + 1}`,
            )
          }
        >
          Pesan sebelumnya
        </Button>
      </nav>
      <ActionForm
        key={`${id}:${ticket.version}`}
        path={`/admin/support/${id}`}
        button="Simpan dan kirim pembaruan"
        onSuccess={() => router.replace(`/admin/support/${id}`)}
        build={(form) => ({
          version: ticket.version,
          reason: reason(form),
          status: form.get("status"),
          priority: form.get("priority"),
          assignedTo: form.get("assignedTo")
            ? String(form.get("assignedTo"))
            : null,
          message: String(form.get("message") ?? ""),
          internal: form.get("internal") === "on",
        })}
      >
        <Field
          name="status"
          label="Status tiket"
          value={ticket.status}
          options={["open", "waiting", "resolved", "closed"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Field
          name="priority"
          label="Prioritas tiket"
          value={ticket.priority}
          options={["low", "normal", "high"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Field
          name="assignedTo"
          label="Penanggung jawab"
          value={ticket.assignedTo ?? ""}
          options={[
            { value: "", label: "Belum ditugaskan" },
            { value: operator.data?.userId ?? "", label: "Ambil untuk saya" },
            ...(ticket.assignedTo && ticket.assignedTo !== operator.data?.userId
              ? [
                  {
                    value: ticket.assignedTo,
                    label: "Pertahankan penanggung jawab",
                  },
                ]
              : []),
          ]}
        />
        <Field
          name="message"
          label="Pesan / catatan baru"
          multiline
          max={3000}
        />
        <label className="check-row">
          <input name="internal" type="checkbox" />
          Catatan internal, tidak dikirim ke pengguna
        </label>
      </ActionForm>
    </>
  );
}
