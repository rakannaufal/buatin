# Aksesibilitas

## Standar dan target

Target WCAG 2.1 level AA sebagai baseline. Semua halaman publik harus memenuhi
kriteria ini kecuali ada alasan terdokumentasi. Catat pengecualian beserta
alasan dan rencana perbaikan. Aksesibilitas bukan fitur opsional.

## Semantic HTML dan struktur

Gunakan elemen HTML semantik (nav, main, article, section, header, footer, aside)
sesuai fungsi. Heading berurutan (h1→h2→h3) tanpa lompatan. Landmark yang jelas
untuk navigasi pembaca layar. Tabel data memakai thead/th/scope; tabel layout
tidak digunakan. List memakai ul/ol/li. Form memakai label eksplisit yang
terhubung ke input; jangan mengandalkan placeholder sebagai label.

## ARIA dan widget interaktif

ARIA hanya melengkapi semantic HTML yang tidak cukup; jangan memakai ARIA bila
elemen native tersedia. role, aria-label, aria-describedby, aria-live, aria-busy
dan aria-expanded digunakan sesuai pola WAI-ARIA Authoring Practices. Custom
widget (dialog, tab, accordion, combobox) mengikuti pola keyboard yang
didokumentasikan. aria-hidden menyembunyikan dekorasi dari assistive technology.

## Keyboard dan fokus

Semua fungsi dapat diakses tanpa mouse. Tab order logis mengikuti DOM. Focus
visible jelas (outline minimum 2px, kontras cukup). Focus trap hanya pada modal/
dialog yang terbuka; keluar menutup dan mengembalikan fokus. Skip link ke konten
utama. Tidak ada keyboard trap; Escape menutup overlay. Shortcut keyboard tidak
menimpa shortcut browser/pembaca layar.

## Kontras dan visual

Teks normal: rasio kontras minimal 4,5:1. Teks besar (≥18pt atau ≥14pt bold):
3:1. Komponen UI dan grafik informatif: 3:1. Jangan mengandalkan warna saja
untuk menyampaikan informasi (gunakan ikon, label atau pola). Target sentuh
minimum 44×44 CSS pixel. Zoom 200% tidak memotong konten atau mematahkan layout.

## State dan feedback

Error, sukses dan status loading disampaikan via teks, aria-live/role=alert dan
fokus yang tepat; bukan hanya perubahan warna atau ikon. Form menampilkan pesan
error terhubung ke field (aria-describedby). Empty state, loading dan error
mempunyai informasi yang berguna. Reduced motion dihormati (prefers-reduced-motion).
Animasi tidak menyebabkan kejang (tidak lebih dari 3 flash per detik).

## Verifikasi

Uji keyboard tanpa mouse di setiap halaman. Uji dengan pembaca layar (VoiceOver/
NVDA/TalkBack). Periksa zoom 200%, viewport kecil, kontras dengan alat otomatis
(axe/Lighthouse) dan manual. Uji state loading/empty/error/success, form
validation dan notifikasi. Catat lingkungan, alat, hasil aktual dan perbaikan
yang diperlukan. Hasil alat otomatis bukan bukti aksesibilitas penuh.
