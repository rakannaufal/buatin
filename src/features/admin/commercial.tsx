"use client";
import Link from "next/link";
import { formatDate, rupiah } from "@/domain/billing";
import {
  ActionForm,
  DataTable,
  Field,
  Filters,
  QueryState,
  SectionHeading,
  number,
  reason,
  useAdminData,
  type PageList,
} from "./shared";
type Features = {
  revisions: boolean;
  regeneration: boolean;
  presets: boolean;
  templates: boolean;
  batch: boolean;
};
type PlanValue = {
  name: string;
  description: string;
  monthlyPrice: number | null;
  weeklyQuota: number;
  retentionDays: number;
  plannerLimit: number;
  priority: number;
  available: boolean;
  features: Features;
};
type Plan = PlanValue & { id: string; version: number };
type PlanVersion = {
  id: string;
  planId: string;
  status: string;
  version: number;
  value: PlanValue & { baseVersion: number };
  createdAt: string;
};
const featureLabels: Record<keyof Features, string> = {
  revisions: "Revisi brief",
  regeneration: "Regenerasi",
  presets: "Preset pribadi",
  templates: "Template pribadi",
  batch: "Antrean beberapa proyek",
};
export function PlansAdmin() {
  const query = useAdminData<{ items: Plan[]; versions: PlanVersion[] }>(
    "plans",
  );
  return (
    <>
      <SectionHeading
        section="plans"
        description="Draft, tinjau, lalu publish. Hak pembelian lama tetap memakai snapshot asal."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data?.items.map((plan) => (
        <section
          className="panel admin-plan"
          key={`${plan.id}:${plan.version}`}
        >
          <h2>
            {plan.name} <small className="muted">versi {plan.version}</small>
          </h2>
          <p>
            {plan.id === "free"
              ? "Kesempatan seumur hidup; konsumsi lama tetap dihitung."
              : `${plan.monthlyPrice ? rupiah(plan.monthlyPrice) : "Harga belum ditentukan"} / bulan; ${plan.available ? "dijual" : "penjualan nonaktif"}.`}
          </p>
          <details>
            <summary>Susun perubahan {plan.name}</summary>
            <ActionForm
              path={`/admin/plans/${plan.id}/draft`}
              button={`Simpan draft ${plan.name}`}
              build={(form) => ({
                version: plan.version,
                reason: reason(form),
                value: {
                  name: String(form.get("name")),
                  description: String(form.get("description")),
                  monthlyPrice:
                    plan.id === "free" || !form.get("price")
                      ? null
                      : number(form, "price"),
                  available:
                    plan.id !== "free" && form.get("available") === "on",
                  weeklyQuota: number(form, "quota"),
                  retentionDays: number(form, "retention"),
                  plannerLimit: number(form, "planner"),
                  priority: number(form, "priority"),
                  features: Object.fromEntries(
                    Object.keys(featureLabels).map((key) => [
                      key,
                      form.get(key) === "on",
                    ]),
                  ),
                },
              })}
            >
              <div className="admin-fields-grid">
                <Field
                  name="name"
                  label="Nama paket"
                  value={plan.name}
                  required
                  max={80}
                />
                <Field
                  name="description"
                  label="Deskripsi paket"
                  value={plan.description}
                  max={500}
                />
                <Field
                  name="price"
                  label="Harga bulanan IDR"
                  type="number"
                  value={plan.monthlyPrice ?? ""}
                  min={1000}
                  max={100000000}
                />
                <Field
                  name="quota"
                  label={
                    plan.id === "free"
                      ? "Kuota seumur hidup"
                      : "Generasi per minggu"
                  }
                  type="number"
                  value={plan.weeklyQuota}
                  min={1}
                  max={100}
                  required
                />
                <Field
                  name="retention"
                  label="Retensi hari"
                  type="number"
                  value={plan.retentionDays}
                  min={1}
                  max={365}
                  required
                />
                <Field
                  name="planner"
                  label="Batas penyusunan rencana per periode"
                  type="number"
                  value={plan.plannerLimit}
                  min={1}
                  max={500}
                  required
                />
                <Field
                  name="priority"
                  label="Prioritas antrean (0-100)"
                  type="number"
                  value={plan.priority}
                  min={0}
                  max={100}
                  required
                />
              </div>
              {plan.id !== "free" && (
                <label className="check-row">
                  <input
                    name="available"
                    type="checkbox"
                    defaultChecked={plan.available}
                  />
                  Aktifkan penjualan saat dipublish
                </label>
              )}
              <fieldset className="admin-checkboxes">
                <legend>Fitur yang diizinkan server</legend>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <label key={key} className="check-row">
                    <input
                      name={key}
                      type="checkbox"
                      defaultChecked={plan.features[key as keyof Features]}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </ActionForm>
          </details>
          {query.data?.versions
            .filter((version) => version.planId === plan.id)
            .map((version) => (
              <details className="admin-version" key={version.id}>
                <summary>
                  Versi {version.version} - {version.status} -{" "}
                  {formatDate(version.createdAt)}
                </summary>
                <dl className="limits-list">
                  <div>
                    <dt>Nama</dt>
                    <dd>{version.value.name}</dd>
                  </div>
                  <div>
                    <dt>Harga</dt>
                    <dd>
                      {version.value.monthlyPrice
                        ? rupiah(version.value.monthlyPrice)
                        : "Tidak dijual"}
                    </dd>
                  </div>
                  <div>
                    <dt>Kuota / retensi / planner</dt>
                    <dd>
                      {version.value.weeklyQuota} /{" "}
                      {version.value.retentionDays} hari /{" "}
                      {version.value.plannerLimit}
                    </dd>
                  </div>
                  <div>
                    <dt>Fitur</dt>
                    <dd>
                      {Object.entries(version.value.features)
                        .filter(([, enabled]) => enabled)
                        .map(([key]) => featureLabels[key as keyof Features])
                        .join(", ") || "Dasar"}
                    </dd>
                  </div>
                </dl>
                {version.status === "draft" && (
                  <ActionForm
                    path={`/admin/plans/${plan.id}/publish`}
                    button={`Publish versi ${version.version}`}
                    danger
                    build={(form) => ({
                      draftId: version.id,
                      version: plan.version,
                      reason: reason(form),
                    })}
                  >
                    <p className="muted">
                      Berlaku pada pembelian baru. Draft berbasis versi{" "}
                      {version.value.baseVersion}; versi aktif {plan.version}.
                    </p>
                  </ActionForm>
                )}
              </details>
            ))}
        </section>
      ))}
    </>
  );
}
type Voucher = {
  id: string;
  code: string;
  title: string;
  status: string;
  kind: string;
  value: number;
  minimumAmount: number;
  maximumDiscount: number | null;
  maxUses: number;
  perUserLimit: number;
  newCustomersOnly: boolean;
  planIds: string[];
  userIds: string[];
  startsAt: string;
  endsAt: string;
  version: number;
  _count?: { redemptions: number };
};
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function VoucherEditor({ value }: { value?: Voucher }) {
  return (
    <ActionForm
      path={`/admin/vouchers${value ? `/${value.id}` : ""}`}
      method={value ? "PATCH" : "POST"}
      title={value ? `Edit ${value.code}` : "Voucher baru"}
      button={value ? "Simpan perubahan voucher" : "Buat voucher"}
      build={(form) => ({
        ...(value ? { version: value.version } : {}),
        reason: reason(form),
        value: {
          code: String(form.get("code")),
          title: String(form.get("title")),
          status: form.get("status"),
          kind: form.get("kind"),
          value: number(form, "value"),
          minimumAmount: number(form, "minimum"),
          maximumDiscount: form.get("maximum") ? number(form, "maximum") : null,
          maxUses: number(form, "maxUses"),
          perUserLimit: number(form, "perUserLimit"),
          newCustomersOnly: form.get("newOnly") === "on",
          planIds: form.getAll("planIds"),
          userIds: String(form.get("userIds") ?? "")
            .split(/[\s,]+/)
            .filter(Boolean),
          startsAt: new Date(String(form.get("startsAt"))).toISOString(),
          endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        },
      })}
    >
      <div className="admin-fields-grid">
        <Field
          name="code"
          label="Kode voucher"
          value={value?.code}
          required
          max={32}
          help="Huruf/angka, underscore atau tanda minus. Kode tidak dapat diganti."
        />
        <Field
          name="title"
          label="Nama promosi"
          value={value?.title}
          required
          max={100}
        />
        <Field
          name="status"
          label="Status promosi"
          value={value?.status ?? "paused"}
          options={[
            { value: "paused", label: "Jeda" },
            { value: "active", label: "Aktif" },
            { value: "archived", label: "Arsip permanen" },
          ]}
        />
        <Field
          name="kind"
          label="Jenis diskon"
          value={value?.kind ?? "percent"}
          options={[
            { value: "percent", label: "Persentase" },
            { value: "fixed", label: "Nominal IDR" },
          ]}
        />
        <Field
          name="value"
          label="Nilai diskon"
          type="number"
          value={value?.value}
          min={1}
          max={100000000}
          required
          help="Persen 1-99; nominal dalam rupiah penuh."
        />
        <Field
          name="minimum"
          label="Minimum pembelian IDR"
          type="number"
          value={value?.minimumAmount ?? 0}
          min={0}
          required
        />
        <Field
          name="maximum"
          label="Maksimum diskon IDR (opsional)"
          type="number"
          value={value?.maximumDiscount ?? ""}
          min={1}
        />
        <Field
          name="maxUses"
          label="Batas total pemakaian"
          type="number"
          value={value?.maxUses ?? 100}
          min={1}
          required
        />
        <Field
          name="perUserLimit"
          label="Batas per akun"
          type="number"
          value={value?.perUserLimit ?? 1}
          min={1}
          required
        />
        <Field
          name="startsAt"
          label="Mulai, waktu lokal perangkat"
          type="datetime-local"
          value={value ? localDate(value.startsAt) : undefined}
          required
        />
        <Field
          name="endsAt"
          label="Berakhir, waktu lokal perangkat"
          type="datetime-local"
          value={value ? localDate(value.endsAt) : undefined}
          required
        />
      </div>
      <fieldset className="admin-checkboxes">
        <legend>Paket yang berlaku</legend>
        {["starter", "plus", "max"].map((plan) => (
          <label className="check-row" key={plan}>
            <input
              name="planIds"
              type="checkbox"
              value={plan}
              defaultChecked={value ? value.planIds.includes(plan) : true}
            />
            {plan}
          </label>
        ))}
      </fieldset>
      <label className="check-row">
        <input
          name="newOnly"
          type="checkbox"
          defaultChecked={value?.newCustomersOnly}
        />
        Hanya akun tanpa pembayaran terkonfirmasi sebelumnya
      </label>
      <Field
        name="userIds"
        label="ID akun yang diizinkan (opsional)"
        value={value?.userIds.join(", ")}
        max={20000}
        help="Pisahkan dengan koma. Kosong berlaku untuk seluruh akun yang memenuhi syarat."
      />
      <p className="muted">
        Satu voucher per invoice. Reservasi aktif ikut menghitung batas. Total
        QRIS minimal Rp1.000.
      </p>
    </ActionForm>
  );
}
export function VouchersAdmin({ id }: { id?: string }) {
  const query = useAdminData<
    PageList<Voucher> & {
      voucher?: Voucher;
      versions: {
        id: string;
        version: number;
        value: unknown;
        createdAt: string;
      }[];
      redemptions: {
        id: string;
        userId: string;
        status: string;
        payment: {
          id: string;
          amount: number;
          discount: number;
          status: string;
        };
      }[];
    }
  >("vouchers", id);
  return (
    <>
      <SectionHeading
        section="vouchers"
        id={id}
        description="Promosi dengan syarat, batas pemakaian, reservasi dan riwayat transaksi."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data &&
        (id ? (
          <>
            {query.data.voucher && (
              <VoucherEditor
                key={`${id}:${query.data.voucher.version}`}
                value={query.data.voucher}
              />
            )}
            <h2>Riwayat aturan voucher</h2>
            {query.data.versions.map((version) => (
              <details className="panel" key={version.id}>
                <summary>
                  Versi {version.version} - {formatDate(version.createdAt)}
                </summary>
                <pre className="admin-audit-value">
                  {JSON.stringify(version.value, null, 2)}
                </pre>
              </details>
            ))}
            <h2>Pemakaian terbaru</h2>
            <DataTable
              items={query.data.redemptions}
              columns={[
                {
                  label: "Invoice",
                  cell: (entry) => (
                    <Link href={`/admin/payments/${entry.payment.id}`}>
                      {entry.payment.id}
                    </Link>
                  ),
                },
                {
                  label: "Akun",
                  cell: (entry) => (
                    <Link href={`/admin/users/${entry.userId}`}>
                      {entry.userId}
                    </Link>
                  ),
                },
                {
                  label: "Status",
                  cell: (entry) => `${entry.status} / ${entry.payment.status}`,
                },
                {
                  label: "Diskon",
                  cell: (entry) => rupiah(entry.payment.discount),
                },
              ]}
            />
          </>
        ) : (
          <>
            <details className="panel">
              <summary>Buat voucher baru</summary>
              <VoucherEditor />
            </details>
            <Filters
              total={query.data.total}
              page={query.data.page}
              statuses={["active", "paused", "archived"]}
            />
            <DataTable
              items={query.data.items}
              columns={[
                {
                  label: "Kode",
                  cell: (voucher) => (
                    <Link href={`/admin/vouchers/${voucher.id}`}>
                      {voucher.code}
                      <small className="cell-sub">{voucher.title}</small>
                    </Link>
                  ),
                },
                {
                  label: "Diskon",
                  cell: (voucher) =>
                    voucher.kind === "percent"
                      ? `${voucher.value}%`
                      : rupiah(voucher.value),
                },
                { label: "Status", cell: (voucher) => voucher.status },
                {
                  label: "Reservasi + dipakai",
                  cell: (voucher) =>
                    `${voucher._count?.redemptions ?? 0}/${voucher.maxUses}`,
                },
                {
                  label: "Berakhir",
                  cell: (voucher) => formatDate(voucher.endsAt),
                },
              ]}
            />
          </>
        ))}
    </>
  );
}
