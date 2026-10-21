"use client";
import { Notice } from "@/components/ui";
import {
  ActionForm,
  Field,
  QueryState,
  SectionHeading,
  number,
  reason,
  useAdminData,
} from "./shared";
type Site = {
  announcement: string;
  supportEmail: string;
  faq: string;
  privacyNotice: string;
  termsNotice: string;
};
type Controls = {
  pauseSignup: boolean;
  pauseCheckout: boolean;
  pauseGeneration: boolean;
  maintenanceMessage: string;
  dailyRequests: number;
  userDailyRequests: number;
  dailyTokens: number;
  userDailyTokens: number;
  dailyBudgetUsd: number;
  inputRate: number;
  outputRate: number;
  adminCreditLimit: number;
  adminGrantDays: number;
};
const controlLabels: Record<
  Exclude<
    keyof Controls,
    "pauseSignup" | "pauseCheckout" | "pauseGeneration" | "maintenanceMessage"
  >,
  string
> = {
  dailyRequests: "Request global / hari UTC",
  userDailyRequests: "Request per akun / hari UTC",
  dailyTokens: "Token global / hari UTC",
  userDailyTokens: "Token per akun / hari UTC",
  dailyBudgetUsd: "Batas estimasi USD / hari",
  inputRate: "Tarif konservatif input USD / 1 juta token",
  outputRate: "Tarif konservatif output USD / 1 juta token",
  adminCreditLimit: "Batas kumulatif kredit admin / hari UTC",
  adminGrantDays: "Batas kumulatif hari grant admin / hari UTC",
};
export function SettingsAdmin() {
  const query = useAdminData<{
    site: { version: number; value: Site };
    controls?: { version: number; value: Controls };
    history: {
      id: string;
      key: string;
      version: number;
      value: Site | Controls;
      createdAt: string;
    }[];
  }>("settings");
  if (!query.data)
    return <QueryState pending={query.isPending} error={query.error} />;
  const { site, controls } = query.data;
  return (
    <>
      <SectionHeading
        section="settings"
        description="Konten situs serta kontrol layanan bertipe. Kredensial tetap di environment privat."
      />
      <ActionForm
        key={`site-${site.version}`}
        path="/admin/settings/site"
        title="Konten publik"
        button="Terbitkan pengaturan situs"
        build={(form) => ({
          version: site.version,
          reason: reason(form),
          value: Object.fromEntries(
            Object.keys(site.value).map((key) => [
              key,
              String(form.get(key) ?? ""),
            ]),
          ),
        })}
      >
        <Field
          name="announcement"
          label="Pengumuman layanan"
          value={site.value.announcement}
          max={500}
        />
        <Field
          name="supportEmail"
          label="Email bantuan publik"
          type="email"
          value={site.value.supportEmail}
        />
        <Field
          name="faq"
          label="FAQ tambahan (teks)"
          multiline
          value={site.value.faq}
          max={12000}
        />
        <Field
          name="privacyNotice"
          label="Pemberitahuan privasi tambahan"
          multiline
          value={site.value.privacyNotice}
          max={12000}
        />
        <Field
          name="termsNotice"
          label="Ketentuan tambahan"
          multiline
          value={site.value.termsNotice}
          max={12000}
        />
      </ActionForm>
      {controls && (
        <ActionForm
          key={`controls-${controls.version}`}
          path="/admin/settings/controls"
          title="Kontrol owner"
          button="Simpan kontrol operasional"
          danger
          build={(form) => ({
            version: controls.version,
            reason: reason(form),
            value: {
              ...Object.fromEntries(
                Object.keys(controlLabels).map((key) => [
                  key,
                  number(form, key),
                ]),
              ),
              pauseSignup: form.get("pauseSignup") === "on",
              pauseCheckout: form.get("pauseCheckout") === "on",
              pauseGeneration: form.get("pauseGeneration") === "on",
              maintenanceMessage: String(form.get("maintenanceMessage") ?? ""),
            },
          })}
        >
          <Notice>
            Batas request/token/USD panel tidak dapat melampaui batas keras
            environment. Tarif konservatif harus mencakup model/combo yang
            dipilih. Angka nol pada tarif berarti belum dikonfigurasi.
          </Notice>
          <fieldset className="admin-checkboxes">
            <legend>Jeda layanan</legend>
            {[
              { key: "pauseSignup", label: "Jeda pendaftaran baru" },
              { key: "pauseCheckout", label: "Jeda checkout baru" },
              { key: "pauseGeneration", label: "Jeda rencana/generasi baru" },
            ].map((item) => (
              <label key={item.key} className="check-row">
                <input
                  name={item.key}
                  type="checkbox"
                  defaultChecked={
                    controls.value[item.key as keyof Controls] === true
                  }
                />
                {item.label}
              </label>
            ))}
          </fieldset>
          <p className="muted">
            Callback/rekonsiliasi tetap berjalan. Job yang sudah berjalan
            mengikuti snapshot dan batas biaya.
          </p>
          <Field
            name="maintenanceMessage"
            label="Pesan jeda layanan"
            value={controls.value.maintenanceMessage}
            max={300}
          />
          <div className="admin-fields-grid">
            {Object.entries(controlLabels).map(([key, label]) => (
              <Field
                name={key}
                key={key}
                label={label}
                type="number"
                min={key.includes("Requests") || key.includes("Tokens") ? 1 : 0}
                value={Number(controls.value[key as keyof Controls])}
                required
              />
            ))}
          </div>
        </ActionForm>
      )}
      <h2>Riwayat pengaturan</h2>
      {query.data.history.map((entry) => (
        <details className="panel" key={entry.id}>
          <summary>
            {entry.key} versi {entry.version} -{" "}
            {new Date(entry.createdAt).toLocaleString("id-ID")}
          </summary>
          <pre className="admin-audit-value">
            {JSON.stringify(entry.value, null, 2)}
          </pre>
          <ActionForm
            path={`/admin/settings/${entry.key === "admin.controls" ? "controls" : "site"}`}
            button="Pulihkan sebagai versi baru"
            danger
            build={(form) => ({
              version:
                entry.key === "admin.controls"
                  ? controls?.version
                  : site.version,
              reason: reason(form),
              value: entry.value,
            })}
          />
        </details>
      ))}
    </>
  );
}
