"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import { adminLabels, adminSections, type AdminSection } from "@/domain/admin";

export function useOperator() {
  return useQuery({
    queryKey: ["operator"],
    queryFn: () =>
      api<{
        role: string;
        userId: string;
        twoFactorEnabled: boolean;
        reauthUntil: string | null;
        unlocked: boolean;
      }>("/admin/identity"),
    refetchInterval: 60000,
  });
}
export function AdminUnlock() {
  const client = useQueryClient(),
    operator = useOperator();
  const form = useRef<HTMLFormElement>(null);
  const verify = useMutation({
    mutationFn: async () => {
      const data = new FormData(form.current!);
      return api("/admin/reauth", {
        method: "POST",
        body: JSON.stringify({
          password: data.get("password"),
          ...(data.get("code") ? { code: data.get("code") } : {}),
        }),
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["operator"] }),
    onSettled: () => form.current?.reset(),
  });
  return (
    <section className="admin-unlock" aria-label="Verifikasi tindakan admin">
      <div>
        <strong>
          {operator.data?.unlocked
            ? "Perubahan admin terbuka sementara"
            : "Verifikasi untuk mengubah admin"}
        </strong>
        <p className="muted">
          {operator.data?.unlocked
            ? `Berlaku sampai ${new Date(operator.data.reauthUntil!).toLocaleTimeString("id-ID")}.`
            : "Password dan autentikator diverifikasi server; berlaku lima menit."}
        </p>
      </div>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          verify.mutate();
        }}
      >
        <Field
          name="password"
          label="Password verifikasi admin"
          type="password"
          required
          autoComplete="current-password"
        />
        {operator.data?.twoFactorEnabled && (
          <Field
            name="code"
            label="Kode autentikator admin"
            required
            autoComplete="one-time-code"
          />
        )}
        <Button type="submit" variant="secondary" busy={verify.isPending}>
          Verifikasi akses
        </Button>
      </form>
      {verify.error && <Notice tone="error">{message(verify.error)}</Notice>}
    </section>
  );
}
export function AdminNavigation() {
  const pathname = usePathname(),
    router = useRouter(),
    operator = useOperator();
  const sections = adminSections.filter(
    (section) => section !== "staff" || operator.data?.role === "owner",
  );
  return (
    <nav className="admin-navigation" aria-label="Menu admin">
      <label className="admin-mobile-menu">
        Menu admin
        <select
          value={pathname.split("/")[2] ?? ""}
          onChange={(event) =>
            router.push(
              event.target.value ? `/admin/${event.target.value}` : "/admin",
            )
          }
        >
          <option value="">Ringkasan</option>
          {sections.map((section) => (
            <option key={section} value={section}>
              {adminLabels[section]}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-desktop-menu">
        <Link
          href="/admin"
          aria-current={pathname === "/admin" ? "page" : undefined}
        >
          Ringkasan
        </Link>
        {sections.map((section) => (
          <Link
            key={section}
            href={`/admin/${section}`}
            aria-current={
              pathname.startsWith(`/admin/${section}`) ? "page" : undefined
            }
          >
            {adminLabels[section]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
export function useAdminData<T>(section: string, id?: string) {
  const search = useSearchParams().toString();
  return useQuery({
    queryKey: ["admin-section", section, id, search],
    queryFn: () =>
      api<T>(
        `/admin/${section}${id ? `/${encodeURIComponent(id)}` : ""}${search ? `?${search}` : ""}`,
      ),
    // Keep filtered lists readable without carrying another account's detail into a new target.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === section && previousQuery.queryKey[2] === id
        ? previous
        : undefined,
  });
}
export function QueryState({
  pending,
  error,
}: {
  pending: boolean;
  error: unknown;
}) {
  const client = useQueryClient();
  if (pending) return <Loading label="Memuat data admin..." />;
  return error ? (
    <>
      <Notice tone="error">{message(error)}</Notice>
      <Button
        variant="secondary"
        onClick={() =>
          void Promise.all([
            client.invalidateQueries({ queryKey: ["admin-section"] }),
            client.invalidateQueries({ queryKey: ["admin"] }),
          ])
        }
      >
        Coba muat ulang
      </Button>
    </>
  ) : null;
}
export function Field({
  label,
  name,
  type = "text",
  value,
  required,
  min,
  max,
  help,
  autoComplete,
  options,
  multiline,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  help?: string;
  autoComplete?: string;
  options?: { value: string; label: string }[];
  multiline?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {options ? (
        <select name={name} defaultValue={value} required={required}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          name={name}
          defaultValue={value}
          required={required}
          rows={5}
          maxLength={max}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
          min={min}
          max={max}
          maxLength={type === "number" ? undefined : max}
          autoComplete={autoComplete}
          step={type === "number" ? "any" : undefined}
        />
      )}
      {help && <small className="muted">{help}</small>}
    </label>
  );
}
export function ActionForm({
  path,
  children,
  build,
  title,
  button,
  danger,
  method = "POST",
  onSuccess,
}: {
  path: string;
  children?: ReactNode;
  build: (values: FormData) => unknown;
  title?: string;
  button: string;
  danger?: boolean;
  method?: "POST" | "PATCH";
  onSuccess?: (value: unknown) => void;
}) {
  const client = useQueryClient(),
    receipt = useRef<{ payload: string; key: string } | null>(null);
  const mutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const serialized = JSON.stringify(payload);
      if (!receipt.current || receipt.current.payload !== serialized)
        receipt.current = { payload: serialized, key: crypto.randomUUID() };
      return api(path, {
        method,
        body: serialized,
        headers: { "Idempotency-Key": receipt.current.key },
      });
    },
    onSuccess: async (value) => {
      receipt.current = null;
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-section"] }),
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["settings"] }),
      ]);
      onSuccess?.(value);
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(build(new FormData(event.currentTarget)));
  }
  return (
    <form className="admin-action-form" onSubmit={submit}>
      {title && <h3>{title}</h3>}
      {children}
      <Field
        name="reason"
        label="Alasan perubahan"
        required
        min={8}
        max={500}
        help="Minimal 8 karakter. Jangan tulis password, token atau data rahasia."
      />
      {danger && (
        <label className="check-row">
          <input type="checkbox" required />
          Saya memahami dampak tindakan pada akun atau transaksi ini.
        </label>
      )}
      {mutation.error && (
        <Notice tone="error">{message(mutation.error)}</Notice>
      )}
      {mutation.isSuccess && (
        <Notice tone="info">Perubahan tersimpan dan tercatat.</Notice>
      )}
      <Button
        type="submit"
        variant={danger ? "danger" : "primary"}
        busy={mutation.isPending}
      >
        {button}
      </Button>
    </form>
  );
}
export type PageList<T> = { items: T[]; total: number; page: number };
export function DataTable<T extends { id: string }>({
  items,
  columns,
}: {
  items: T[];
  columns: { label: string; cell: (item: T) => ReactNode }[];
}) {
  if (!items.length)
    return <p className="admin-empty">Belum ada data yang sesuai filter.</p>;
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Daftar admin"
      tabIndex={0}
    >
      <table className="projects-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {columns.map((column) => (
                <td key={column.label}>{column.cell(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Filters({
  total,
  page,
  statuses = [],
  children,
}: {
  total: number;
  page: number;
  statuses?: string[];
  children?: ReactNode;
}) {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  function move(next: number) {
    const query = new URLSearchParams(search);
    query.set("page", String(next));
    router.push(`${pathname}?${query}`);
  }
  return (
    <>
      <form key={search.toString()} className="admin-filters" action={pathname}>
        <Field
          label="Cari nama, email atau ID"
          name="q"
          value={search.get("q") ?? ""}
          max={100}
        />
        {statuses.length > 0 && (
          <Field
            label="Status"
            name="status"
            value={search.get("status") ?? ""}
            options={[
              { value: "", label: "Semua status" },
              ...statuses.map((value) => ({ value, label: value })),
            ]}
          />
        )}
        {children}
        <Button variant="secondary" type="submit">
          Terapkan filter
        </Button>
        <Link href={pathname} className="text-button">
          Reset
        </Link>
      </form>
      <div className="admin-pagination">
        <span>
          {total} hasil; halaman {page}
        </span>
        <Button
          variant="ghost"
          disabled={page <= 1}
          onClick={() => move(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="ghost"
          disabled={page * 20 >= total}
          onClick={() => move(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </>
  );
}
export const reason = (form: FormData) => String(form.get("reason") ?? "");
export function DateFilters() {
  const search = useSearchParams();
  return (
    <>
      <Field
        name="from"
        label="Dari tanggal UTC"
        type="date"
        value={search.get("from") ?? ""}
      />
      <Field
        name="to"
        label="Sampai tanggal UTC"
        type="date"
        value={search.get("to") ?? ""}
      />
    </>
  );
}
export const number = (form: FormData, key: string) => Number(form.get(key));
export function SectionHeading({
  section,
  description,
  id,
}: {
  section: AdminSection;
  description: string;
  id?: string;
}) {
  return (
    <div className="page-heading compact">
      <div>
        {id && (
          <Link href={`/admin/${section}`} className="back-link">
            Kembali ke {adminLabels[section]}
          </Link>
        )}
        <h1>{adminLabels[section]}.</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
