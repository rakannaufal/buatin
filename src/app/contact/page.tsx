import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Kontak dan pengaduan",
  "/contact",
  "Jalur bantuan untuk akun, dokumen, tagihan dan permintaan privasi Buatin.",
);

export default function Page() {
  return (
    <ServicePage path="/contact">
      <h1>Kontak dan pengaduan</h1>
      <ServiceUpdated />
      <p>
        Gunakan <Link href="/support">Bantuan</Link> untuk kendala akun, dokumen
        atau pembayaran. Anda perlu masuk untuk membuat tiket dan membaca
        balasan pada akun yang sama.
      </p>

      <h2>Informasi yang membantu pemeriksaan</h2>
      <p>
        Jelaskan kendala, waktu kejadian dan langkah yang sudah dicoba. Untuk
        pembayaran, sertakan nomor tagihan. Untuk dokumen, sertakan nama proyek
        atau nomor proses. Jika menyertakan tangkapan layar, tutupi informasi
        pribadi yang tidak berkaitan dengan kendala.
      </p>
      <p>
        Jangan mengirim password, OTP, PIN, kode pemulihan atau kunci API.
        Masalah keamanan dan data pribadi perlu dilaporkan melalui jalur privat,
        bukan komentar atau unggahan publik.
      </p>

      <h2>Permintaan data dan pengembalian dana</h2>
      <p>
        Permintaan salinan atau penghapusan data tersedia pada{" "}
        <Link href="/account">halaman Akun</Link>. Baca{" "}
        <Link href="/privacy">Kebijakan Privasi</Link> dan{" "}
        <Link href="/refund">Kebijakan Pengembalian Dana</Link> untuk rincian
        pemeriksaan yang diperlukan.
      </p>
      <p>
        Jawaban tentang penggunaan, paket dan penyimpanan tersedia pada{" "}
        <Link href="/faq">FAQ</Link>.
      </p>
    </ServicePage>
  );
}
