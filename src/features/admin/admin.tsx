"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, patch, post, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import { formatDate, rupiah } from "@/domain/billing";
import { OperationsPanel } from "./operations";
import {
  paymentLabels,
  type CommercialPlan,
  type PaymentSummary,
} from "@/features/billing/types";
interface AdminData {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    subscriptions: { planId: string; endsAt: string }[];
  }[];
  totalUsers: number;
  page: number;
  payments: (PaymentSummary & { userId: string })[];
  jobs: {
    id: string;
    userId: string;
    status: string;
    done: number;
    total: number;
    llmRequestCount: number;
    billingPlanId: string;
    createdAt: string;
  }[];
  usage: {
    tokensIn: number | null;
    tokensOut: number | null;
    attempts: number | null;
  };
  plans: CommercialPlan[];
  readiness: {
    worker: boolean;
    publicAuth: boolean;
    payment: boolean;
    sandbox: boolean;
    mock: boolean;
    emailFailures: number;
    unresolvedPayments: number;
  };
}
export function AdminPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", page],
    queryFn: () => api<AdminData>(`/admin?page=${page}`),
  });
  const reconcile = useMutation({
    mutationFn: (id: string) => post(`/admin/payments/${id}`),
    onSuccess: () => void query.refetch(),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  const data = query.data;
  return (
    <>
      <div className="page-heading compact">
        <div>
          <h1>Operasional Buatin.</h1>
          <p>Akun, paket, pembayaran, dan pemakaian AI.</p>
        </div>
        <Button
          variant="secondary"
          busy={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Perbarui data
        </Button>
      </div>
      <section className="overview-strip">
        <div>
          <span>Akun terdaftar</span>
          <strong>{data.totalUsers}</strong>
        </div>
        <div>
          <span>Token masuk / keluar tercatat</span>
          <strong className="service-text">
            {(data.usage.tokensIn ?? 0).toLocaleString("id-ID")} /{" "}
            {(data.usage.tokensOut ?? 0).toLocaleString("id-ID")}
          </strong>
          <small>
            Data dapat kosong dari provider; biaya final mengikuti tagihan AI.
          </small>
        </div>
        <div>
          <span>Percobaan AI tercatat</span>
          <strong>{data.usage.attempts ?? 0}</strong>
          <small>
            Termasuk planner, retry, perbaikan, dan mode mock. Token yang tidak
            dilaporkan provider tidak ditaksir.
          </small>
        </div>
      </section>
      <section className="quality-report">
        <h2>Kesiapan layanan</h2>
        <ul>
          <li>
            Worker: {data.readiness.worker ? "terhubung" : "belum terhubung"}
          </li>
          <li>
            Registrasi dan email:{" "}
            {data.readiness.publicAuth ? "konfigurasi tersedia" : "belum siap"}
          </li>
          <li>
            Duitku:{" "}
            {data.readiness.payment ? "dikonfigurasi" : "belum dikonfigurasi"},{" "}
            {data.readiness.sandbox ? "sandbox" : "produksi"}
          </li>
          <li>
            AI: {data.readiness.mock ? "mock, belum AI nyata" : "mode nyata"}
          </li>
          <li>Email gagal permanen: {data.readiness.emailFailures}</li>
          <li>
            Tagihan memerlukan pemeriksaan: {data.readiness.unresolvedPayments}
          </li>
        </ul>
        <Link className="text-button" href="/settings">
          Konfigurasi model dan periksa layanan AI
        </Link>
      </section>
      <OperationsPanel />
      <h2>Harga dan kuota paket</h2>
      <p className="muted">
        Perubahan berlaku untuk pembelian berikutnya. Hak periode yang sudah
        dibayar tetap mengikuti salinan saat pembelian. Harga mencakup biaya
        gateway. Hitung biaya AI untuk bulan yang melewati lima waktu reset.
      </p>
      <div className="plan-admin-list">
        {data.plans
          .filter((plan) => plan.id !== "free")
          .map((plan) => (
            <PlanEditor key={`${plan.id}:${query.dataUpdatedAt}`} plan={plan} />
          ))}
      </div>
      <h2>Akun pengguna</h2>
      <div className="table-scroll">
        <table className="projects-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Akses</th>
              <th>Paket aktif</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>
                  {user.email}
                  <small className="muted">
                    {user.emailVerified
                      ? " Terverifikasi"
                      : " Belum verifikasi"}
                  </small>
                </td>
                <td>{user.role}</td>
                <td>{user.subscriptions[0]?.planId ?? "free"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Sebelumnya
        </Button>
        <span>Halaman {page}</span>
        <Button
          variant="secondary"
          disabled={page * 20 >= data.totalUsers}
          onClick={() => setPage(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
      <h2>Tagihan terbaru</h2>
      {reconcile.error && (
        <Notice tone="error">{message(reconcile.error)}</Notice>
      )}
      <div className="table-scroll">
        <table className="projects-table">
          <thead>
            <tr>
              <th>Tagihan / akun</th>
              <th>Paket</th>
              <th>Total</th>
              <th>Status</th>
              <th>Pemeriksaan</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <span className="break-word">{payment.id}</span>
                  <small>{payment.userId}</small>
                </td>
                <td>{payment.planName}</td>
                <td>{rupiah(payment.amount)}</td>
                <td>{paymentLabels[payment.status]}</td>
                <td>
                  {payment.status !== "paid" && (
                    <Button
                      variant="secondary"
                      busy={reconcile.isPending}
                      onClick={() => reconcile.mutate(payment.id)}
                    >
                      Jadwalkan verifikasi
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.payments.length && <p className="muted">Belum ada tagihan.</p>}
      <h2>Proses terbaru</h2>
      <div className="table-scroll">
        <table className="projects-table">
          <thead>
            <tr>
              <th>Proses / akun</th>
              <th>Paket</th>
              <th>Status</th>
              <th>Dokumen</th>
              <th>Request AI</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  {job.id}
                  <small>{job.userId}</small>
                </td>
                <td>{job.billingPlanId}</td>
                <td>{job.status}</td>
                <td>
                  {job.done}/{job.total}
                </td>
                <td>{job.llmRequestCount}</td>
                <td>{formatDate(job.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function PlanEditor({ plan }: { plan: CommercialPlan }) {
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: (values: {
      monthlyPrice: number | null;
      weeklyQuota: number;
      retentionDays: number;
      available: boolean;
    }) => patch(`/admin/plans/${plan.id}`, values),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }),
  });
  return (
    <form
      className="plan-admin-form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        update.mutate({
          monthlyPrice: values.get("price")
            ? Number(values.get("price"))
            : null,
          weeklyQuota: Number(values.get("quota")),
          retentionDays: Number(values.get("retention")),
          available: values.get("available") === "on",
        });
      }}
    >
      <h3>{plan.name}</h3>
      <div className="field">
        <label htmlFor={`${plan.id}-price`}>Harga bulanan, rupiah</label>
        <input
          id={`${plan.id}-price`}
          name="price"
          type="number"
          min={1000}
          max={100000000}
          step={1}
          defaultValue={plan.monthlyPrice ?? ""}
          placeholder="Belum ditentukan"
        />
      </div>
      <div className="field">
        <label htmlFor={`${plan.id}-quota`}>Generasi per minggu</label>
        <input
          id={`${plan.id}-quota`}
          name="quota"
          type="number"
          min={1}
          max={100}
          defaultValue={plan.weeklyQuota}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${plan.id}-retention`}>Retensi, hari</label>
        <input
          id={`${plan.id}-retention`}
          name="retention"
          type="number"
          min={1}
          max={365}
          defaultValue={plan.retentionDays}
          required
        />
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          name="available"
          defaultChecked={plan.available}
        />
        <span>Jual paket ini</span>
      </label>
      {update.error && <Notice tone="error">{message(update.error)}</Notice>}
      <Button variant="secondary" busy={update.isPending} type="submit">
        Simpan {plan.name}
      </Button>
    </form>
  );
}
