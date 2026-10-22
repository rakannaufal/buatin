"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";
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
    <div className="empty-state">
      <h1>Halaman belum dapat dimuat.</h1>
      <p>
        Coba kembali. Data proyek yang sudah tersimpan tetap berada di server.
      </p>
      <Button onClick={reset}>Coba kembali</Button>
    </div>
  );
}
