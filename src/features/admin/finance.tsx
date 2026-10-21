"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate, rupiah } from "@/domain/billing";
import { Notice } from "@/components/ui";
import {
  ActionForm,
  DataTable,
  DateFilters,
  Field,
  Filters,
  QueryState,
  SectionHeading,
  reason,
  useAdminData,
  useOperator,
  type PageList,
} from "./shared";
type Payment = {
  planVersion: number;
  weeklyQuota: number;
  retentionDays: number;
  features: Record<string, boolean> | null;
  id: string;
  userId: string;
  planName: string;
  subtotal: number;
  discount: number;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  reference: string | null;
  errorCode: string | null;
  events: { id: string; source: string; status: string; createdAt: string }[];
  redemption: { status: string; voucher: { code: string } } | null;
};
export function PaymentsAdmin({ id }: { id?: string }) {
  return id ? <PaymentDetail id={id} /> : <PaymentsList />;
}
function PaymentsList() {
  const search = useSearchParams();
  const query = useAdminData<PageList<Payment>>("payments");
  return (
    <>
      <SectionHeading
        section="payments"
        description="Invoice dan status yang diverifikasi provider. Tidak ada tombol lunas manual."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={[
              "creating",
              "pending",
              "review",
              "paid",
              "expired",
              "failed",
            ]}
          >
            <Field
              name="planId"
              label="Paket invoice"
              value={search.get("planId") ?? ""}
              options={[
                { value: "", label: "Semua paket" },
                ...["starter", "plus", "max"].map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
            <Field
              name="voucher"
              label="Kode voucher"
              value={search.get("voucher") ?? ""}
              max={32}
            />
            <DateFilters />
          </Filters>
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Invoice",
                cell: (payment) => (
                  <Link href={`/admin/payments/${payment.id}`}>
                    {payment.id}
                    <small className="cell-sub">{payment.planName}</small>
                  </Link>
                ),
              },
              {
                label: "Akun",
                cell: (payment) => (
                  <Link href={`/admin/users/${payment.userId}`}>
                    {payment.userId}
                  </Link>
                ),
              },
              {
                label: "Total / diskon",
                cell: (payment) => (
                  <>
                    {rupiah(payment.amount)}
                    <small className="cell-sub">
                      Diskon {rupiah(payment.discount)}
                    </small>
                  </>
                ),
              },
              { label: "Status", cell: (payment) => payment.status },
              {
                label: "Dibuat",
                cell: (payment) => formatDate(payment.createdAt),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
function PaymentDetail({ id }: { id: string }) {
  const query = useAdminData<{
    payment: Payment;
    receipt: { sentAt: string | null; attempts: number } | null;
  }>("payments", id);
  if (!query.data)
    return <QueryState pending={query.isPending} error={query.error} />;
  const payment = query.data.payment;
  return (
    <>
      <SectionHeading
        section="payments"
        id={id}
        description={`${payment.planName} - ${payment.id}`}
      />
      <section className="panel">
        <dl className="limits-list">
          <div>
            <dt>Pengguna</dt>
            <dd>
              <Link href={`/admin/users/${payment.userId}`}>
                {payment.userId}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{payment.status}</dd>
          </div>
          <div>
            <dt>Subtotal</dt>
            <dd>{rupiah(payment.subtotal)}</dd>
          </div>
          <div>
            <dt>Diskon</dt>
            <dd>{rupiah(payment.discount)}</dd>
          </div>
          <div>
            <dt>Total invoice</dt>
            <dd>{rupiah(payment.amount)}</dd>
          </div>
          <div>
            <dt>Voucher</dt>
            <dd>
              {payment.redemption
                ? `${payment.redemption.voucher.code} (${payment.redemption.status})`
                : "Tidak ada"}
            </dd>
          </div>
          <div>
            <dt>Referensi merchant</dt>
            <dd>{payment.reference ?? "Belum tersedia"}</dd>
          </div>
          <div>
            <dt>Snapshot manfaat</dt>
            <dd>
              Versi {payment.planVersion}; {payment.weeklyQuota} generasi per
              minggu; retensi {payment.retentionDays} hari.
            </dd>
          </div>
          <div>
            <dt>Fitur pembelian</dt>
            <dd>
              {Object.entries(payment.features ?? {})
                .filter(([, enabled]) => enabled)
                .map(([key]) => key)
                .join(", ") || "Manfaat paket asal"}
            </dd>
          </div>
          <div>
            <dt>Email receipt</dt>
            <dd>
              {query.data.receipt?.sentAt
                ? `Terkirim ${formatDate(query.data.receipt.sentAt)}`
                : query.data.receipt
                  ? `Dalam antrean; percobaan ${query.data.receipt.attempts}`
                  : "Belum ada / melewati retensi antrean"}
            </dd>
          </div>
        </dl>
        {payment.errorCode && <Notice>{payment.errorCode}</Notice>}
      </section>
      <div className="admin-form-grid">
        <ActionForm
          path={`/admin/payments/${id}/reconcile`}
          title="Rekonsiliasi provider"
          button="Minta pemeriksaan ulang"
          build={(form) => ({ reason: reason(form) })}
        >
          <p className="muted">
            Worker memeriksa status merchant. Nominal dan hak akses tidak diedit
            manual.
          </p>
        </ActionForm>
        {payment.status === "paid" && (
          <ActionForm
            path="/admin/refunds"
            title="Ajukan refund penuh"
            button="Ajukan peninjauan refund"
            danger
            build={(form) => ({ paymentId: id, reason: reason(form) })}
          >
            <p className="muted">
              Permintaan ini belum mengembalikan uang. Eksekusi dan bukti
              merchant ditinjau owner.
            </p>
          </ActionForm>
        )}
      </div>
      <h2>Timeline pembayaran</h2>
      <DataTable
        items={payment.events}
        columns={[
          { label: "Sumber", cell: (event) => event.source },
          { label: "Status provider", cell: (event) => event.status },
          { label: "Waktu", cell: (event) => formatDate(event.createdAt) },
        ]}
      />
    </>
  );
}
type Refund = {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  reason: string;
  version: number;
  evidence: string | null;
  providerReference: string | null;
  createdAt: string;
};
export function RefundsAdmin() {
  const query = useAdminData<PageList<Refund>>("refunds"),
    actor = useOperator();
  return (
    <>
      <SectionHeading
        section="refunds"
        description="Alur peninjauan uang kembali; terpisah dari kuota dan kredit kompensasi."
      />
      <Notice tone="info">
        Panel mencatat proses merchant. Status selesai memerlukan bukti uang
        sudah dikembalikan; sisa akses dari invoice terkait dicabut. Tidak ada
        transfer otomatis.
      </Notice>
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={[
              "requested",
              "approved",
              "processing",
              "completed",
              "rejected",
              "failed",
            ]}
          />
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Permintaan",
                cell: (refund) => (
                  <>
                    <Link href={`/admin/payments/${refund.paymentId}`}>
                      {refund.paymentId}
                    </Link>
                    <small className="cell-sub">{refund.reason}</small>
                  </>
                ),
              },
              { label: "Nominal", cell: (refund) => rupiah(refund.amount) },
              {
                label: "Status",
                cell: (refund) => (
                  <>
                    {refund.status}
                    {refund.providerReference && (
                      <small className="cell-sub">
                        {refund.providerReference}
                      </small>
                    )}
                  </>
                ),
              },
              {
                label: "Tinjau",
                cell: (refund) => {
                  const transitions: Record<string, string[]> = {
                    requested: ["approved", "rejected"],
                    approved: ["processing", "rejected"],
                    processing: ["completed", "failed"],
                  };
                  const options = transitions[refund.status];
                  return actor.data?.role === "owner" && options ? (
                    <details>
                      <summary>Perbarui refund</summary>
                      <ActionForm
                        path={`/admin/refunds/${refund.id}`}
                        button="Simpan hasil peninjauan"
                        danger
                        build={(form) => ({
                          version: refund.version,
                          status: form.get("status"),
                          reason: reason(form),
                          evidence: String(form.get("evidence") ?? ""),
                          providerReference: String(
                            form.get("reference") ?? "",
                          ),
                        })}
                      >
                        <Field
                          name="status"
                          label="Status refund berikutnya"
                          options={options.map((value) => ({
                            value,
                            label: value,
                          }))}
                        />
                        <Field
                          name="reference"
                          label="Referensi pengembalian merchant"
                          max={100}
                        />
                        <Field
                          name="evidence"
                          label="Referensi bukti hasil merchant"
                          multiline
                          max={1000}
                          help="Wajib saat selesai/gagal. Jangan tempel data rekening atau secret."
                        />
                      </ActionForm>
                    </details>
                  ) : (
                    "-"
                  );
                },
              },
            ]}
          />
        </>
      )}
    </>
  );
}
