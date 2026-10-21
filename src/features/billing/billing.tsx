"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, post, message } from "@/components/api";
import { Loading, Notice, Button } from "@/components/ui";
import { formatDate, rupiah } from "@/domain/billing";
import { PlanComparison } from "./plans";
import type { BillingQuote } from "@/server/vouchers";
import {
  paymentLabels,
  type CommercialPlan,
  type AccountEntitlement,
  type PaymentSummary,
} from "./types";

export function BillingPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<CommercialPlan["id"] | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  const query = useQuery({
    queryKey: ["billing"],
    queryFn: () =>
      api<{
        plans: CommercialPlan[];
        entitlement: AccountEntitlement;
        paymentReady: boolean;
        sandbox: boolean;
        payments: PaymentSummary[];
        subscriptions: {
          id: string;
          plan: { name: string };
          startsAt: string;
          endsAt: string;
        }[];
      }>("/billing"),
  });
  const checkout = useMutation({
    mutationFn: ({
      planId,
      quote,
    }: {
      planId: CommercialPlan["id"];
      quote: BillingQuote;
    }) =>
      post<{ payment: { id: string } }>(
        "/billing/checkout",
        { planId, quote },
        { "Idempotency-Key": `${key}:${quote.signature.slice(0, 32)}` },
      ),
    onSuccess: ({ payment }) => router.push(`/billing/${payment.id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  const data = query.data,
    selected = data.plans.find((plan) => plan.id === choice);
  return (
    <>
      <div className="page-heading compact">
        <div>
          <h1>Paket & tagihan.</h1>
          <p>Bayar satu bulan. Kuota diperbarui setiap minggu.</p>
        </div>
      </div>
      <section className="billing-summary">
        <div>
          <span>Paket saat ini</span>
          <h2>{data.entitlement.name}</h2>
          <p>
            {data.entitlement.baseRemaining ?? data.entitlement.remaining} dari{" "}
            {data.entitlement.limit} generasi tersisa.
          </p>
        </div>
        <div>
          <span>
            {data.entitlement.activeUntil
              ? "Aktif sampai"
              : "Free seumur hidup"}
          </span>
          <p>
            {data.entitlement.activeUntil
              ? formatDate(data.entitlement.activeUntil)
              : `${data.entitlement.limit} generasi per akun, tanpa reset`}
          </p>
          <small>
            {data.entitlement.resetsAt
              ? `Reset kuota: ${formatDate(data.entitlement.resetsAt)}`
              : "Edit, unduh, dan resume tidak memakai kuota baru."}
          </small>
        </div>
      </section>
      {!!data.entitlement.creditRemaining && (
        <p className="notice">
          Bonus generasi tersisa: {data.entitlement.creditRemaining}. Kuota
          paket dipakai dahulu.
        </p>
      )}
      {data.subscriptions.map((period) => (
        <p className="muted" key={period.id}>
          {period.plan.name}: {formatDate(period.startsAt)} sampai{" "}
          {formatDate(period.endsAt)}.
        </p>
      ))}
      {data.sandbox && (
        <Notice tone="info">
          Duitku sandbox. Tagihan pengujian tidak mengaktifkan layanan produksi.
        </Notice>
      )}
      {!data.paymentReady && (
        <Notice>
          QRIS belum aktif. Harga dan kredensial merchant harus disiapkan
          pengelola sebelum paket dijual.
        </Notice>
      )}
      <PlanComparison
        plans={data.plans}
        paymentReady={data.paymentReady}
        busy={checkout.isPending}
        onChoose={setChoice}
      />
      {selected && (
        <CheckoutReview
          key={selected.id}
          plan={selected}
          busy={checkout.isPending}
          error={checkout.error}
          onCancel={() => setChoice(null)}
          onCheckout={(quote) =>
            checkout.mutate({ planId: selected.id, quote })
          }
        />
      )}
      <p className="pricing-note">
        Sisa kuota tidak menumpuk. Satu generasi menghasilkan satu paket
        dokumen; regenerasi pilihan memakai satu kuota baru. Masa penyimpanan
        hasil mengikuti paket saat proses dimulai. Tidak ada tagihan otomatis.
        Berhenti cukup dengan tidak memperpanjang.
      </p>
      <h2>Riwayat tagihan</h2>
      {data.payments.length ? (
        <div className="table-scroll">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Paket</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.planName}</td>
                  <td>{rupiah(payment.amount)}</td>
                  <td>{paymentLabels[payment.status]}</td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>
                    <Link
                      className="text-button"
                      href={`/billing/${payment.id}`}
                    >
                      Lihat tagihan
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">
          Belum ada tagihan. Free dapat dipakai tanpa pembayaran.
        </p>
      )}
    </>
  );
}
function CheckoutReview({
  plan,
  busy,
  error,
  onCancel,
  onCheckout,
}: {
  plan: CommercialPlan;
  busy: boolean;
  error: Error | null;
  onCancel: () => void;
  onCheckout: (quote: BillingQuote) => void;
}) {
  const [code, setCode] = useState("");
  const quote = useMutation({
    mutationFn: () =>
      post<{ quote: BillingQuote }>("/billing/quote", {
        planId: plan.id,
        code,
      }),
  });
  return (
    <section className="panel checkout-review" aria-label="Tinjau pembelian">
      <h2>Konfirmasi {plan.name}</h2>
      <p>
        Periode baru dimulai setelah seluruh masa bayar/grant yang tersedia.
        Membayar tidak mereset kuota minggu berjalan.
      </p>
      <label className="field">
        Kode voucher (opsional)
        <input
          name="voucher"
          value={code}
          maxLength={32}
          onChange={(event) => {
            setCode(event.target.value);
            quote.reset();
          }}
        />
      </label>
      <Button
        variant="secondary"
        busy={quote.isPending}
        onClick={() => quote.mutate()}
      >
        Periksa total
      </Button>
      {quote.error && <Notice tone="error">{message(quote.error)}</Notice>}
      {quote.data && (
        <dl className="limits-list">
          <div>
            <dt>Subtotal</dt>
            <dd>{rupiah(quote.data.quote.subtotal)}</dd>
          </div>
          <div>
            <dt>Diskon {quote.data.quote.code}</dt>
            <dd>{rupiah(quote.data.quote.discount)}</dd>
          </div>
          <div>
            <dt>Total bayar</dt>
            <dd>{rupiah(quote.data.quote.amount)}</dd>
          </div>
        </dl>
      )}
      <p className="muted">
        QRIS saja. Biaya gateway ditanggung pengelola. Total berlaku lima menit;
        slot voucher dipastikan saat invoice dibuat.
      </p>
      {error && <Notice tone="error">{message(error)}</Notice>}
      <div className="inline-actions">
        <Button
          busy={busy}
          disabled={!quote.data || quote.isPending}
          onClick={() => quote.data && onCheckout(quote.data.quote)}
        >
          Buat tagihan QRIS
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          Kembali
        </Button>
      </div>
    </section>
  );
}
export function PaymentPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["payment", id],
    queryFn: () =>
      api<{
        payment: PaymentSummary & {
          qr: string | null;
          reference: string | null;
          subscription: { startsAt: string; endsAt: string } | null;
        };
        sandbox: boolean;
      }>(`/billing/${id}`),
    refetchInterval: (query) =>
      ["creating", "pending", "review"].includes(
        query.state.data?.payment.status ?? "",
      )
        ? 5000
        : false,
  });
  if (query.isPending) return <Loading label="Menyiapkan tagihan..." />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  const { payment, sandbox } = query.data;
  return (
    <>
      <Link className="back-link" href="/billing">
        Kembali ke tagihan
      </Link>
      <div className="page-heading compact">
        <div>
          <h1>
            {payment.status === "paid"
              ? "Pembayaran diterima."
              : "Pembayaran QRIS."}
          </h1>
          <p>{payment.planName}, satu bulan.</p>
        </div>
      </div>
      {sandbox && <Notice tone="info">QRIS sandbox untuk pengujian.</Notice>}
      <section className="payment-layout">
        <div className="payment-qr panel">
          {payment.qr ? (
            <>
              <Image
                src={payment.qr}
                unoptimized
                width={360}
                height={360}
                alt={`QRIS tagihan ${payment.id}`}
              />
              <Countdown expiresAt={payment.expiresAt} />
              <p>
                Scan dengan aplikasi bank atau dompet digital yang mendukung
                QRIS. Periksa nominal serta nama merchant sebelum membayar.
              </p>
            </>
          ) : (
            <Notice tone={payment.status === "paid" ? "info" : "warning"}>
              {paymentLabels[payment.status]}.{" "}
              {payment.status === "pending"
                ? "QR sudah melewati batas waktu; konfirmasi akhir menunggu Duitku."
                : payment.status === "creating"
                  ? "Status diperiksa otomatis. Jangan membuat pembayaran kedua."
                  : ""}
            </Notice>
          )}
        </div>
        <div>
          <dl className="invoice-details">
            <dt>Harga paket</dt>
            <dd>{rupiah(payment.subtotal ?? payment.amount)}</dd>
            {!!payment.discount && (
              <>
                <dt>Diskon</dt>
                <dd>-{rupiah(payment.discount)}</dd>
              </>
            )}
            {payment.voucherCode && (
              <>
                <dt>Voucher</dt>
                <dd>{payment.voucherCode}</dd>
              </>
            )}
            <dt>Total pembayaran</dt>
            <dd className="payment-total">{rupiah(payment.amount)}</dd>
            <dt>Status</dt>
            <dd role="status">{paymentLabels[payment.status]}</dd>
            <dt>Nomor tagihan</dt>
            <dd className="break-word">{payment.id}</dd>
            <dt>Dibuat</dt>
            <dd>{formatDate(payment.createdAt)}</dd>
            <dt>Batas pembayaran</dt>
            <dd>{formatDate(payment.expiresAt)}</dd>
            {payment.reference && (
              <>
                <dt>Referensi Duitku</dt>
                <dd className="break-word">{payment.reference}</dd>
              </>
            )}
            {payment.subscription && (
              <>
                <dt>Periode berlangganan</dt>
                <dd>
                  {formatDate(payment.subscription.startsAt)} sampai{" "}
                  {formatDate(payment.subscription.endsAt)}
                </dd>
              </>
            )}
          </dl>
          <p className="muted">
            Status diperbarui setelah verifikasi server. Halaman boleh ditutup.
            Tagihan tetap tersimpan.
          </p>
          <Button
            variant="secondary"
            busy={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Muat ulang status
          </Button>
          {payment.status === "paid" && (
            <Link className="button button-primary" href="/dashboard">
              Buka ruang kerja
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
function Countdown({ expiresAt }: { expiresAt: string }) {
  const query = useQuery({
    queryKey: ["clock", expiresAt],
    queryFn: async () => Date.now(),
    refetchInterval: 1000,
  });
  const seconds = Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() -
        (query.data ?? new Date(expiresAt).getTime())) /
        1000,
    ),
  );
  return (
    <p className="qr-countdown">
      {seconds
        ? `Berlaku ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
        : "Waktu pembayaran habis"}
    </p>
  );
}
