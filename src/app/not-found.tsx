import Link from "next/link";
import { PublicState } from "@/components/public-state";
export default function NotFound() {
  return (
    <PublicState
      title="Halaman ini belum ketemu."
      illustration="public-not-found"
    >
      <p>Periksa alamatnya atau mulai kembali dari beranda.</p>
      <Link href="/" className="button button-primary">
        Kembali ke beranda
      </Link>
    </PublicState>
  );
}
