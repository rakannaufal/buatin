import { PublicShell } from "@/components/public-shell";
import { PublicPricing } from "@/features/billing/plans";
import { publicMetadata } from "@/server/seo";
import { Artwork } from "@/components/brand";
export const metadata = publicMetadata("Paket dan fitur", "/pricing");
export default function Page() {
  return (
    <PublicShell path="/pricing">
      <section className="pricing-page public-container">
        <header className="pricing-hero">
          <div>
            <h1>
              Ruang untuk setiap
              <br />
              <em>tahap ide Anda.</em>
            </h1>
            <p>
              Mulai sekali secara gratis. Lanjutkan dengan paket bulanan sesuai
              kebutuhan.
            </p>
          </div>
          <Artwork name="pricing-documents" eager />
        </header>
        <PublicPricing />
        <aside className="pricing-help">
          <Artwork name="faq-conversation" />
          <div>
            <h2>Masih menimbang?</h2>
            <p>
              Pelajari kuota, masa aktif, dan cara pembayaran di{" "}
              <a href="/faq">FAQ</a>.
            </p>
          </div>
        </aside>
      </section>
    </PublicShell>
  );
}
