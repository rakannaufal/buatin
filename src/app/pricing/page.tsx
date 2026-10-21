import { PublicShell } from "@/components/public-shell";
import { PublicPricing } from "@/features/billing/plans";
export const metadata = { title: "Paket dan fitur" };
export default function Page() {
  return (
    <PublicShell>
      <section className="public-content">
        <div className="public-heading">
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
        <PublicPricing />
      </section>
    </PublicShell>
  );
}
