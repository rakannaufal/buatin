import Link from "next/link";
import { Artwork } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";
import { publicMetadata } from "@/server/seo";

export const metadata = publicMetadata(
  "Tentang Bantuin",
  "/about",
  "Kenali Bantuin: tujuan layanan, pengguna, alur penyusunan brief, dokumen yang dihasilkan dan batas penggunaannya.",
);

const contents = [
  ["tujuan", "Tujuan Bantuin"],
  ["pengguna", "Untuk siapa"],
  ["cara-kerja", "Cara kerja"],
  ["dokumen", "Isi dokumen"],
  ["batas-layanan", "Batas layanan"],
  ["data", "Data dan referensi"],
  ["pengelola", "Pengelola dan bantuan"],
];

const documentTopics = [
  [
    "Kebutuhan produk",
    "Tujuan website, pengguna sasaran, kebutuhan utama dan cakupan pengerjaan.",
  ],
  [
    "Alur dan aturan",
    "Perjalanan pengguna, aturan bisnis serta kondisi yang perlu ditangani.",
  ],
  [
    "Struktur aplikasi",
    "Pilihan teknologi, pembagian bagian aplikasi, data dan integrasi yang dibutuhkan.",
  ],
  [
    "Desain dan komponen",
    "Arah tampilan, komponen antarmuka, isi halaman dan kebutuhan aksesibilitas.",
  ],
  [
    "Keamanan dan privasi",
    "Batas akses, penanganan data serta kebutuhan perlindungan yang perlu diterapkan.",
  ],
  [
    "Pengujian dan rilis",
    "Skenario pengujian, pemeriksaan hasil dan kebutuhan sebelum aplikasi dipublikasikan.",
  ],
];

