import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Artwork } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { webTypes } from "@/domain/catalog";
import { publicMetadata } from "@/server/seo";

export const metadata = publicMetadata("Dari ide, jadi terarah", "/");

const steps = [
  {
    image: "workflow-brief",
    title: "Ceritakan idenya.",
    description:
      "Tujuan, pengguna, fitur utama, dan batasan. Tidak harus langsung rapi. Draft bisa dilanjutkan kapan saja.",
  },
  {
    image: "workflow-review",
    title: "Rapikan rencananya.",
    description:
      "Jawab klarifikasi dan periksa pilihan dokumen. Sesuaikan checklist dengan kebutuhan proyek Anda.",
  },
  {
    image: "workflow-export",
    title: "Bawa ke pengerjaan.",
    description:
      "Tinjau hasilnya, unduh Markdown atau ZIP, lalu gunakan sebagai arahan untuk coding agent dan tim Anda.",
  },
];

const documents = [
  ["specs/prd.md", "Tujuan produk, pengguna, dan kebutuhan utama."],
  ["specs/architecture.md", "Struktur aplikasi, teknologi, dan integrasi."],
  ["specs/security.md", "Batas akses dan penanganan data."],
  ["specs/testing.md", "Skenario pengujian dan kriteria penerimaan."],
];

export default function Home() {
  return (
    <PublicShell>
      <section
        className="home-hero public-container"
        aria-labelledby="hero-heading"
      >
        <div className="hero-copy">
          <h1 id="hero-heading">
            <span>Ide website Anda,</span>
            <em>
              buatin <span className="ink-highlight">rencananya.</span>
            </em>
          </h1>
          <p>
            Ubah brief menjadi spesifikasi terarah untuk coding agent dan tim
            yang akan membangunnya.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/signup">
              Mulai gratis <ArrowRight size={18} />
            </Link>
            <Link className="button button-secondary" href="#cara-kerja">
              Lihat cara kerja
            </Link>
          </div>
          <p className="hero-free-note">
            <Check size={17} aria-hidden="true" />
            Satu paket dokumen gratis per akun. Tanpa pembayaran.
          </p>
        </div>
        <figure className="hero-art">
          <span className="hero-scribble" aria-hidden="true">
            Mulai dari coretan...
          </span>
          <picture>
            <source
              media="(max-width: 600px)"
              srcSet="/assets/illustrations/hero-planning-mobile.svg"
              width={1024}
              height={1024}
            />
            <Image
              src="/assets/illustrations/hero-planning.svg"
              alt=""
              width={1536}
              height={1024}
              loading="eager"
              fetchPriority="high"
              unoptimized
            />
          </picture>
          <figcaption>...jadi bekal untuk membangun.</figcaption>
        </figure>
      </section>
      <section
        className="website-types public-container"
        aria-labelledby="types-heading"
      >
        <h2 id="types-heading">Apa pun ide websitenya.</h2>
        <ul>
          {webTypes.map((type) => (
            <li key={type.id}>{type.label}</li>
          ))}
        </ul>
      </section>
      <section
        className="home-workflow public-container"
        id="cara-kerja"
        aria-labelledby="workflow-heading"
      >
        <div className="section-intro">
          <h2 id="workflow-heading">
            Dari brief ke <em>arah kerja.</em>
          </h2>
          <p>Anda membawa idenya. Buatin membantu menyusun dokumennya.</p>
        </div>
        <ol className="workflow-steps">
          {steps.map((step, index) => (
            <li key={step.image}>
              <Artwork name={step.image} />
              <div className="step-title">
                <span aria-hidden="true">{index + 1}</span>
                <h3>{step.title}</h3>
              </div>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="home-output" aria-labelledby="output-heading">
        <div className="output-layout public-container">
          <div className="sample-paper">
            <p className="sample-caption">Contoh struktur paket</p>
            <h3>
              Satu proyek.
              <br />
              Rencana yang saling terhubung.
            </h3>
            <ul className="document-examples">
              {documents.map(([name, description]) => (
                <li key={name}>
                  <code>{name}</code>
                  <p>{description}</p>
                </li>
              ))}
            </ul>
            <p className="sample-footnote">
              Sebagian dari hingga 43 Markdown dan satu manifest.
            </p>
          </div>
          <div className="output-copy">
            <h2 id="output-heading">
              Bukan cuma ide
              <br />
              di <em>kepala.</em>
            </h2>
            <p>
              Kebutuhan produk, arsitektur, keamanan, sampai pengujian punya
              tempatnya sendiri. Dokumen disusun dari brief dan pilihan Anda.
            </p>
            <ul className="output-benefits">
              <li>
                <Check size={20} />
                <span>Pilih dokumen yang memang diperlukan.</span>
              </li>
              <li>
                <Check size={20} />
                <span>Baca preview sebelum mengunduh.</span>
              </li>
              <li>
                <Check size={20} />
                <span>Unduh satu per satu atau sekaligus dalam ZIP.</span>
              </li>
            </ul>
            <p className="output-limit">
              Hasilnya dokumen perencanaan. Kode aplikasi dibangun setelah
              rencananya Anda tinjau.
            </p>
            <Link href="/faq" className="text-button">
              Kenali hasil Buatin <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="home-plans public-container"
        aria-labelledby="plans-heading"
      >
        <div>
          <h2 id="plans-heading">
            Ada ide berikutnya?
            <br />
            <em>Masih ada ruang.</em>
          </h2>
          <p>
            Bandingkan kuota, masa simpan, dan fitur setiap paket. Langganan
            bulanan dibayar manual lewat QRIS.
          </p>
          <Link href="/pricing" className="button button-secondary">
            Bandingkan paket <ArrowRight size={17} />
          </Link>
        </div>
        <Artwork name="pricing-documents" />
      </section>
      <section
        className="home-closing public-container"
        aria-labelledby="closing-heading"
      >
        <Artwork name="contact-message" />
        <div>
          <h2 id="closing-heading">
            Simpan dulu idenya.
            <br />
            <em>Mulai dari satu brief.</em>
          </h2>
          <Link className="button button-primary" href="/signup">
            Mulai gratis <ArrowRight size={18} />
          </Link>
          <p>
            Masih ada pertanyaan? <Link href="/faq">Baca FAQ</Link>.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
