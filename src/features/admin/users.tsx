"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate, rupiah } from "@/domain/billing";
import {
  ActionForm,
  DataTable,
  DateFilters,
  Field,
  Filters,
  QueryState,
  SectionHeading,
  number,
  reason,
  useAdminData,
  type PageList,
} from "./shared";
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  accessVersion: number;
  suspendedUntil: string | null;
  suspensionReason: string | null;
};
type Grant = {
  id: string;
  planName: string;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};
type Credit = {
  id: string;
  amount: number;
  used: number;
  expiresAt: string;
  revokedAt: string | null;
};
type UserDetail = {
  user: User;
  entitlement: {
    name: string;
    limit: number;
    used: number;
    creditRemaining: number;
  };
  sessions: { id: string; userAgent: string | null; createdAt: string }[];
  grants: Grant[];
  credits: Credit[];
  payments: { id: string; amount: number; status: string; createdAt: string }[];
  jobs: { id: string; status: string; done: number; total: number }[];
};
const plans = ["starter", "plus", "max"].map((value) => ({
  value,
  label: value,
}));
export function UsersAdmin({ id }: { id?: string }) {
  return id ? <UserAdminDetail id={id} /> : <UsersList />;
}
function UsersList() {
  const search = useSearchParams();
  const query = useAdminData<PageList<User>>("users");
  return (
    <>
      <SectionHeading
        section="users"
        description="Akun, akses, sesi, langganan dan kredit kompensasi."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <Filters
            total={query.data.total}
            page={query.data.page}
            statuses={["active", "suspended"]}
          >
            <Field
              label="Role"
              name="role"
              value={search.get("role") ?? ""}
              options={[
                { value: "", label: "Semua role" },
                ...["user", "admin", "owner"].map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
            <Field
              name="planId"
              value={search.get("planId") ?? ""}
              label="Paket aktif"
              options={[{ value: "", label: "Semua paket" }, ...plans]}
            />
            <Field
              name="verified"
              label="Verifikasi email"
              value={search.get("verified") ?? ""}
              options={[
                { value: "", label: "Semua akun" },
                { value: "true", label: "Terverifikasi" },
                { value: "false", label: "Belum verifikasi" },
              ]}
            />
            <DateFilters />
          </Filters>
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Pengguna",
                cell: (user) => (
                  <>
                    <Link href={`/admin/users/${user.id}`}>{user.name}</Link>
                    <small className="cell-sub">{user.email}</small>
                  </>
                ),
              },
              { label: "Role", cell: (user) => user.role },
              {
                label: "Status",
                cell: (user) => (
                  <>
                    {user.status}
                    {user.suspendedUntil && (
                      <small className="cell-sub">
                        Sampai {formatDate(user.suspendedUntil)}
                      </small>
                    )}
                  </>
                ),
              },
              {
                label: "Email / MFA",
                cell: (user) =>
                  `${user.emailVerified ? "Terverifikasi" : "Belum verifikasi"} / ${user.twoFactorEnabled ? "Aktif" : "Nonaktif"}`,
              },
              { label: "Daftar", cell: (user) => formatDate(user.createdAt) },
            ]}
          />
        </>
      )}
    </>
  );
}
function UserAdminDetail({ id }: { id: string }) {
  const query = useAdminData<UserDetail>("users", id);
  if (!query.data)
    return <QueryState pending={query.isPending} error={query.error} />;
  const { user, entitlement, sessions, grants, credits, payments, jobs } =
    query.data;
  const base = (form: FormData) => ({
    reason: reason(form),
    version: user.accessVersion,
  });
  return (
    <>
      <SectionHeading
        section="users"
        description={`${user.name} - ${user.email}`}
        id={id}
      />
      <QueryState pending={false} error={query.error} />
      <section className="panel admin-summary">
        <strong>{entitlement.name}</strong>
        <p>
          Kuota paket {entitlement.used}/{entitlement.limit}; bonus tersisa{" "}
          {entitlement.creditRemaining}.
        </p>
        <p>
          Status: {user.status}. {user.suspensionReason}
        </p>
        <code>{id}</code>
      </section>
      {user.role === "user" ? (
        <>
          <div className="admin-form-grid">
            <ActionForm
              path={`/admin/users/${id}/${user.status === "suspended" ? "restore" : "suspend"}`}
              title="Status akun"
              button={
                user.status === "suspended" ? "Pulihkan akun" : "Suspend akun"
              }
              danger
              build={(form) => ({
                ...base(form),
                until: form.get("until")
                  ? new Date(String(form.get("until"))).toISOString()
                  : null,
              })}
            >
              {user.status !== "suspended" && (
                <Field
                  name="until"
                  label="Berakhir (opsional, waktu lokal perangkat)"
                  type="datetime-local"
                  help="Kosong berarti tanpa batas waktu. Sesi dicabut segera."
                />
              )}
            </ActionForm>
            <ActionForm
              path={`/admin/users/${id}/sessions`}
              title="Cabut sesi"
              button="Cabut sesi terpilih"
              danger
              build={(form) => ({
                ...base(form),
                ...(form.get("sessionId")
                  ? { sessionId: String(form.get("sessionId")) }
                  : {}),
              })}
            >
              <Field
                name="sessionId"
                label="Sesi"
                options={[
                  { value: "", label: "Semua sesi pengguna" },
                  ...sessions.map((session) => ({
                    value: session.id,
                    label: `${formatDate(session.createdAt)} - ${session.userAgent?.slice(0, 60) ?? "Perangkat tidak diketahui"}`,
                  })),
                ]}
              />
            </ActionForm>
            <ActionForm
              path={`/admin/users/${id}/access`}
              title="Grant akses paket"
              button="Jadwalkan grant"
              build={(form) => ({
                ...base(form),
                planId: form.get("planId"),
                days: number(form, "days"),
              })}
            >
              <Field name="planId" label="Paket" options={plans} />
              <Field
                name="days"
                label="Durasi hari"
                type="number"
                min={1}
                max={365}
                required
              />
              <p className="muted">
                Dimulai setelah seluruh masa bayar/grant yang ada. Invoice
                tertunda harus diselesaikan dahulu.
              </p>
            </ActionForm>
            <ActionForm
              path={`/admin/users/${id}/credits`}
              title="Bonus generasi"
              button="Berikan kredit"
              build={(form) => ({
                ...base(form),
                amount: number(form, "amount"),
                days: number(form, "days"),
              })}
            >
              <Field
                name="amount"
                label="Jumlah generasi"
                type="number"
                min={1}
                max={1000}
                required
              />
              <Field
                name="days"
                label="Berlaku hari"
                type="number"
                min={1}
                max={365}
                required
              />
              <p className="muted">
                Kuota paket dipakai dahulu. Bonus tidak membuka fitur Pro.
              </p>
            </ActionForm>
          </div>
          <h2>Grant akses</h2>
          <DataTable
            items={grants}
            columns={[
              {
                label: "Paket / periode",
                cell: (grant) => (
                  <>
                    {grant.planName}
                    <small className="cell-sub">
                      {formatDate(grant.startsAt)} - {formatDate(grant.endsAt)}
                    </small>
                  </>
                ),
              },
              {
                label: "Tindakan",
                cell: (grant) =>
                  grant.revokedAt ? (
                    "Dicabut"
                  ) : (
                    <details>
                      <summary>Cabut akses promosi</summary>
                      <ActionForm
                        path={`/admin/users/${id}/revoke-access/${grant.id}`}
                        button="Cabut sisa akses"
                        danger
                        build={base}
                      />
                    </details>
                  ),
              },
            ]}
          />
          <h2>Kredit bonus</h2>
          <DataTable
            items={credits}
            columns={[
              {
                label: "Kredit",
                cell: (credit) => `${credit.used}/${credit.amount} terpakai`,
              },
              {
                label: "Berlaku sampai",
                cell: (credit) => formatDate(credit.expiresAt),
              },
              {
                label: "Tindakan",
                cell: (credit) =>
                  credit.revokedAt ? (
                    "Dicabut"
                  ) : (
                    <details>
                      <summary>Cabut sisa bonus</summary>
                      <ActionForm
                        path={`/admin/users/${id}/revoke-credit/${credit.id}`}
                        button="Cabut bonus"
                        danger
                        build={base}
                      />
                    </details>
                  ),
              },
            ]}
          />
        </>
      ) : (
        <p className="notice">
          Role operator dikelola owner melalui halaman Staf.
        </p>
      )}
      <h2>Pembayaran terakhir</h2>
      <DataTable
        items={payments}
        columns={[
          {
            label: "Invoice",
            cell: (payment) => (
              <Link href={`/admin/payments/${payment.id}`}>{payment.id}</Link>
            ),
          },
          { label: "Total", cell: (payment) => rupiah(payment.amount) },
          { label: "Status", cell: (payment) => payment.status },
        ]}
      />
      <h2>Generasi terakhir</h2>
      <DataTable
        items={jobs}
        columns={[
          {
            label: "Job",
            cell: (job) => (
              <Link href={`/admin/jobs?q=${job.id}`}>{job.id}</Link>
            ),
          },
          {
            label: "Status",
            cell: (job) => `${job.status} (${job.done}/${job.total})`,
          },
        ]}
      />
    </>
  );
}
export function StaffAdmin() {
  const query = useAdminData<{
    items: User[];
    invitations: {
      id: string;
      email: string;
      status: string;
      expiresAt: string;
    }[];
  }>("staff");
  return (
    <>
      <SectionHeading
        section="staff"
        description="Hanya owner. Perubahan role mencabut sesi; owner terakhir dilindungi."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <ActionForm
            path="/admin/staff"
            title="Undang admin"
            button="Kirim undangan"
            build={(form) => ({
              email: String(form.get("email")),
              reason: reason(form),
            })}
          >
            <Field name="email" label="Email staf" type="email" required />
            <p className="muted">
              Undangan sekali pakai, berlaku 24 jam. Penerima memakai akun
              terverifikasi dan MFA di domain publik.
            </p>
          </ActionForm>
          <h2>Operator</h2>
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Akun",
                cell: (user) => (
                  <>
                    {user.name}
                    <small className="cell-sub">{user.email}</small>
                  </>
                ),
              },
              { label: "Role", cell: (user) => user.role },
              {
                label: "Ubah role",
                cell: (user) => (
                  <details>
                    <summary>Kelola role</summary>
                    <ActionForm
                      path={`/admin/staff/${user.id}/role`}
                      button="Ubah role dan cabut sesi"
                      danger
                      build={(form) => ({
                        role: form.get("role"),
                        version: user.accessVersion,
                        reason: reason(form),
                      })}
                    >
                      <Field
                        name="role"
                        label={`Role ${user.name}`}
                        value={user.role}
                        options={["user", "admin", "owner"].map((value) => ({
                          value,
                          label: value,
                        }))}
                      />
                    </ActionForm>
                  </details>
                ),
              },
            ]}
          />
          <h2>Undangan</h2>
          <DataTable
            items={query.data.invitations}
            columns={[
              { label: "Email", cell: (invitation) => invitation.email },
              {
                label: "Status",
                cell: (invitation) =>
                  `${invitation.status} - ${formatDate(invitation.expiresAt)}`,
              },
              {
                label: "Tindakan",
                cell: (invitation) =>
                  invitation.status === "pending" ? (
                    <details>
                      <summary>Cabut undangan</summary>
                      <ActionForm
                        path={`/admin/staff/${invitation.id}/revoke`}
                        button="Cabut undangan"
                        danger
                        build={(form) => ({ reason: reason(form) })}
                      />
                    </details>
                  ) : (
                    "-"
                  ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
