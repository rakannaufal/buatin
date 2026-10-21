# Components

## Inventaris komponen

Buat tabel nama, tanggung jawab, halaman pengguna, props/input, output/event dan state. Pisahkan komponen domain dari primitive yang benar-benar dipakai ulang.

## Kontrak dan komposisi

Tentukan sumber data/state, validasi, controlled/uncontrolled, side effect, akses server/client dan aturan komposisi. Hindari komponen raksasa atau abstraksi sebelum ada pengulangan nyata.

## State dan aksesibilitas

Dokumentasikan disabled/loading/empty/error/success, focus/keyboard, nama aksesibel, label dan pengumuman status. Placeholder mengikuti dimensi akhir; skeleton dekoratif aria-hidden dan reduced motion.

## Performa dan verifikasi

Lazy import hanya komponen berat opsional yang memang dapat ditunda. Uji keyboard, data ekstrem, race, unmount, retry dan cache cepat tanpa flicker. Hero/LCP serta konten utama tidak ditunda.
