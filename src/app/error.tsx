"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
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
