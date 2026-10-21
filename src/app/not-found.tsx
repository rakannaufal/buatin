import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Halaman tidak ditemukan.</h1>
      <Link href="/dashboard" className="button button-primary">
        Kembali ke workspace
      </Link>
    </div>
  );
}
