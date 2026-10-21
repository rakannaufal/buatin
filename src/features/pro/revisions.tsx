"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, post, message } from "@/components/api";
import { Button, Loading, Notice, Modal } from "@/components/ui";
import { useEntitlement } from "./library";
interface Revision {
  id: string;
  version: number;
  name: string;
  brief: string;
  preferences?: unknown;
  attachmentIds?: unknown;
}
export function Revisions({ id }: { id: string }) {
  const account = useEntitlement();
  if (!account.data?.entitlement.features.revisions) return null;
  return <RevisionHistory id={id} />;
}
function RevisionHistory({ id }: { id: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["revisions", id],
    queryFn: () =>
      api<{
        revisions: Revision[];
        current: {
          version: number;
          brief: string;
          name: string;
          preferences?: unknown;
          attachmentIds?: unknown;
        };
      }>(`/projects/${id}/revisions`),
  });
  const [selected, setSelected] = useState("");
  const restore = useMutation({
    mutationFn: () =>
      post(`/projects/${id}/revisions`, {
        revisionId: selected,
        briefVersion: query.data?.current.version,
      }),
    onSuccess: () => {
      router.refresh();
      window.location.reload();
    },
  });
  const revision = query.data?.revisions.find((item) => item.id === selected);
  return (
    <details className="quality-report">
      <summary>Riwayat revisi brief</summary>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Notice tone="error">{message(query.error)}</Notice>
      ) : !query.data.revisions.length ? (
        <p className="muted">
          Revisi tersimpan otomatis saat brief yang sudah tersimpan diubah.
        </p>
      ) : (
        <>
          <label htmlFor="brief-revision">Bandingkan dengan revisi</label>
          <select
            id="brief-revision"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Pilih versi</option>
            {query.data.revisions.map((item) => (
              <option key={item.id} value={item.id}>
                Versi {item.version}: {item.name}
              </option>
            ))}
          </select>
          {revision && (
            <>
              <div className="comparison-columns">
                <section>
                  <h3>Versi {revision.version}</h3>
                  <pre>{revision.brief}</pre>
                  <RevisionPreferences
                    preferences={revision.preferences}
                    attachmentIds={revision.attachmentIds}
                  />
                </section>
                <section>
                  <h3>Versi {query.data.current.version} saat ini</h3>
                  <pre>{query.data.current.brief}</pre>
                  <RevisionPreferences
                    preferences={query.data.current.preferences}
                    attachmentIds={query.data.current.attachmentIds}
                  />
                </section>
              </div>
              <Modal
                title="Pulihkan revisi brief?"
                description="Perubahan menjadi versi baru. Rencana dokumen perlu disusun ulang."
                trigger={
                  <Button variant="secondary">
                    Pulihkan versi {revision.version}
                  </Button>
                }
              >
                {restore.error && (
                  <Notice tone="error">{message(restore.error)}</Notice>
                )}
                <Button
                  busy={restore.isPending}
                  onClick={() => restore.mutate()}
                >
                  Konfirmasi pemulihan
                </Button>
              </Modal>
            </>
          )}
        </>
      )}
    </details>
  );
}
function RevisionPreferences({
  preferences,
  attachmentIds,
}: {
  preferences: unknown;
  attachmentIds: unknown;
}) {
  return (
    <details>
      <summary>
        Preferensi dan {Array.isArray(attachmentIds) ? attachmentIds.length : 0}{" "}
        referensi
      </summary>
      <pre>{JSON.stringify(preferences ?? {}, null, 2)}</pre>
    </details>
  );
}
