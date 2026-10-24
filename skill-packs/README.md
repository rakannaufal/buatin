# Katalog skill Buatin

`config/imported-skills.json` adalah registry panduan yang sudah ditinjau. Sumber
asli dan lisensi disimpan per direktori; `ADAPTATION.md` menjelaskan perubahan
untuk penulisan spesifikasi. Panduan aktif berasal dari adaptasi, bukan menjalankan
tool desktop atau helper upstream. Katalog berstatus lainnya berada di
`src/domain/skills.ts`; entri tanpa hak redistribusi hanya menyimpan metadata.

Pack lokal: Impeccable (Apache-2.0), UI Craft, UI/UX Pro Max dan Emil Design
Engineering (MIT). Provenance menggunakan hash konten lokal karena commit asal
instalasi tidak tersedia. Pack GitHub: Anthropic `webapp-testing`, Apache-2.0,
commit `ef740771ac901e03fbca3ce4e1c453a96010f30a`, dengan tautan sumber dan lisensi
spesifik skill. Anti-slop dari `miqdadbadjuber/anti-slop` dipin pada commit
`671ab15c2ff6913cdd80717f602a89f0a9429a4b`, berlisensi MIT. Core diadaptasi
tanpa wizard pemasangan, preferensi global atau runtime script.
Attribution asli dipertahankan. Script/helper upstream tidak
diimpor. Panduan Playwright diadaptasi ke stack target dan readiness UI.

## Impor atau pembaruan admin

1. Pilih skill yang belum tercakup dari pemilik asli di GitHub. Baca seluruh
   sumber, lisensi spesifik dan dependensi; tentukan dukungan dan dokumen tujuan.
2. Pin commit SHA 40 karakter. Unduh hanya sumber/lisensi yang diperlukan,
   maksimal 256 KiB/file; jangan mengeksekusi script atau mengimpor kredensial.
3. Tambahkan `SKILL.upstream.md`, `LICENSE.txt`, `ADAPTATION.md`. Tulis panduan
   ringkas; manual preferences dan keamanan Buatin selalu lebih tinggi.
4. Daftarkan metadata, `guidance`, `documents` dan checksum. `sourceChecksum`
   adalah SHA256 sumber mentah. `checksum` adalah SHA256 konkatenasi byte sumber,
   lisensi, adaptasi, lalu UTF-8 guidance, sesuai urutan tersebut. Untuk GitHub
   tambahkan repository, commit, path sumber/lisensi dan checksum masing-masing
   dalam `upstream`. Review perubahan sebelum status menjadi `ready`.
5. Jalankan `npm run skills:verify`, test, secret scan dan build. Commit sumber,
   lisensi, adaptasi dan registry bersama. Pembaruan tidak mengubah snapshot lama.

`npm run skills:sync` mengunduh ulang hanya commit/path/checksum GitHub yang sudah
ditinjau dalam registry. Redirect, path traversal, konten terlalu besar atau
checksum berbeda ditolak sebelum file diganti. Tidak ada discovery/impor otomatis
saat pengguna membuat dokumen. Untuk versi baru, tinjau konten dahulu dan perbarui
pin/checksum melalui perubahan kode yang dapat diperiksa.
