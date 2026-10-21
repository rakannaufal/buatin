"use client";
import { useState } from "react";
import {
  ActionForm,
  DataTable,
  Field,
  QueryState,
  SectionHeading,
  reason,
  useAdminData,
} from "./shared";
type Entry = {
  id: string;
  kind: string;
  key: string;
  version: number;
  status: string;
  content: string;
  source: string;
  license: string;
  checksum: string;
};
export function ContentAdmin() {
  const query = useAdminData<{
    items: Entry[];
    templates: { key: string; name: string }[];
    skills: { key: string; name: string }[];
  }>("content");
  const [kind, setKind] = useState("template");
  return (
    <>
      <SectionHeading
        section="content"
        description="Versi panduan dengan sumber, lisensi, checksum, tinjau dan rollback. Script tidak dieksekusi."
      />
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <details className="panel">
            <summary>Draft template atau skill</summary>
            <label className="field">
              <span>Jenis panduan</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                <option value="template">Template dokumen</option>
                <option value="skill">Skill yang sudah siap</option>
              </select>
            </label>
            <ActionForm
              key={kind}
              path="/admin/content"
              button="Simpan draft panduan"
              build={(form) => ({
                kind,
                key: String(form.get("key")),
                content: String(form.get("content")),
                source: String(form.get("source")),
                license: String(form.get("license")),
                reason: reason(form),
              })}
            >
              <Field
                name="key"
                label="Panduan"
                options={(kind === "template"
                  ? query.data!.templates
                  : query.data!.skills
                ).map((entry) => ({ value: entry.key, label: entry.name }))}
              />
              <Field
                name="source"
                label="Sumber / commit / URL referensi"
                required
                max={300}
                help="Hanya metadata, URL tidak diunduh atau dijalankan."
              />
              <Field
                name="license"
                label="Lisensi / hak penggunaan"
                required
                max={100}
              />
              <Field
                name="content"
                label="Markdown panduan"
                multiline
                required
                max={32000}
              />
              <label className="check-row">
                <input type="checkbox" required />
                Hak penggunaan dan sumber sudah diperiksa.
              </label>
            </ActionForm>
          </details>
          <DataTable
            items={query.data.items}
            columns={[
              {
                label: "Panduan",
                cell: (entry) => (
                  <>
                    {entry.kind}: {entry.key}
                    <small className="cell-sub">
                      Versi {entry.version} - {entry.status}
                    </small>
                  </>
                ),
              },
              {
                label: "Sumber / preview",
                cell: (entry) => (
                  <details>
                    <summary>{entry.license}</summary>
                    <p>{entry.source}</p>
                    <small className="cell-sub">
                      Checksum {entry.checksum}
                    </small>
                    <pre className="admin-audit-value">{entry.content}</pre>
                  </details>
                ),
              },
              {
                label: "Publikasi",
                cell: (entry) => (
                  <ActionForm
                    path={`/admin/content/${entry.id}/${entry.status === "draft" ? "review" : entry.status === "published" ? "unpublish" : "publish"}`}
                    button={
                      entry.status === "draft"
                        ? "Tandai sudah ditinjau"
                        : entry.status === "published"
                          ? "Kembali ke panduan bawaan"
                          : entry.status === "archived"
                            ? "Rollback ke versi ini"
                            : "Publish versi ini"
                    }
                    danger={entry.status !== "draft"}
                    build={(form) => ({
                      version: entry.version,
                      reason: reason(form),
                    })}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
