import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Ketentuan layanan",
  "/terms",
  "Ketentuan akun, paket, pembayaran dan penggunaan dokumen Bantuin.",
);

export default function Page() {
  return (
    <ServicePage path="/terms">
      <h1>Ketentuan layanan</h1>
      <ServiceUpdated />
      <p>
        Ketentuan ini mengatur penggunaan Bantuin dan pembelian paketnya. Baca
        bersama <Link href="/privacy">Kebijakan Privasi</Link>,{" "}
        <Link href="/refund">Kebijakan Pengembalian Dana</Link> dan{" "}
        <Link href="/disclaimer">Batas Penggunaan Hasil</Link>.
      </p>

      <h2>Layanan yang Anda terima</h2>
      <p>
        Bantuin menyusun brief website menjadi dokumen perencanaan dalam format
        Markdown. Anda dapat meninjau rencana, memilih dokumen dan mengunduh
        hasilnya. Dokumen inti disusun dari template terstruktur. Analisis
        gambar dengan AI merupakan fitur terpisah yang digunakan atas permintaan
        Anda, jika tersedia.
      </p>
      <p>
        Pembelian paket memberikan akses sesuai manfaat yang ditampilkan sebelum
        pembayaran. Pembelian tersebut tidak mencakup pembuatan kode website,
        domain, hosting atau pengerjaan proyek oleh pengembang.
      </p>

      <h2>Akun dan kewenangan</h2>
      <p>
        Gunakan informasi akun yang benar dan email yang dapat Anda akses.
        Verifikasi email diperlukan untuk menggunakan akun yang didaftarkan
        dengan password. Jaga password, akses email dan kode pemulihan Anda.
        Laporkan penggunaan akun tanpa izin melalui{" "}
        <Link href="/contact">kontak bantuan</Link>.
      </p>
      <p>
        Anda harus memiliki kecakapan hukum untuk menyetujui ketentuan ini. Jika
        menggunakan Bantuin untuk organisasi atau klien, pastikan Anda berwenang
        mewakilinya dan membagikan materi proyek tersebut.
      </p>

      <h2>Paket dan perhitungan kuota</h2>
      <p>
        Kuota Free berlaku sepanjang umur akun, bukan diperbarui setiap minggu.
        Kuota Pro diperbarui setiap Senin pukul 00.00 WIB selama paket aktif.
        Sisa kuota mingguan tidak dibawa ke minggu berikutnya. Jumlah kuota,
        fitur dan masa penyimpanan mengikuti paket yang Anda pilih pada{" "}
        <Link href="/pricing">halaman paket</Link>.
      </p>
      <p>
        Satu generasi baru menggunakan satu kuota untuk satu paket dokumen.
        Regenerasi dokumen pilihan juga menggunakan satu kuota, termasuk dokumen
        lain yang perlu diperbarui karena saling berkaitan. Mengunduh hasil dan
        melanjutkan proses yang sama tidak memakai kuota baru. Penyusunan
        rencana memiliki batas pemakaian tersendiri. Menghapus proyek tidak
        menambah kuota.
      </p>

      <h2>Harga, pembayaran dan perpanjangan</h2>
      <p>
        Pembayaran menggunakan QRIS melalui Duitku. Periksa paket, diskon dan
        total pada ringkasan tagihan sebelum membayar. Paket aktif setelah
        pembayaran dikonfirmasi melalui pemeriksaan server. Bukti pembayaran
        dari aplikasi bank saja belum mengubah status tagihan di Bantuin.
      </p>
      <p>
        Satu pembayaran membeli satu bulan kalender. Tidak ada autodebit.
        Perpanjangan sebelum masa aktif berakhir dimulai setelah periode yang
        sudah dibayar selesai. Perubahan tingkat paket berlaku pada periode
        berikutnya. Pembayaran tidak mereset pemakaian kuota minggu berjalan.
        Harga dan manfaat pembelian yang sudah dibayar mengikuti catatan
        transaksi tersebut.
      </p>
      <p>
        Untuk berhenti, cukup tidak memperpanjang. Setelah masa aktif berakhir,
        akun kembali ke Free dengan sisa kuota Free yang belum digunakan, jika
        ada. Berhenti memperpanjang berbeda dari meminta pengembalian dana.
      </p>

      <h2>Proses gagal dan pengembalian</h2>
      <p>
        Jika proses terhenti, gunakan pilihan melanjutkan yang tersedia pada
        halaman proses. Kegagalan permanen yang ditutup sistem mengembalikan
        kuota satu kali ke sumber asal. Pembatalan sebelum ada dokumen yang
        berhasil disimpan dan sebelum permintaan AI dimulai juga mengembalikan
        kuota. Setelah salah satu terjadi, pembatalan tetap dihitung sebagai
        pemakaian.
      </p>
      <p>
        Kuota yang dikembalikan ke periode yang sudah lewat tidak menambah kuota
        periode berjalan. Pengembalian kuota tidak mengembalikan uang. Keluhan
        pembayaran dan layanan yang tidak sesuai pembelian ditangani menurut{" "}
        <Link href="/refund">Kebijakan Pengembalian Dana</Link>.
      </p>

      <h2>Materi proyek dan penggunaan hasil</h2>
      <p>
        Hak atas brief, gambar dan materi yang Anda unggah tetap pada
        pemiliknya. Anda memberikan izin kepada Bantuin untuk memproses materi
        tersebut sepanjang diperlukan untuk menyediakan layanan yang Anda minta.
        Pastikan Anda memiliki hak atau izin untuk mengunggah dan memprosesnya.
      </p>
      <p>
        Anda dapat menggunakan, mengubah dan membagikan dokumen hasil untuk
        proyek pribadi maupun komersial. Izin ini tidak memindahkan hak atas
        layanan, merek atau materi pihak ketiga. Materi pihak ketiga tetap
        mengikuti lisensinya. Hasil tidak dijamin unik atau bebas dari seluruh
        kemungkinan kemiripan dengan karya lain.
      </p>

      <h2>Penggunaan yang dilarang</h2>
      <ul>
        <li>Mengunggah materi yang melanggar hukum atau hak pihak lain.</li>
        <li>
          Membuat proyek untuk penipuan, pencurian data, penyebaran malware atau
          tindakan yang merugikan orang lain.
        </li>
        <li>
          Mengakses akun orang lain, menghindari batas kuota atau mengganggu
          keamanan dan ketersediaan layanan.
        </li>
      </ul>
      <p>
        Akses dapat dibatasi untuk menangani pelanggaran atau ancaman keamanan.
        Penjelasan dan permintaan peninjauan dapat diajukan melalui bantuan.
        Pembatasan akun tidak menghapus hak Anda atas penyelesaian keluhan dan
        pembayaran yang sah.
      </p>

      <h2>Penyimpanan dan ketersediaan</h2>
      <p>
        Hasil tersedia sampai tanggal penyimpanan yang tercantum pada halaman
        hasil. Perubahan paket tidak memperpendek masa penyimpanan hasil lama.
        Unduh salinan sebelum tanggal tersebut. Retensi data lainnya dijelaskan
        pada <Link href="/privacy">Kebijakan Privasi</Link>.
      </p>
      <p>
        Pemeliharaan dan gangguan dapat membatasi akses sementara. Jika layanan
        berbayar tidak diberikan sebagaimana disepakati, Anda dapat meminta
        penyelesaian melalui bantuan. Bantuin tetap bertanggung jawab atas
        kewajiban yang ditetapkan oleh hukum yang berlaku.
      </p>

      <h2>Perubahan ketentuan dan penyelesaian keluhan</h2>
      <p>
        Versi terbaru mencantumkan tanggal pembaruan. Perubahan yang memengaruhi
        hak atau kewajiban secara material perlu diberitahukan melalui layanan
        sebelum berlaku. Perubahan tidak mengurangi manfaat periode yang sudah
        dibayar atau menghapus hak yang telah timbul dari transaksi sebelumnya.
      </p>
      <p>
        Ketentuan ini menggunakan hukum Indonesia. Keluhan terlebih dahulu dapat
        dibahas dengan pengelola. Jika tidak selesai, Anda tetap dapat
        menggunakan Badan Penyelesaian Sengketa Konsumen atau pengadilan yang
        berwenang sesuai ketentuan hukum. Tidak ada ketentuan di halaman ini
        yang mengesampingkan hak konsumen yang dijamin undang-undang.
      </p>
    </ServicePage>
  );
}
