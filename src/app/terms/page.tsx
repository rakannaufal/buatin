import { PublicShell } from "@/components/public-shell";
import { siteSettings } from "@/server/admin/policies";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ketentuan layanan" };
export default async function Page() {
  const { value: site } = await siteSettings();
  return (
    <PublicShell>
      <article className="public-content legal-content">
        <h1>Ketentuan layanan.</h1>
        {site.termsNotice && (
          <section>
            <h2>Ketentuan tambahan pengelola</h2>
            <p className="preserve-lines">{site.termsNotice}</p>
          </section>
        )}
        <p className="muted">Berlaku 20 Oktober 2026.</p>
        <h2>Layanan dan akun</h2>
        <p>
          Buatin menghasilkan paket dokumen perencanaan website. Dokumen AI
          dapat mengandung kekeliruan; tinjau sebelum dipakai untuk
          implementasi. Hasil bukan jaminan kode sudah dibangun, aman, atau
          diuji. Anda bertanggung jawab atas materi brief, hak penggunaannya,
          dan keamanan akun.
        </p>
        <h2>Paket dan kuota</h2>
        <p>
          Free menyediakan kuota seumur hidup yang ditampilkan pada halaman
          paket. Pro menyediakan kuota mingguan sesuai paket dan harga yang
          ditampilkan sebelum pembayaran. Kuota Pro reset Senin pukul 00.00 WIB
          selama langganan aktif, tidak menumpuk. Bulan penagihan dan minggu
          kuota dihitung terpisah.
        </p>
        <p>
          Satu generasi berarti satu proses baru untuk satu paket dokumen.
          Regenerasi pilihan memakai satu kuota baru, termasuk dokumen terdampak
          dependensi. Edit, unduh, dan resume proses yang sama tidak menggunakan
          kuota baru. Penyusunan rencana memiliki batas terpisah untuk
          mengendalikan penggunaan AI.
        </p>
        <h2>Pembayaran dan perpanjangan</h2>
        <p>
          Pembayaran hanya QRIS Duitku. Tidak ada autodebit. Paket aktif setelah
          pembayaran diverifikasi server. Perpanjangan awal menambahkan satu
          bulan kalender setelah masa yang sudah dibayar berakhir. Perubahan
          tingkat paket berlaku pada periode berikutnya. Pembayaran dan
          perubahan paket tidak mereset pemakaian minggu berjalan.
        </p>
        <p>
          Berhenti cukup dengan tidak memperpanjang; akses Pro berlangsung
          sampai periode dibayar selesai. Setelah itu akun kembali ke Free
          dengan kredit seumur hidup yang belum dipakai, jika ada. Hasil tetap
          tersedia sampai tanggal penyimpanannya berakhir.
        </p>
        <h2>Gangguan dan pembatalan</h2>
        <p>
          Gangguan worker dapat dilanjutkan dari dokumen tersimpan. Kegagalan
          sistem permanen mengembalikan kuota sekali ke periode asal; proses
          yang dikembalikan kuotanya ditutup. Pengembalian ke minggu yang sudah
          lewat tidak menambah kuota minggu ini. Pembatalan sebelum AI dimulai
          mengembalikan kuota, setelah AI dimulai tetap dihitung. Pengembalian
          kuota berbeda dari pengembalian pembayaran; masalah tagihan diperiksa
          pengelola melalui catatan Duitku.
        </p>
        <h2>Penyimpanan</h2>
        <p>
          Masa penyimpanan hasil tercantum pada paket dan halaman hasil. Simpan
          salinan unduhan Anda. Penyalahgunaan, pendaftaran otomatis, pengelakan
          kuota, atau penggunaan layanan untuk merugikan pihak lain dapat
          dibatasi. Lihat{" "}
          <a className="text-button" href="/privacy">
            kebijakan privasi
          </a>{" "}
          untuk data dan kontak pengelola.
        </p>
      </article>
    </PublicShell>
  );
}
