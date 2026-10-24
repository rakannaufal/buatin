import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Folio } from "@/components/ui";
import { webTypes } from "@/domain/catalog";
import { publicMetadata } from "@/server/seo";
export const metadata = publicMetadata("Dari ide, jadi terarah", "/");
export default function Home() {
  return (
    <PublicShell>
      <section className="landing-hero">
        <div className="hero-folio">
          <Folio />
        </div>
        <h1>
          Ide website Anda,
          <br />
          <em>buatin rencananya.</em>
        </h1>
        <p>
          Ubah brief menjadi spesifikasi terarah untuk coding agent dan tim yang
          akan membangunnya.
        </p>
        <div className="inline-actions">
          <Link className="button button-primary" href="/signup">
            Mulai gratis <ArrowRight size={18} />
          </Link>
          <Link className="button button-ghost" href="/#cara-kerja">
            Lihat cara kerja
          </Link>
        </div>
        <small>Satu paket dokumen gratis per akun. Tanpa pembayaran.</small>
      </section>
      <section className="landing-types">
        <span>Dirancang untuk kebutuhan website Anda</span>
        <div>
          {webTypes.map((type) => (
            <span key={type.id}>{type.label}</span>
          ))}
        </div>
      </section>
      <section className="landing-workflow" id="cara-kerja">
        <div>
          <h2>Dari brief ke arah kerja.</h2>
          <p>
            Buatin menyusun dokumen spesifikasi, termasuk kebutuhan produk,
            arsitektur, keamanan, dan rencana implementasi. Kode aplikasi
            dibangun setelah dokumennya Anda tinjau.
          </p>
          <Link className="text-button" href="/signup">
            Susun brief pertama <ArrowRight size={16} />
          </Link>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Ceritakan yang ingin dibuat.</h3>
              <p>
                Tujuan, pengguna, fitur utama, dan batasan. Draft dapat
                dilanjutkan kapan saja.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Periksa pilihan dokumen.</h3>
              <p>
                Jawab klarifikasi, lihat alasan pemilihan, sesuaikan checklist.
                Hingga 43 Markdown dan satu manifest.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Tinjau, lalu bawa ke pengerjaan.</h3>
              <p>
                Baca preview, periksa laporan kualitas, unduh ZIP atau file
                individual. Gunakan prompt yang tersedia untuk coding agent.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="landing-pro">
        <h2>
          Proyek berikutnya
          <br />
          punya ruang lebih.
        </h2>
        <div>
          <p>
            Pro Starter menyediakan 3 generasi per minggu. Pro Plus menambahkan
            revisi, perbandingan, preset, dan regenerasi pilihan. Pro Max
            membuka template pribadi serta antrean beberapa proyek.
          </p>
          <p>
            Perpanjang per bulan melalui QRIS. Kuota reset Senin 00.00 WIB
            selama paket aktif.
          </p>
          <Link href="/pricing" className="button button-secondary">
            Bandingkan paket
          </Link>
        </div>
      </section>
      <section className="landing-end">
        <h2>Mulai dari satu brief yang jelas.</h2>
        <Link className="button button-primary" href="/signup">
          Mulai gratis <ArrowRight size={18} />
        </Link>
      </section>
    </PublicShell>
  );
}
