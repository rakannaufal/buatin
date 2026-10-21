"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, post, message } from "@/components/api";
import { Button, Notice } from "@/components/ui";
export function BatchQueue() {
  const query = useQuery({
    queryKey: ["batch-ready"],
    queryFn: () =>
      api<{
        projects: { id: string; name: string; plans: { version: number }[] }[];
      }>("/batch-ready"),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const start = useMutation({
    mutationFn: () =>
      post<{ ids: string[] }>(
        "/batch",
        {
          items: selected.map((id) => ({
            projectId: id,
            planVersion: query.data?.projects.find(
              (project) => project.id === id,
            )?.plans[0].version,
          })),
        },
        { "Idempotency-Key": key },
      ),
    onSuccess: () => void query.refetch(),
  });
  return (
    <details className="quality-report">
      <summary>Antrekan beberapa proyek, Pro Max</summary>
      <p>
        Hingga 10 proyek aktif per akun, satu dikerjakan pada satu waktu. Setiap
        proyek memakai satu kuota. Seluruh pilihan masuk antrean bersama atau
        ditolak jika kuota tidak cukup.
      </p>
      {query.error && <Notice tone="error">{message(query.error)}</Notice>}
      {query.isPending && <p role="status">Memuat rencana siap...</p>}
      {!query.isPending && !query.data?.projects.length && (
        <p className="muted">
          Belum ada rencana siap. Susun rencana dari editor proyek terlebih
          dahulu.
        </p>
      )}
      {query.data?.projects.map((project) => (
        <label key={project.id} className="check-row">
          <input
            type="checkbox"
            checked={selected.includes(project.id)}
            disabled={start.isPending}
            onChange={(event) => {
              setSelected((items) =>
                event.target.checked
                  ? [...items, project.id]
                  : items.filter((id) => id !== project.id),
              );
              setKey(crypto.randomUUID());
            }}
          />
          <span>{project.name}</span>
        </label>
      ))}
      {start.error && <Notice tone="error">{message(start.error)}</Notice>}
      {start.data ? (
        <Notice tone="info">
          Proyek sudah diantrekan.{" "}
          {start.data.ids.map((id, index) => (
            <Link key={id} href={`/jobs/${id}`} className="text-button">
              Proses {index + 1}{" "}
            </Link>
          ))}
        </Notice>
      ) : (
        <Button
          disabled={!selected.length || selected.length > 10}
          busy={start.isPending}
          onClick={() => start.mutate()}
        >
          Antrekan {selected.length} proyek
        </Button>
      )}
    </details>
  );
}
