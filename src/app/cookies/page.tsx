import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Kebijakan cookie",
  "/cookies",
  "Penggunaan cookie untuk sesi akun, autentikasi dan keamanan Bantuin.",
);

export default function Page() {
  return (
    <ServicePage path="/cookies">
      <h1>Kebijakan cookie</h1>
      <ServiceUpdated />
      <p>
        Cookie adalah data kecil yang disimpan browser untuk membantu website
        mengenali sesi dan menjalankan fungsi tertentu. Bantuin menggunakan
        cookie untuk autentikasi dan keamanan akun.
      </p>

      <h2>Cookie yang diperlukan</h2>
      <ul>
        <li>
          Sesi akun: menjaga status masuk agar Anda dapat membuka proyek,
          tagihan dan pengaturan. Sesi akun berlaku hingga tujuh hari dan dapat
          diperbarui selama digunakan.
        </li>
        <li>
          Autentikasi: membantu memverifikasi proses masuk, termasuk mencocokkan
          proses masuk Google dan verifikasi dua faktor jika digunakan.
        </li>
        <li>
          Keamanan: mendukung pemeriksaan permintaan dan perlindungan dari
          penyalahgunaan. Turnstile dapat memproses sinyal browser serta
          perangkat saat verifikasi keamanan ditampilkan.
        </li>
      </ul>
      <p>
        Masa berlaku cookie autentikasi dapat berbeda sesuai fungsinya; tidak
        semua cookie berlaku tujuh hari. Keluar dari akun atau mencabut sesi
        menghentikan akses sesi tersebut.
      </p>

      <h2>Analitik dan iklan</h2>
      <p>
        Aplikasi Bantuin saat ini tidak memasang cookie iklan atau memuat alat
        analitik pemasaran. Catatan teknis untuk keamanan dan operasional tetap
        dapat diproses sebagaimana dijelaskan dalam{" "}
        <Link href="/privacy">Kebijakan Privasi</Link>.
      </p>
      <p>
        Jika alat pelacakan opsional ditambahkan, tujuan dan pihak penerimanya
        perlu dijelaskan. Persetujuan harus diminta terlebih dahulu apabila
        diwajibkan oleh hukum yang berlaku.
      </p>

      <h2>Mengelola cookie</h2>
      <p>
        Anda dapat menghapus atau memblokir cookie melalui pengaturan browser.
        Memblokir cookie yang diperlukan dapat membuat proses masuk dan fitur
        akun tidak berfungsi. Anda juga dapat melihat dan mencabut sesi melalui{" "}
        <Link href="/account">halaman Akun</Link>.
      </p>
      <p>
        Ketika membuka Google atau aplikasi pembayaran, pemrosesan pada layanan
        tersebut mengikuti kebijakannya sendiri. Pertanyaan tentang cookie
        Bantuin dapat disampaikan melalui{" "}
        <Link href="/contact">kontak bantuan</Link>.
      </p>
    </ServicePage>
  );
}
