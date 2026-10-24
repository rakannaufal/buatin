import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "FAQ",
  "/faq",
  "Jawaban tentang dokumen, kuota, QRIS, masa aktif paket dan privasi di Buatin.",
);

export default function Page() {
  return (
    <ServicePage path="/faq">
      <h1>Pertanyaan yang sering diajukan</h1>
      <ServiceUpdated />

      <h2>Dokumen dan penggunaan</h2>
      <h3>Apakah Buatin langsung membuat website?</h3>
      <p>
        Buatin membuat dokumen perencanaan website dalam format Markdown, bukan
        website yang sudah berjalan. Dokumen tersebut dapat Anda gunakan sebagai
        arahan untuk pengembang atau alat bantu pemrograman.
      </p>
      <h3>Apa yang perlu disiapkan sebelum membuat dokumen?</h3>
      <p>
        Tuliskan tujuan website, siapa penggunanya, fitur utama dan batasan
        proyek. Tambahkan referensi jika diperlukan. Tinjau rencana dan dokumen
        yang dipilih sebelum menjalankan generasi.
      </p>
      <h3>Apakah seluruh hasil dibuat dengan AI?</h3>
      <p>
        Dokumen inti disusun dari template terstruktur berdasarkan brief dan
        pilihan Anda. Analisis gambar dengan AI merupakan fitur opsional jika
        tersedia. Gambar dikirim ke provider AI ketika Anda meminta analisis,
        bukan hanya karena mengunggahnya.
      </p>
      <h3>Bisakah memakai gambar atau dokumen referensi?</h3>
      <p>
        Bisa, menggunakan jenis file dan batas ukuran yang ditampilkan pada
        editor. File diperiksa sebelum digunakan. Jika format tidak tersedia,
        tuliskan bagian yang relevan sebagai catatan. Unggah hanya materi yang
        berhak Anda bagikan.
      </p>
      <h3>Bagaimana menggunakan hasilnya?</h3>
      <p>
        Tinjau isi dokumen, perbaiki asumsi yang belum sesuai, lalu unduh
        dokumen satu per satu atau dalam ZIP. Anda boleh mengubah dan
        menggunakannya untuk proyek pribadi maupun komersial, dengan tetap
        menghormati hak materi pihak ketiga. Baca{" "}
        <Link href="/disclaimer">batas penggunaan hasil</Link>.
      </p>

      <h2>Kuota dan proses</h2>
      <h3>Apa perbedaan kuota Free dan Pro?</h3>
      <p>
        Kuota Free berlaku sepanjang umur akun. Kuota Pro diperbarui setiap
        Senin pukul 00.00 WIB selama paket aktif dan tidak menumpuk. Jumlah
        kuota serta fitur setiap paket tercantum pada{" "}
        <Link href="/pricing">halaman paket</Link>.
      </p>
      <h3>Apa yang menggunakan satu kuota?</h3>
      <p>
        Satu proses generasi baru untuk satu paket dokumen memakai satu kuota.
        Regenerasi dokumen pilihan juga memakai satu kuota, termasuk dokumen
        terkait yang perlu ikut diperbarui. Mengunduh atau melanjutkan proses
        yang sama tidak memakai kuota baru.
      </p>
      <h3>Bagaimana jika proses terhenti?</h3>
      <p>
        Buka halaman proses dan gunakan pilihan melanjutkan jika tersedia.
        Proses yang dilanjutkan memakai kuota yang sudah dicadangkan. Kegagalan
        permanen yang ditutup sistem mengembalikan kuota satu kali ke sumber
        asal. Jika sumbernya minggu yang sudah lewat, kuota minggu ini tidak
        bertambah.
      </p>
      <h3>Apakah membatalkan proses mengembalikan kuota?</h3>
      <p>
        Ya, jika belum ada dokumen berhasil disimpan dan belum ada permintaan AI
        yang dimulai. Jika salah satu sudah terjadi, pembatalan tetap memakai
        kuota. Menghapus proyek juga tidak mengembalikan kuota.
      </p>

      <h2>Pembayaran dan paket</h2>
      <h3>Bagaimana cara membayar?</h3>
      <p>
        Pilih paket yang tersedia, periksa ringkasan tagihan, lalu bayar QRIS
        melalui Duitku. Paket aktif setelah pembayaran dikonfirmasi server. Jika
        paket belum tersedia untuk dibeli, pembayarannya belum dibuka.
      </p>
      <h3>
        Saldo terpotong, tetapi paket belum aktif. Apa yang harus dilakukan?
      </h3>
      <p>
        Periksa status pada halaman tagihan. Jika belum berubah, kirim nomor
        tagihan dan bukti pembayaran melalui{" "}
        <Link href="/support">Bantuan</Link>. Jangan membayar ulang tagihan yang
        sama selama pemeriksaan.
      </p>
      <h3>Apakah paket diperpanjang otomatis?</h3>
      <p>
        Tidak ada autodebit. Satu pembayaran membeli satu bulan kalender.
        Perpanjangan lebih awal menambah periode setelah masa yang sudah dibayar
        selesai. Untuk berhenti, cukup tidak memperpanjang.
      </p>
      <h3>Apakah membeli atau mengganti paket mereset kuota?</h3>
      <p>
        Tidak. Pemakaian minggu berjalan tetap tercatat. Perubahan tingkat paket
        berlaku pada periode berikutnya, sedangkan reset mingguan tetap
        mengikuti Senin pukul 00.00 WIB.
      </p>
      <h3>Bagaimana meminta pengembalian dana?</h3>
      <p>
        Ajukan melalui <Link href="/support">Bantuan</Link> dengan nomor tagihan
        dan alasan permintaan. Pengelola memeriksa transaksi dan kendala secara
        manual. Pengembalian uang berbeda dari pengembalian kuota. Rinciannya
        ada pada <Link href="/refund">Kebijakan Pengembalian Dana</Link>.
      </p>

      <h2>Penyimpanan dan privasi</h2>
      <h3>Berapa lama hasil bisa diunduh?</h3>
      <p>
        Ikuti tanggal kedaluwarsa pada halaman hasil. Masa simpan ditetapkan
        dari paket saat proses dimulai. Perubahan paket tidak memperpendek masa
        simpan hasil lama. Simpan salinan unduhan sebelum tanggal tersebut.
      </p>
      <h3>Apakah proyek saya dapat dilihat pengguna lain?</h3>
      <p>
        Proyek dan unduhan dibatasi untuk akun pemiliknya. Pengelola dan
        penyedia layanan dapat memproses data yang diperlukan untuk menjalankan
        layanan, menangani bantuan dan menjaga keamanan. Rinciannya dijelaskan
        pada <Link href="/privacy">Kebijakan Privasi</Link>.
      </p>
      <h3>Bagaimana meminta salinan atau penghapusan data?</h3>
      <p>
        Buka <Link href="/account">Akun</Link>, pilih jenis permintaan dan
        konfirmasikan email Anda. Pengelola meninjau permintaan; pengiriman
        permintaan belum langsung menghapus akun. Catatan tertentu dapat
        dipertahankan untuk kewajiban hukum. Jika tidak bisa masuk, gunakan{" "}
        <Link href="/contact">kontak bantuan</Link>.
      </p>
    </ServicePage>
  );
}
