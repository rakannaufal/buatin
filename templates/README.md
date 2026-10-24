# Template bawaan Bantuin

43 template instruksi terstruktur sesuai katalog, disusun untuk produk ini.
`SKILLS.md` wajib di setiap paket baru. `AGENTS.md` mewajibkan pemasangan dan
verifikasi panduan lokal sebelum perintah proyek atau implementasi. Snapshot lama
tetap memakai template dan skill asalnya; susun rencana baru untuk paket terbaru.
`TEMPLATE_SOURCE=builtin` membedakannya dari fallback lama dan kit original pihak
lain; tidak ada klaim bahwa kit eksternal sudah diimpor. Semua keputusan harus
diturunkan dari brief, preferensi tersimpan dan skill aktif yang relevan.

Unknown bisnis tetap dinyatakan belum ditentukan; generator boleh memakai
placeholder secara jujur pada hasil bila informasi wajib belum ada. Template
bawaan sendiri tidak berisi bagian `[ISI]` kosong. Snapshot lama dipertahankan.

Jalankan `npm run templates:verify` setelah perubahan. Perbarui checksum melalui
`npm run templates:verify -- --update` hanya setelah meninjau isi dan sumbernya.
Paket spesifikasi tidak membuktikan website target telah diimplementasikan.
