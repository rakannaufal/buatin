import Link from "next/link";
import { ServicePage, ServiceUpdated } from "@/components/service-page";
import { publicMetadata } from "@/server/seo";

export const dynamic = "force-dynamic";
export const metadata = publicMetadata(
  "Kebijakan privasi",
  "/privacy",
  "Data yang diproses Buatin, tujuan penggunaannya, penyimpanan dan hak Anda.",
);

export default function Page() {
  return (
    <ServicePage path="/privacy">
      <h1>Kebijakan privasi</h1>
      <ServiceUpdated />
      <p>
        Kebijakan ini menjelaskan pengelolaan data saat Anda menggunakan Buatin.
        Pengelola Buatin bertindak sebagai pengendali data pribadi untuk layanan
        ini. Jalur permintaan dan kontak dijelaskan pada halaman ini.
      </p>

      <h2>Data yang dikumpulkan</h2>
      <ul>
        <li>
          Data akun: nama, email, status verifikasi, password yang sudah di-hash
          serta pengaturan keamanan. Jika masuk dengan Google, kami menerima
          informasi profil yang diberikan Google untuk autentikasi.
        </li>
        <li>
          Data proyek: brief, lampiran, teks hasil ekstraksi, catatan,
          preferensi, revisi, rencana dan dokumen hasil.
        </li>
        <li>
          Data transaksi: paket, nomor tagihan, nominal, diskon, status
          pembayaran serta catatan pengembalian dana dan pemakaian kuota.
        </li>
        <li>
          Data layanan: pesan bantuan, permintaan salinan atau penghapusan data,
          informasi sesi dan perangkat, alamat IP serta catatan aktivitas yang
          diperlukan untuk keamanan dan penanganan gangguan.
        </li>
      </ul>
      <p>
        Jangan memasukkan password, kunci API, data kesehatan, data keuangan
        pribadi atau data sensitif lain ke dalam brief dan lampiran. Jika materi
        memuat data orang lain, pastikan ada dasar yang sah untuk membagikannya.
      </p>

      <h2>Tujuan dan dasar pemrosesan</h2>
      <p>
        Data akun dan proyek diproses untuk menyediakan layanan yang Anda minta.
        Data transaksi digunakan untuk mengaktifkan paket, mencocokkan
        pembayaran dan memenuhi kewajiban administrasi. Informasi keamanan
        digunakan untuk mencegah penyalahgunaan, menjaga akun dan menyelidiki
        gangguan dengan mempertimbangkan hak Anda.
      </p>
      <p>
        Fitur opsional yang memerlukan persetujuan, termasuk pengiriman gambar
        untuk analisis AI, digunakan berdasarkan tindakan Anda pada fitur
        tersebut. Persetujuan untuk fitur opsional tidak menjadi persetujuan
        untuk penggunaan data di luar tujuan yang dijelaskan.
      </p>

      <h2>Dokumen dan analisis gambar</h2>
      <p>
        Rencana dan dokumen inti disusun dari template. Brief dan teks referensi
        tidak dikirim ke provider AI untuk penyusunan dokumen inti. Teks hasil
        ekstraksi dan catatan referensi dapat masuk ke dokumen yang Anda unduh.
      </p>
      <p>
        Saat Anda meminta analisis gambar, gambar yang sudah diproses beserta
        konteks analisis dikirim melalui 9router kepada provider AI yang
        dikonfigurasi pengelola. Fitur ini hanya tersedia jika diaktifkan.
        Jangan gunakan analisis untuk materi yang tidak boleh dikirim kepada
        provider tersebut. Pemrosesan dan retensi di sisi provider mengikuti
        ketentuan layanan serta perjanjian dengan provider yang digunakan.
      </p>

      <h2>Pihak yang menerima data</h2>
      <ul>
        <li>
          Penyedia hosting, database dan penyimpanan memproses data agar
          aplikasi dan file dapat digunakan.
        </li>
        <li>
          Duitku menerima informasi tagihan, email dan rincian transaksi yang
          diperlukan untuk pembayaran QRIS serta pemeriksaan pembayaran.
        </li>
        <li>
          Resend memproses alamat email dan isi email layanan jika pengiriman
          email diaktifkan. Cloudflare Turnstile memproses sinyal perangkat dan
          keamanan saat verifikasi digunakan.
        </li>
        <li>
          Google menangani autentikasi jika Anda memilih masuk dengan Google.
          Provider AI menerima data hanya untuk analisis yang Anda minta.
        </li>
        <li>
          Pengelola yang berwenang dapat mengakses data yang diperlukan untuk
          dukungan, keamanan dan kewajiban hukum. Permintaan pihak berwenang
          ditangani berdasarkan dasar hukum yang berlaku.
        </li>
      </ul>
      <p>
        Penyedia layanan dapat memproses data di luar Indonesia. Transfer
        tersebut harus memiliki dasar dan pelindungan yang dipersyaratkan hukum
        Indonesia. Anda dapat meminta informasi tentang penyedia dan lokasi
        pemrosesan melalui kontak pengelola.
      </p>

      <h2>Lama penyimpanan</h2>
      <ul>
        <li>
          Draft memiliki masa simpan 24 jam sejak pembaruan terakhir. Proyek
          tanpa proses generasi yang tersimpan juga dapat dibersihkan setelah 14
          hari tanpa pembaruan.
        </li>
        <li>
          Dokumen hasil mengikuti masa simpan paket saat proses dimulai dan
          tanggal kedaluwarsa pada halaman hasil. Perubahan paket tidak
          memperpendek masa simpan hasil lama.
        </li>
        <li>
          Catatan audit aplikasi, pemakaian AI dan permintaan data yang sudah
          selesai dijadwalkan untuk dibersihkan setelah 180 hari. Isi email pada
          antrean aplikasi dijadwalkan untuk dibersihkan setelah tujuh hari.
        </li>
        <li>
          Data akun dan pemakaian Free dipertahankan selama akun ada. Menghapus
          proyek tidak menghapus riwayat kuota. Tiket dan permintaan yang masih
          terbuka disimpan untuk ditindaklanjuti.
        </li>
      </ul>
      <p>
        Catatan transaksi dapat tetap disimpan untuk kewajiban hukum dan
        penyelesaian sengketa meskipun akun dihapus. Salinan cadangan mengikuti
        siklus penyimpanan yang dikelola terpisah; penghapusan dari sistem aktif
        tidak langsung menghapus seluruh cadangan. Rincian penyimpanan yang
        berlaku untuk permintaan Anda dapat ditanyakan kepada pengelola.
      </p>

      <h2>Akses dan keamanan</h2>
      <p>
        Proyek dan unduhan dibatasi berdasarkan akun. File referensi ditempatkan
        pada penyimpanan privat. Password disimpan dalam bentuk hash. Akun
        menyediakan autentikasi dua faktor dan pengelolaan sesi. Pengamanan ini
        mengurangi risiko, tetapi tidak menjadi jaminan bahwa gangguan atau
        akses tanpa izin tidak akan pernah terjadi.
      </p>
      <p>
        Jika terjadi kegagalan pelindungan data pribadi, pengelola wajib
        menangani kejadian dan menyampaikan pemberitahuan kepada pihak yang
        diwajibkan, dengan isi serta tenggat sesuai hukum yang berlaku.
      </p>

      <h2>Hak dan permintaan Anda</h2>
      <p>
        Sesuai ketentuan yang berlaku, Anda dapat meminta informasi, akses,
        salinan, koreksi, penghapusan atau penghentian pemrosesan data, serta
        menarik persetujuan untuk pemrosesan yang mengandalkan persetujuan. Anda
        juga dapat mengajukan keberatan atau keluhan mengenai pemrosesan data
        pribadi.
      </p>
      <p>
        Permintaan salinan dan penghapusan dapat diajukan melalui{" "}
        <Link href="/account">Akun</Link>. Untuk koreksi, pertanyaan lain atau
        jika Anda tidak dapat masuk, gunakan{" "}
        <Link href="/contact">kontak bantuan</Link>. Identitas pemilik perlu
        diverifikasi secara proporsional. Permintaan ditinjau manual; mengirim
        permintaan belum menghapus akun. Jika ada data yang harus dipertahankan
        atau permintaan tidak dapat dipenuhi, pengelola perlu menjelaskan
        alasannya.
      </p>

      <h2>Cookie dan pembaruan kebijakan</h2>
      <p>
        Penggunaan cookie dijelaskan pada{" "}
        <Link href="/cookies">Kebijakan Cookie</Link>. Halaman ini mencantumkan
        tanggal pembaruan. Perubahan material pada tujuan pemrosesan perlu
        diberitahukan; jika diperlukan dasar persetujuan baru, persetujuan
        tersebut harus diperoleh sebelum pemrosesan baru dilakukan.
      </p>
    </ServicePage>
  );
}
