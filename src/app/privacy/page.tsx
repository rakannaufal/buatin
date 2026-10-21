import { PublicShell } from "@/components/public-shell";
import { getEnv } from "@/server/config";
import { siteSettings } from "@/server/admin/policies";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kebijakan privasi" };
export default async function Page() {
  const { value: site } = await siteSettings();
  return (
    <PublicShell>
      <article className="public-content legal-content">
        <h1>Kebijakan privasi.</h1>
        {site.privacyNotice && (
          <section>
            <h2>Pemberitahuan tambahan pengelola</h2>
            <p className="preserve-lines">{site.privacyNotice}</p>
          </section>
        )}
        <p className="muted">Berlaku 21 Oktober 2026.</p>
        <h2>Data yang diproses</h2>
        <p>
          Buatin menyimpan nama, email, sesi akun, brief, dokumen, riwayat
          penggunaan, lampiran, preferensi, revisi, permintaan data, dan catatan
          pembayaran yang diperlukan untuk menyediakan layanan. Password
          disimpan dalam bentuk hash. Isi proyek dibatasi untuk pemilik akun.
        </p>
        <h2>Pemrosesan AI dan pembayaran</h2>
        <p>
          Dalam mode AI nyata, brief serta konteks dokumen diteruskan melalui
          9router kepada provider AI yang dikonfigurasi pengelola. Jangan
          memasukkan password, kunci API, data pribadi sensitif, atau materi
          yang tidak boleh dibagikan. Email dan rincian tagihan yang diperlukan
          dikirim ke Duitku untuk pembayaran QRIS. Email layanan dikirim melalui
          Resend jika aktif. Turnstile memproses sinyal keamanan saat
          verifikasi.
        </p>
        <p>
          Teks hasil ekstraksi referensi serta catatannya dapat menjadi konteks
          AI. Gambar dikirim untuk analisis ketika fitur analisis digunakan;
          model vision perlu dikonfigurasi pengelola. Referensi disimpan pada
          storage privat lokal atau bucket yang dikonfigurasi. Kebijakan
          pemrosesan dan retensi provider AI mengikuti layanan upstream yang
          dipilih. Unggah hanya materi yang berhak Anda bagikan.
        </p>
        <h2>Penyimpanan dan penghapusan</h2>
        <p>
          Draft tanpa hasil berakhir setelah 24 jam tidak diperbarui. Hasil
          disimpan sesuai durasi paket yang disepakati saat proses dimulai dan
          tanggal kedaluwarsa pada halaman hasil. Mengganti paket tidak
          memperpendek masa penyimpanan hasil lama. Unduh dokumen sebelum masa
          tersebut berakhir. Cadangan database mengikuti rotasi pengelola
          sehingga penghapusan dari cadangan tidak selalu langsung.
        </p>
        <p>
          Catatan pemakaian Free tetap tersimpan selama akun ada agar
          penghapusan proyek tidak menghasilkan kredit baru. Catatan pembayaran
          dan verifikasinya disimpan terpisah untuk rekonsiliasi serta kewajiban
          administrasi. Isi email operasional dihapus dari antrean setelah tujuh
          hari. Catatan AI, budget dan audit dibersihkan setelah 180 hari.
          Permintaan data yang selesai juga dibersihkan setelah 180 hari;
          permintaan terbuka dipertahankan untuk ditindaklanjuti.
        </p>
        <h2>Cookie dan hak pengguna</h2>
        <p>
          Cookie dipakai untuk sesi dan keamanan akun. Anda dapat meminta akses,
          koreksi, atau penghapusan data melalui pengelola. Permintaan salinan
          dan penghapusan dapat dicatat pada halaman Akun dengan konfirmasi
          email. Pengelola meninjau dan memenuhi permintaan secara manual;
          pengiriman permintaan belum langsung menghapus akun. Identitas pemilik
          perlu diverifikasi sebelum permintaan dipenuhi.
        </p>
        <p>
          {site.supportEmail || getEnv().SUPPORT_EMAIL ? (
            <a
              className="text-button"
              href={`mailto:${site.supportEmail || getEnv().SUPPORT_EMAIL}`}
            >
              {site.supportEmail || getEnv().SUPPORT_EMAIL}
            </a>
          ) : (
            "Kontak pengelola belum dikonfigurasi. Layanan saat ini dalam penyiapan lokal."
          )}
        </p>
      </article>
    </PublicShell>
  );
}
