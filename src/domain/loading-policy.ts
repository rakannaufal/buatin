import type { WebType } from "./types";

export interface LoadingPolicy {
  version: 1;
  webType: WebType;
  rendering: string;
  profile: "content" | "application" | "review";
  baseline: string;
  candidates: string;
}

export function loadingPolicy(
  webType: WebType,
  rendering = "Belum ditentukan",
): LoadingPolicy {
  const content = ["landing", "company", "portfolio", "blog"].includes(webType);
  const candidates: Record<WebType, string> = {
    landing:
      "Landing page pendek: tampilkan isi langsung. Evaluasi lazy hanya bila ada media berat di bawah layar.",
    company:
      "Profil perusahaan: tampilkan layanan dan kontak langsung. Galeri panjang atau peta berat dapat dimuat saat dibutuhkan.",
    portfolio:
      "Portofolio: prioritaskan karya pertama; pertimbangkan lazy untuk galeri panjang dan video di bawah layar.",
    blog: "Blog/berita: kirim isi artikel dan tautan lewat HTML; pertimbangkan lazy untuk ilustrasi di bagian bawah artikel panjang.",
    ecommerce:
      "Katalog: evaluasi lazy media produk di luar layar dan pagination. Skeleton hanya untuk daftar/filter async yang benar-benar menunggu data.",
    saas: "SaaS: evaluasi skeleton pada panel async dan pemuatan kode grafik/editor berat pada tab tersembunyi; halaman pemasaran tetap dinilai terpisah.",
    internal:
      "Dashboard internal: evaluasi tabel/grafik async dan pemuatan kode tab tersembunyi; pertahankan data lama saat refresh.",
    booking:
      "Booking: evaluasi skeleton pada slot/jadwal async. Konfirmasi reservasi/pembayaran memakai status transaksi nyata dan pencegahan submit ganda.",
    custom:
      "Jenis custom: inventarisasi halaman, rendering, posisi aset dan sumber data sebelum memilih strategi. Jangan menganggap semua halaman dinamis.",
  };
  return {
    version: 1,
    webType,
    rendering,
    profile: content
      ? "content"
      : webType === "custom"
        ? "review"
        : "application",
    baseline: content
      ? "Konten langsung menjadi default; jangan menambahkan skeleton pada konten statis yang sudah tersedia."
      : webType === "custom"
        ? "Strategi perlu ditentukan per halaman; lazy dan skeleton bersifat kondisional."
        : "Pisahkan halaman publik dan area aplikasi; skeleton hanya kandidat untuk batas data async yang terukur.",
    candidates: candidates[webType],
  };
}

const scope: Record<string, string> = {
  agents:
    "Pilih strategi per halaman/komponen berdasarkan rendering, posisi aset, ukuran dan waktu tunggu terukur. Catat keputusan memakai atau menghindari lazy/skeleton beserta alasan. Jangan menambah fitur bisnis hanya untuk mengikuti rekomendasi ini.",
  architecture:
    "Petakan shell, konten HTML awal, batas async/streaming, cache dan interaksi. SSR/SSG yang datanya sudah tersedia tidak membutuhkan skeleton buatan; SSR streaming dapat memakai fallback pada bagian yang benar-benar menunggu. CSR/SPA juga tidak otomatis membutuhkan skeleton pada semua komponen.",
  design:
    "Skeleton mengikuti ukuran, rasio dan susunan konten akhir; dekorasi aria-hidden, wilayah data aria-busy, satu status singkat yang dapat diumumkan. Hormati prefers-reduced-motion dengan placeholder statis. Jangan mengumumkan setiap balok, memindahkan fokus atau mengganti data lama saat refresh. Sediakan empty/error/retry/offline yang relevan.",
  components:
    "Tentukan kontrak loading/refreshing/empty/error/success, dimensi placeholder dan fallback tiap komponen async. Tunda indikator yang hanya akan berkedip; sekitar 300 ms adalah heuristik yang diuji, bukan delay wajib. Data cepat/cached langsung tampil. Jangan menambah waktu tunggu minimum agar skeleton terlihat. Refresh mempertahankan data sebelumnya. Bersihkan observer/request saat unmount, cegah request ganda dan respons usang.",
  performance:
    "Utamakan lazy native untuk gambar/iframe berat di bawah layar. Kode grafik/editor/modal berat dapat memakai dynamic import saat intent/visibility yang sesuai; deklarasi dynamic import sendiri belum membuktikan resource tertunda. Video memakai poster/preload yang sesuai. Tetapkan width/height atau aspect-ratio serta sizes/srcset. Lazy aset/kode berbeda dari fetch data/pagination; batasi konkurensi, ukuran halaman dan memori. Hindari library observer untuk halaman pendek yang tidak memerlukannya.",
  seo: "Judul, isi utama, metadata dan tautan halaman publik harus dapat dirayapi tanpa scroll/klik. Utamakan HTML server atau prerender sesuai stack; verifikasi hasil streaming dengan crawler. URL gambar harus dapat ditemukan lewat markup yang sesuai. Infinite scroll perlu URL/pagination yang dapat dirayapi, tombol muat lagi yang dapat diakses, serta footer yang tetap terjangkau. Jangan menaruh konten penting hanya di dalam observer atau interaksi browser.",
  testing:
    "Periksa HTML dan network trace desktop/mobile: hero/LCP diminta tanpa scroll; media jauh di bawah layar boleh ditunda sesuai heuristik browser. Uji cache cepat (<300 ms), API 0,5-3 detik, request >10 detik, error/offline, retry, tab tersembunyi dan navigasi saat fetch. Pastikan tidak ada flicker/delay buatan, CLS dari placeholder, duplikasi request, fokus hilang atau pengumuman berulang. Uji reduced motion, keyboard dan pembaca layar; catat resource/timing serta LCP/CLS/INP aktual, bukan hasil perkiraan.",
};

export function loadingGuidance(fileId: string, policy: LoadingPolicy) {
  const guidance = scope[fileId];
  if (!guidance) return;
  return [
    "### Strategi lazy loading dan skeleton loading",
    `Jenis: ${policy.webType}. Rendering pilihan: ${policy.rendering}. ${policy.baseline}`,
    policy.candidates,
    "Lazy loading menunda aset/kode yang belum diperlukan. Skeleton adalah placeholder visual selama data async dimuat; skeleton tidak mempercepat jaringan. Keduanya tidak wajib dan tidak saling menggantikan.",
    "Jangan lazy-load hero/gambar LCP atau menyembunyikan judul/isi above the fold. Pastikan konten utama segera ditemukan; gunakan eager dan prioritas/preload seperlunya sesuai API stack, jangan memprioritaskan semua aset.",
    guidance,
    "Jangan menambahkan skeleton untuk HTML statis/SSR lengkap atau data yang sudah siap. SSR streaming tetap boleh memakai fallback lokal saat ada penantian nyata. Tanpa delay buatan; sekitar 300 ms hanya heuristik untuk menghindari flicker. Untuk proses panjang (misalnya >10 detik), tampilkan tahap/status dan progres nyata bila dapat diukur, timeout serta retry/batal bila aman; jangan membuat persentase palsu. Pembayaran menampilkan status server dan melindungi submit ganda.",
    "Ukur sebelum/sesudah dengan cache dan jaringan yang sama. Target awal LCP <=2,5 detik, CLS <=0,1 dan INP <=200 ms pada persentil ke-75; angka ini target, bukan bukti lulus. Catat hasil aktual dan kendala. Skeleton harus mempertahankan layout serta mendukung reduced motion.",
  ].join("\n\n");
}