export default function AboutPage() {
  return (
    <PublicShell path="/about">
      <article className="about-page public-container">
        <header className="about-hero">
          <div>
            <h1>
              Tentang <em>Bantuin.</em>
            </h1>
            <p>
              Tempat merapikan ide website menjadi rencana yang bisa dibaca,
              ditinjau, dan dibawa ke pengerjaan.
            </p>
            <p>
              Anda membawa tujuan dan kebutuhan proyek. Bantuin membantu
              menyusunnya menjadi dokumen perencanaan dalam format Markdown.
            </p>
          </div>
          <Artwork name="auth-notebook" eager />
        </header>

        <div className="about-reading">
          <nav className="about-contents" aria-label="Isi halaman tentang">
            <p>Kenali Bantuin</p>
            <ul>
              {contents.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="about-body">
            <section id="tujuan" aria-labelledby="tujuan-heading">
              <h2 id="tujuan-heading">Mulai dari pemahaman yang sama.</h2>
              <p>
                Ide website sering dimulai dari catatan singkat, contoh
                tampilan, atau daftar fitur. Saat masuk ke pengerjaan, tim masih
                perlu menyepakati siapa penggunanya, apa yang harus dibuat, dan
                bagian mana yang perlu didahulukan.
              </p>
              <p>
                Bantuin membantu menata kebutuhan tersebut sebelum kode ditulis.
                Rencana dan dokumen memberi bahan pembicaraan yang lebih jelas
                antara pemilik ide, desainer, pengembang, dan alat bantu
                pemrograman. Asumsi yang belum tepat tetap perlu Anda tinjau dan
                perbaiki.
              </p>
            </section>

            <section id="pengguna" aria-labelledby="pengguna-heading">
              <h2 id="pengguna-heading">
                Untuk orang yang sedang menyiapkan website.
              </h2>
              <dl className="about-audience">
                <div>
                  <dt>Pemilik usaha dan organisasi</dt>
                  <dd>
                    Menyiapkan brief sebelum berdiskusi dengan pengembang.
                    Tujuan, kebutuhan pengguna, fitur, dan batas proyek dapat
                    dibahas dari satu dokumen.
                  </dd>
                </div>
                <div>
                  <dt>Desainer dan pengembang</dt>
                  <dd>
                    Menata kebutuhan awal sebagai bahan diskusi desain,
                    arsitektur, implementasi, dan pengujian bersama pemilik
                    proyek.
                  </dd>
                </div>
                <div>
                  <dt>Tim produk dan pembuat proyek mandiri</dt>
                  <dd>
                    Menentukan cakupan awal, meninjau pilihan teknis, dan
                    menyiapkan arahan untuk tim atau coding agent yang
                    digunakan.
                  </dd>
                </div>
              </dl>
              <p>
                Jenis proyek dapat berupa landing page, profil usaha,
                portofolio, blog, toko online, aplikasi layanan, atau kebutuhan
                khusus. Pilih jenis yang paling dekat, lalu sesuaikan detailnya
                dengan keadaan proyek Anda.
              </p>
            </section>

            <section id="cara-kerja" aria-labelledby="cara-kerja-heading">
              <h2 id="cara-kerja-heading">
                Dari brief ke dokumen yang bisa ditinjau.
              </h2>
              <ol className="about-workflow">
                <li>
                  <h3>Ceritakan kebutuhan proyek.</h3>
                  <p>
                    Tuliskan tujuan website, pengguna, fitur utama, dan batasan.
                    Tambahkan catatan atau referensi yang relevan jika
                    diperlukan. Brief bisa dimulai dari hal yang sudah Anda
                    ketahui.
                  </p>
                </li>
                <li>
                  <h3>Periksa rencana dan pilih dokumen.</h3>
                  <p>
                    Tinjau rekomendasi, jawab klarifikasi yang tersedia, dan
                    sesuaikan pilihan dokumen. Pastikan cakupannya sesuai
                    sebelum menjalankan proses generasi yang menggunakan kuota
                    akun.
                  </p>
                </li>
                <li>
                  <h3>Tinjau hasil, lalu bawa ke pengerjaan.</h3>
                  <p>
                    Baca hasilnya, perbaiki asumsi, dan unduh dokumen satu per
                    satu atau dalam ZIP. Gunakan sebagai arahan kerja; keputusan
                    akhir dan pemeriksaan implementasi tetap dilakukan oleh Anda
                    dan tim pengembang.
                  </p>
                </li>
              </ol>
            </section>

            <section id="dokumen" aria-labelledby="dokumen-heading">
              <h2 id="dokumen-heading">Apa yang ada di dalam hasilnya?</h2>
              <p>
                Isi paket mengikuti jenis website, brief, dan dokumen yang Anda
                pilih. Cakupannya dapat meliputi:
              </p>
              <dl className="about-document-list">
                {documentTopics.map(([title, description]) => (
                  <div key={title}>
                    <dt>{title}</dt>
                    <dd>{description}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Format Markdown dapat dibuka dengan editor teks dan dibagikan
                kepada tim. Tersedianya revisi, perbandingan hasil, dan template
                pribadi mengikuti manfaat paket. Rincian kuota, fitur, dan masa
                penyimpanan tersedia di{" "}
                <Link href="/pricing">halaman paket</Link>. Unduh salinan
                sebelum masa penyimpanan hasil berakhir.
              </p>
            </section>

            <section id="batas-layanan" aria-labelledby="batas-heading">
              <h2 id="batas-heading">Perencanaan tetap perlu diperiksa.</h2>
              <p>
                Dokumen inti disusun dari template terstruktur berdasarkan brief
                dan pilihan Anda. Analisis gambar dengan AI merupakan fitur
                opsional jika tersedia dan hanya dijalankan atas permintaan
                Anda.
              </p>
              <p>
                Pembuatan kode website, pembelian domain, penyediaan hosting,
                dan pekerjaan pengembang berada di luar layanan Bantuin. Dokumen
                perencanaan juga tidak menggantikan pengujian aplikasi,
                pemeriksaan keamanan, atau nasihat profesional untuk kebutuhan
                hukum dan bidang khusus.
              </p>
              <p>
                Ketepatan brief memengaruhi isi dokumen. Periksa kembali
                kebutuhan, aturan bisnis, pilihan teknologi, dan contoh yang
                digunakan sebelum menerapkannya. Baca{" "}
                <Link href="/disclaimer">batas penggunaan hasil</Link> serta{" "}
                <Link href="/terms">ketentuan layanan</Link> untuk penjelasan
                lebih lanjut.
              </p>
            </section>

            <section id="data" aria-labelledby="data-heading">
              <h2 id="data-heading">Bagikan materi seperlunya.</h2>
              <p>
                Brief dan lampiran dapat memuat informasi proyek. Gunakan materi
                yang berhak Anda bagikan dan hindari memasukkan password, kunci
                API, atau data sensitif yang tidak diperlukan. Hak atas materi
                yang diunggah tetap mengikuti pemiliknya.
              </p>
              <p>
                Gambar dikirim kepada provider AI ketika Anda meminta analisis,
                bukan semata-mata karena diunggah. Tujuan pemrosesan, masa
                simpan, serta jalur permintaan salinan atau penghapusan data
                dijelaskan dalam <Link href="/privacy">kebijakan privasi</Link>.
              </p>
            </section>

            <section id="pengelola" aria-labelledby="pengelola-heading">
              <h2 id="pengelola-heading">Pengelola dan bantuan.</h2>
              <p>
                Bantuin dikelola secara perorangan. Informasi kontak dan jalur
                pengaduan tersedia pada{" "}
                <Link href="/contact">halaman kontak</Link>. Untuk pertanyaan
                tentang akun, dokumen, kuota, atau pembayaran, Anda juga dapat
                membaca <Link href="/faq">FAQ</Link>.
              </p>
              <p>
                Jika mengalami kendala, sertakan penjelasan masalah dan nomor
                proyek atau tagihan yang berkaitan. Jangan menyertakan password,
                kode autentikasi, atau informasi rahasia dalam pesan bantuan.
              </p>
            </section>

            <div className="about-next">
              <h2>Sudah punya ide website?</h2>
              <p>
                Mulai dari tujuan, pengguna, dan fitur yang paling dibutuhkan.
              </p>
              <Link href="/signup" className="button button-primary">
                Mulai gratis
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PublicShell>
  );
}
