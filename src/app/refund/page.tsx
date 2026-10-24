import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Kebijakan pengembalian dana",
  "/refund",
  "Cara mengajukan pengembalian dana, penanganan tagihan dan pengembalian kuota Buatin.",
);

export default function Page() {
  return (
    <ServicePage path="/refund">
      <h1>Kebijakan pengembalian dana</h1>
      <ServiceUpdated />
      <p>
        Kebijakan ini berlaku untuk pembelian paket Buatin. Pengembalian dana
        berarti pengembalian uang yang sudah dibayar. Pengembalian kuota hanya
        memulihkan kesempatan penggunaan di akun; keduanya ditangani terpisah.
      </p>

      <h2>Masalah yang dapat diajukan</h2>
      <ul>
        <li>Pembayaran tercatat ganda untuk pembelian yang sama.</li>
        <li>Paket tidak aktif setelah pembayaran berhasil diverifikasi.</li>
        <li>Nominal atau paket yang diterima tidak sesuai transaksi.</li>
        <li>
          Layanan berbayar tidak diberikan sebagaimana disepakati atau tidak
          dapat digunakan karena kegagalan layanan.
        </li>
      </ul>
      <p>
        Pengelola memeriksa transaksi dan kendala sebelum menentukan
        penyelesaian. Bergantung pada masalahnya, penyelesaian dapat berupa
        pengaktifan paket yang benar, pemulihan layanan atau pengembalian dana.
        Hak atas pengembalian atau ganti rugi yang diwajibkan hukum tetap
        berlaku.
      </p>

      <h2>Cara mengajukan</h2>
      <ol>
        <li>
          Buka <Link href="/support">Bantuan</Link> dari akun yang digunakan
          untuk membeli. Jika tidak dapat masuk, gunakan jalur pada{" "}
          <Link href="/contact">halaman kontak</Link>.
        </li>
        <li>
          Sertakan nomor tagihan, tanggal, nominal pembayaran dan penjelasan
          kendala. Lampirkan bukti yang relevan dengan menutupi data lain yang
          tidak diperlukan.
        </li>
        <li>
          Pengelola mencocokkan catatan Buatin dengan penyedia pembayaran dan
          menyampaikan hasil pemeriksaan beserta langkah penyelesaiannya.
        </li>
      </ol>
      <p>
        Jangan mengirim PIN, OTP, password, kode pemulihan atau kunci API.
        Informasi tujuan pengembalian hanya diminta jika diperlukan melalui
        jalur bantuan resmi.
      </p>

      <h2>Pembayaran belum tercatat</h2>
      <p>
        Jika saldo sudah terpotong tetapi tagihan masih menunggu, periksa status
        pada halaman tagihan dan laporkan bila belum berubah. Jangan membayar
        ulang tagihan yang sama selama pemeriksaan. Bukti potongan saldo
        membantu penelusuran, tetapi status akhir tetap perlu dicocokkan dengan
        Duitku.
      </p>

      <h2>Pelaksanaan pengembalian dana</h2>
      <p>
        Permintaan yang disetujui diproses manual oleh pengelola. Pengembalian
        tidak terjadi otomatis setelah tiket dikirim. Untuk refund penuh, jumlah
        yang dikembalikan mengikuti total yang benar-benar dibayar pada tagihan
        setelah diskon.
      </p>
      <p>
        Metode, informasi penerima dan perkiraan waktu pengembalian dikonfirmasi
        melalui bantuan setelah transaksi diperiksa. Anda menerima konfirmasi
        setelah dana dikembalikan. Jika pengiriman dana terkendala, pengelola
        menindaklanjuti kendala tersebut melalui bantuan.
      </p>
      <p>
        Setelah refund penuh selesai, sisa akses paket dari tagihan tersebut
        dihentikan. Tagihan dan catatan pengembalian tetap disimpan untuk
        administrasi.
      </p>

      <h2>Pembatalan dan sisa kuota</h2>
      <p>
        Paket tidak memakai autodebit. Tidak memperpanjang menghentikan
        pembelian periode berikutnya, tanpa membatalkan periode yang sudah
        dibayar. Sisa kuota, perubahan rencana pribadi atau perbedaan selera
        terhadap hasil tidak otomatis memicu refund. Keluhan tentang
        ketidaksesuaian layanan tetap dapat diajukan dan diperiksa.
      </p>

      <h2>Pengembalian kuota generasi</h2>
      <p>
        Pembatalan sebelum ada dokumen berhasil disimpan dan sebelum permintaan
        AI dimulai mengembalikan kuota. Setelah salah satu terjadi, pembatalan
        tetap menggunakan kuota. Proses terhenti yang masih dapat dilanjutkan
        memakai reservasi kuota yang sama. Kegagalan permanen yang ditutup
        sistem mengembalikan kuota satu kali.
      </p>
      <p>
        Kuota dikembalikan ke sumber asal. Jika periode asal sudah berakhir,
        pengembalian itu tidak menambah kuota minggu berjalan. Pengembalian
        kuota bukan pengganti refund uang yang menjadi hak Anda.
      </p>

      <h2>Jika keluhan belum selesai</h2>
      <p>
        Anda dapat meminta penjelasan keputusan dan peninjauan ulang dengan
        bukti tambahan. Hak konsumen berdasarkan hukum Indonesia tetap berlaku.
        Jalur penyelesaian sengketa tercantum pada{" "}
        <Link href="/terms">Ketentuan Layanan</Link>.
      </p>
    </ServicePage>
  );
}
