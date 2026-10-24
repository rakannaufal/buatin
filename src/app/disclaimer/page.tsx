import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Disclaimer dan batas penggunaan hasil",
  "/disclaimer",
  "Cakupan dokumen Buatin, hal yang perlu ditinjau dan batas analisis gambar AI.",
);

export default function Page() {
  return (
    <ServicePage path="/disclaimer">
      <h1>Batas penggunaan hasil</h1>
      <ServiceUpdated />
      <p>
        Buatin membantu menyusun rencana website. Dokumen yang dihasilkan perlu
        ditinjau sesuai kebutuhan proyek sebelum dijadikan dasar pengerjaan.
      </p>

      <h2>Dokumen bukan produk yang sudah dibangun</h2>
      <p>
        Spesifikasi, daftar pengujian dan panduan keamanan menjelaskan hal yang
        perlu dikerjakan. Isinya tidak membuktikan bahwa kode telah dibuat,
        pengujian telah dijalankan atau sistem telah lolos audit. Pembuatan dan
        peluncuran website dilakukan terpisah oleh Anda atau tim pengembang.
      </p>

      <h2>Periksa asumsi dan rekomendasi</h2>
      <p>
        Template dan analisis gambar dapat menghasilkan asumsi yang kurang tepat
        atau belum lengkap. Periksa ruang lingkup, pilihan teknologi, kebutuhan
        data, akses pengguna dan kriteria pengujian. Cocokkan rekomendasi teknis
        dengan dokumentasi resmi serta kondisi proyek saat implementasi.
      </p>

      <h2>Analisis gambar dan hak penggunaan</h2>
      <p>
        Analisis AI merupakan interpretasi gambar, bukan verifikasi fakta,
        identitas, kepemilikan atau lisensi. Kemiripan referensi tidak
        memberikan izin untuk menyalin karya pihak lain. Pastikan penggunaan
        gambar, font, merek dan materi lain memiliki dasar izin yang sesuai.
      </p>

      <h2>Kebutuhan pemeriksaan khusus</h2>
      <p>
        Dokumen perencanaan tidak menggantikan pemeriksaan hukum, keamanan atau
        aksesibilitas pada produk yang benar-benar dibangun. Untuk proyek yang
        mengolah data pribadi, pembayaran atau fungsi lain yang diatur khusus,
        libatkan pihak yang memiliki keahlian sesuai kebutuhan tersebut.
      </p>

      <h2>Tanggung jawab layanan</h2>
      <p>
        Buatin tidak menjanjikan hasil bisnis, peringkat pencarian atau
        penerimaan proyek oleh pihak lain. Batas penggunaan hasil ini tidak
        membebaskan pengelola dari kewajiban memberikan layanan sesuai pembelian
        maupun tanggung jawab yang ditetapkan undang-undang. Untuk kendala
        layanan, gunakan <Link href="/contact">kontak bantuan</Link> atau baca{" "}
        <Link href="/refund">Kebijakan Pengembalian Dana</Link>.
      </p>
    </ServicePage>
  );
}
