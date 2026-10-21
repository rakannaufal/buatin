"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/domain/billing";
import {
  ActionForm,
  DataTable,
  Field,
  Filters,
  DateFilters,
  QueryState,
  SectionHeading,
  reason,
  useAdminData,
  type PageList,
} from "./shared";
type Job = {
  id: string;
  userId: string;
  status: string;
  done: number;
  total: number;
  errorCode: string | null;
  llmRequestCount: number;
  createdAt: string;
  quotaRefundedAt: string | null;
};
export function JobsAdmin() {
  const query = useAdminData<PageList<Job>>("jobs");
  return (
    <>
      <SectionHeading
        section="jobs"
        description="Tahap, penggunaan request dan pemulihan dengan snapshot/kuota asal."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={[
              "queued",
              "running",
              "validating",
              "cancel_requested",
              "succeeded",
              "partial",
              "failed",
              "cancelled",
            ]}
          />
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Job / akun",
                cell: (job) => (
                  <>
                    <code>{job.id}</code>
                    <small className="cell-sub">
                      <Link href={`/admin/users/${job.userId}`}>
                        {job.userId}
                      </Link>
                    </small>
                  </>
                ),
              },
              {
                label: "Progres",
                cell: (job) => (
                  <>
                    {job.status} ({job.done}/{job.total})
                    <small className="cell-sub">
                      {job.llmRequestCount} request;{" "}
                      {job.quotaRefundedAt
                        ? "kuota dikembalikan"
                        : "reservasi asal"}
                    </small>
                    {job.errorCode && (
                      <small className="field-error">{job.errorCode}</small>
                    )}
                  </>
                ),
              },
              {
                label: "Tindakan",
                cell: (job) => {
                  const action = [
                    "queued",
                    "running",
                    "validating",
                    "cancel_requested",
                  ].includes(job.status)
                    ? "cancel"
                    : ["partial", "failed"].includes(job.status) &&
                        !job.quotaRefundedAt
                      ? "resume"
                      : null;
                  return action ? (
                    <details>
                      <summary>
                        {action === "cancel" ? "Batalkan" : "Lanjutkan"}
                      </summary>
                      <ActionForm
                        path={`/admin/jobs/${job.id}/${action}`}
                        button={
                          action === "cancel"
                            ? "Minta pembatalan"
                            : "Lanjutkan snapshot asal"
                        }
                        danger={action === "cancel"}
                        build={(form) => ({ reason: reason(form) })}
                      />
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
type Audit = {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  resourceId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  requestId: string | null;
  createdAt: string;
};
export function AuditAdmin() {
  const query = useAdminData<PageList<Audit>>("audit");
  return (
    <>
      <SectionHeading
        section="audit"
        description="Jejak perubahan operator. Tidak dapat diedit atau dihapus melalui panel."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters total={query.data.total} page={query.data.page} />
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Tindakan / waktu",
                cell: (event) => (
                  <>
                    {event.action}
                    <small className="cell-sub">
                      {formatDate(event.createdAt)}
                    </small>
                  </>
                ),
              },
              {
                label: "Pelaku / target",
                cell: (event) => (
                  <>
                    {event.userId ?? "Sistem"}
                    <small className="cell-sub">
                      {event.targetType} {event.resourceId}
                    </small>
                  </>
                ),
              },
              {
                label: "Rincian",
                cell: (event) => (
                  <details>
                    <summary>{event.reason ?? "Lihat jejak"}</summary>
                    <p>Request: {event.requestId ?? "Tidak tersedia"}</p>
                    <strong>Sebelum</strong>
                    <pre className="admin-audit-value">
                      {JSON.stringify(event.before, null, 2)}
                    </pre>
                    <strong>Sesudah</strong>
                    <pre className="admin-audit-value">
                      {JSON.stringify(event.after, null, 2)}
                    </pre>
                  </details>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
type Privacy = {
  id: string;
  kind: string;
  status: string;
  userId: string | null;
  user: { name: string; email: string } | null;
  version: number;
  createdAt: string;
  evidence: string | null;
  note: string | null;
};
export function PrivacyAdmin() {
  const query = useAdminData<PageList<Privacy>>("privacy");
  return (
    <>
      <SectionHeading
        section="privacy"
        description="Export/penghapusan mengikuti runbook. Selesai hanya setelah pemenuhan diverifikasi."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={["open", "processing", "completed", "rejected"]}
          />
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Permintaan",
                cell: (item) => (
                  <>
                    {item.kind}
                    <small className="cell-sub">
                      {item.user?.email ?? "Akun dipseudonimkan"}
                    </small>
                    {formatDate(item.createdAt)}
                  </>
                ),
              },
              {
                label: "Status",
                cell: (item) => (
                  <>
                    {item.status}
                    <small className="cell-sub">{item.note}</small>
                  </>
                ),
              },
              {
                label: "Pemenuhan",
                cell: (item) =>
                  ["open", "processing"].includes(item.status) ? (
                    <details>
                      <summary>Tinjau permintaan</summary>
                      <ActionForm
                        path={`/admin/privacy/${item.id}`}
                        button="Simpan peninjauan"
                        danger
                        build={(form) => ({
                          version: item.version,
                          reason: reason(form),
                          status: form.get("status"),
                          evidence: String(form.get("evidence") ?? ""),
                        })}
                      >
                        <Field
                          name="status"
                          label="Status permintaan"
                          options={(item.status === "open"
                            ? ["processing", "rejected"]
                            : ["completed", "rejected"]
                          ).map((value) => ({ value, label: value }))}
                        />
                        <Field
                          name="evidence"
                          label="Referensi bukti pemenuhan"
                          multiline
                          max={1000}
                          help="Wajib untuk selesai. Referensi internal, tanpa isi data pribadi."
                        />
                      </ActionForm>
                    </details>
                  ) : (
                    (item.evidence ?? "-")
                  ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
export function AiUsageAdmin() {
  const search = useSearchParams();
  const query = useAdminData<
    PageList<{
      id: string;
      userId: string | null;
      model: string;
      modelUsed: string | null;
      task: string;
      tokensIn: number | null;
      tokensOut: number | null;
      estimatedCostMicros: string | null;
      pricingVersion: number | null;
      inputRate: number | null;
      outputRate: number | null;
      mock: boolean;
      status: string;
      createdAt: string;
    }>
  >("ai");
  return (
    <>
      <SectionHeading
        section="ai"
        description="Pemakaian dan estimasi biaya; tagihan final tetap dari provider."
      />
      <p>
        <Link className="text-button" href="/settings">
          Pilihan model dan pemeriksaan koneksi
        </Link>{" "}
        ·{" "}
        <Link className="text-button" href="/admin/settings">
          Batas biaya dan operasi
        </Link>
      </p>
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters total={query.data.total} page={query.data.page}>
            <Field
              name="model"
              label="ID model persis"
              value={search.get("model") ?? ""}
              max={160}
            />
            <DateFilters />
          </Filters>
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Model / tugas",
                cell: (item) => (
                  <>
                    {item.model}
                    {item.modelUsed && (
                      <small className="cell-sub">
                        Provider: {item.modelUsed}
                      </small>
                    )}
                    <small className="cell-sub">
                      {item.task} - {item.mock ? "mock" : "nyata"}
                    </small>
                  </>
                ),
              },
              {
                label: "Akun",
                cell: (item) =>
                  item.userId ? (
                    <Link href={`/admin/users/${item.userId}`}>
                      {item.userId}
                    </Link>
                  ) : (
                    "Sistem"
                  ),
              },
              {
                label: "Token input / output",
                cell: (item) =>
                  `${item.tokensIn ?? "belum diketahui"} / ${item.tokensOut ?? "belum diketahui"}`,
              },
              {
                label: "Estimasi USD / status",
                cell: (item) => (
                  <>
                    {item.estimatedCostMicros &&
                    Number(item.estimatedCostMicros) > 0
                      ? (Number(item.estimatedCostMicros) / 1000000).toFixed(6)
                      : "Belum ada estimasi tarif"}
                    <small className="cell-sub">{item.status}</small>
                    <small className="cell-sub">
                      {item.inputRate !== null && item.outputRate !== null
                        ? `Tarif v${item.pricingVersion ?? 0}: $${item.inputRate} / $${item.outputRate} per 1 juta token input/output`
                        : "Tarif belum tercatat"}
                    </small>
                  </>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
