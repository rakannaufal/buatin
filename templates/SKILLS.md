# Persiapan skill proyek {{projectName}}

## Langkah pertama wajib

Selesaikan pemasangan dan verifikasi skill di dokumen ini sebelum menjalankan
perintah proyek, memasang dependency aplikasi, mengubah kode atau memulai
implementasi. Membaca dokumen, memeriksa skill yang sudah ada dan menyiapkan
skill merupakan bagian dari langkah pertama ini.

1. Baca `AGENTS.md`, lalu dokumen ini. Periksa aturan lingkungan agent dan izin
   penulisan sebelum pemasangan.
2. Gunakan definisi panduan proyek yang disertakan di bawah. Simpan sebagai
   `SKILL.md` pada path masing-masing, relatif terhadap root proyek target.
   Direktori `.agents/skills/` digunakan Codex untuk skill proyek; untuk agent
   lain, gunakan lokasi skill yang didukung dan catat lokasi sebenarnya.
3. Pasang hanya skill yang belum tersedia. Bila file sudah ada dengan checksum
   sama, gunakan kembali. Bila berbeda, jangan timpa: laporkan konflik dan
   minta keputusan pengguna. Jangan mengubah skill global atau skill proyek lain.
4. Hitung SHA-256 byte `SKILL.md`, termasuk newline akhir, memakai alat lokal
   seperti `shasum -a 256` atau `sha256sum`. Cocokkan dengan nilai di bawah.
5. Pastikan agent dapat menemukan dan membaca skill. Jika penemuan memerlukan
   giliran/sesi baru, mulai ulang sebelum implementasi; jangan mengaku skill
   aktif hanya karena file tersimpan.
6. Catat path, versi, checksum dan status setiap skill pada
   `specs/progress.md`. Lanjutkan dokumen proyek hanya setelah semua skill siap.

Jika pemasangan, verifikasi atau akses skill gagal, hentikan perintah berikutnya
dan laporkan blocker. Status awal semua pemasangan adalah **belum diverifikasi**.
Generator menghasilkan instruksi, bukan bukti skill terpasang di mesin pengguna.

## Sumber dan batas pemasangan

Definisi berikut adalah adaptasi panduan Bantuin yang dibekukan bersama snapshot
proyek, bukan salinan penuh tool atau plugin upstream. Nama skill diberi scope
Bantuin agar tidak menimpa skill asli. Pertahankan atribusi dan lisensinya.
Sumber/versi upstream hanya untuk provenance; tidak perlu mengunduh atau
menjalankan installer pihak ketiga untuk menggunakan definisi ini.

Pemasangan hanya menulis berkas instruksi lokal. Jangan menjalankan script dari
skill, mengirim secrets, memasang layanan berbayar, atau login provider sebagai
bagian dari langkah ini. Instruksi pengguna, keamanan dan preferensi manual
tetap berlaku. Skill tidak memberi izin tambahan.

## Skill yang harus tersedia

{{#each skillSetup}}
### {{this.name}}

- Path: `{{this.installPath}}`
- Sumber: {{this.source}}
- Versi: `{{this.version}}`
- Lisensi: {{this.license}}
  {{#if this.url}}- Upstream: {{this.url}}
  {{/if}}- SHA-256 definisi: `{{this.definitionChecksum}}`
- Status pemasangan: belum diverifikasi.

Salin hanya isi blok berikut, tanpa pagar Markdown, dengan newline akhir:

{{{this.definitionBlock}}}

{{/each}}
{{#unless skillSetup}}
Snapshot ini tidak memuat definisi skill. Jangan mengarang sumber atau
menjalankan installer yang tidak ditentukan. Minta paket baru dengan panduan
yang ditinjau sebelum memulai implementasi.
{{/unless}}

## Setelah skill siap

Baca `specs/index.md` dan dokumen spesifikasi yang tersedia. Tinjau kebutuhan,
desain serta batasan, lalu ikuti `specs/implementation-plan.md`. Jalankan hanya
perintah yang sesuai stack dan otorisasi proyek. Test serta build tetap pending
sampai benar-benar dijalankan dan hasilnya dicatat.
