import Link from "next/link";
import type { Metadata } from "next";
import { Artwork } from "@/components/brand";
import { PublicFrame } from "@/components/public-frame";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PublicFrame path="">
      <section className="not-found-layout public-container">
        <div>
          <p className="not-found-code">404</p>
          <h1>Halaman tidak ditemukan.</h1>
          <p className="not-found-description">
            Alamatnya mungkin berubah atau halaman ini sudah dihapus. Periksa
            kembali alamatnya, atau lanjutkan dari beranda.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="button button-primary">
              Kembali ke beranda
            </Link>
            <Link href="/faq" className="button button-secondary">
              Lihat FAQ
            </Link>
          </div>
        </div>
        <Artwork name="public-not-found" eager />
      </section>
    </PublicFrame>
  );
}
