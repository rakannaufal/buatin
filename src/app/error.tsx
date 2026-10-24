"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { PublicState } from "@/components/public-state";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught error:", error);
  }, [error]);

  return (
    <PublicState
      title="Halaman belum dapat dimuat."
      illustration="public-error"
    >
      <p>
        Coba kembali. Data proyek yang sudah tersimpan tetap berada di server.
      </p>
      <Button onClick={reset}>Coba kembali</Button>
    </PublicState>
  );
}
