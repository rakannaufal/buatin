---
name: Buatin - Halaman Publik
description: Doodle dokumen dan tulisan tangan untuk membawa ide menjadi rencana website.
colors:
  forest: "#235c46"
  forest-hover: "#194935"
  sage: "#e4eee7"
  marker: "#f3d37a"
  pale-yellow: "#fff6dc"
  ink: "#202b27"
  paper: "#faf7ef"
  sheet: "#fffdf8"
  muted: "#536157"
  line: "#c9d2c5"
  input-line: "#8c9e87"
typography:
  display:
    fontFamily: "Caveat, cursive"
    fontSize: "clamp(52px, 6.6vw, 96px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(30px, 3.2vw, 44px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  reading:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.95
  note:
    fontFamily: "Caveat, cursive"
    fontSize: "29px"
    fontWeight: 400
    lineHeight: 1.2
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
rounded:
  button: "9px 13px 11px 12px"
  card: "13px 19px 12px 16px"
  field: "6px 9px 5px 8px"
spacing:
  small: "12px"
  medium: "24px"
  large: "48px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    typography: "{typography.label}"
    padding: "12px 23px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    typography: "{typography.label}"
    padding: "12px 23px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "48px"
  workflow-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px 28px 30px"
---

# Design System: Buatin - Halaman Publik

## Overview

**Creative North Star: "Catatan yang jadi rencana"**

Halaman publik memakai dunia brief, lembar dokumen, pensil dan folder. Tulisan
tangan memberi suara santai pada judul; garis tinta dan aksen kertas mengikat
ilustrasi, kartu dan tombol. Arahan ini mengikuti permintaan doodle dan empat
screenshot referensi pengguna.

Isi panjang dan formulir memakai huruf yang mudah dibaca. Halaman kebijakan
menempatkan ilustrasi di kepala halaman, lalu memberi ruang pada teks dan daftar
isi. Sistem ini berlaku pada halaman publik, autentikasi dan fallback umum.
Dashboard dan workspace mempertahankan tipografi serta komponen aplikasi.

**Key Characteristics:**

- Judul tulisan tangan dengan isi Manrope.
- Kertas krem, tinta hijau gelap dan sorotan kuning terbatas.
- Doodle dokumen, folder, pensil, penjepit dan selotip dari pustaka aset proyek.
- Tombol berbingkai tinta, kartu seperti lembar catatan, fokus keyboard jelas.

## Colors

Palet berasal dari aset Buatin; warna mendukung hierarki isi dan tindakan.

### Primary

- **Forest:** tindakan utama, penekanan tulisan tangan, tautan dan fokus.
- **Forest Hover:** keadaan hover tombol utama.

### Secondary

- **Sage:** bidang contoh dokumen, panel cerita autentikasi dan sebagian kartu.
- **Marker:** sorotan kata pada judul dan aksesori kertas.
- **Pale Yellow:** variasi latar kartu yang tetap memakai teks tinta.

### Neutral

- **Ink:** judul, teks utama dan bingkai tombol.
- **Paper:** latar halaman, dengan tile tekstur halus dari aset proyek.
- **Sheet:** permukaan formulir, kartu dan isi kebijakan.
- **Muted:** keterangan pendukung yang tetap memiliki kontras baca.
- **Line / Input Line:** pemisah isi dan batas formulir.

## Typography

**Display Font:** Caveat, dengan fallback cursive.
**Body Font:** Manrope, dengan fallback sans-serif.

Keduanya dimuat lokal dari dependency Fontsource yang dikunci. Caveat tersedia
pada bobot 400 dan 700. Source Serif 4 tetap digunakan pada workspace dan kartu
berbagi yang sudah ada.

### Hierarchy

- **Display:** judul utama; ukurannya mengikuti peran halaman dan layar. Hero
  menggunakan skala display, kebijakan lebih ringkas, autentikasi dibatasi panel.
- **Headline:** judul bagian dengan Manrope; kata yang ditekankan memakai Caveat.
- **Body:** penjelasan publik; lebar paragraf hero dibatasi sekitar 480px.
- **Reading:** isi kebijakan; menjadi 14px dengan line-height 1.9 pada ponsel.
- **Note:** keterangan ilustrasi dan catatan pendek; turun menjadi 25px di ponsel.
- **Label:** tindakan dan navigasi, tetap menggunakan Manrope.

**The Reading Rule.** Tulisan tangan menandai judul dan catatan; isi hukum,
harga, label formulir dan pesan kesalahan tetap memakai Manrope.

## Layout

Kontainer publik memiliki lebar maksimum 1240px. Gutter desktop mengikuti
`calc(100% - 96px)`, turun menjadi 24px per sisi pada lebar 800px ke bawah dan
20px per sisi pada 520px ke bawah.

Hero, contoh dokumen dan bagian paket memakai dua kolom di desktop. Pada ponsel,
isi disusun berurutan dan hero memilih komposisi ilustrasi persegi. Kartu paket
berubah dari empat menjadi dua kolom pada 1100px, lalu satu pada 520px. Area
tindakan kartu menyediakan ruang keterangan agar tombol pada satu baris sejajar.

Navigasi menjadi menu buka-tutup pada 800px. Daftar isi kebijakan yang melekat di
desktop menjadi daftar horizontal yang dapat digeser pada layar kecil. Tabel
perbandingan paket mempertahankan lebar isi dan bergeser di dalam region sendiri,
termasuk melalui keyboard, tanpa melebarkan halaman.

Bagian landing memakai jarak vertikal yang lebih lega daripada isi satu kartu.
Panel autentikasi berubah dari dua kolom menjadi susunan vertikal pada 800px.

## Elevation & Depth

Kedalaman memakai bayangan kecil yang berarah, sesuai tombol berbingkai dan
motif kertas pada referensi. Kartu menggunakan bayangan lebih ringan; tumpukan
lembar pada contoh dokumen memiliki satu lapisan miring. Isi kebijakan tetap
tenang tanpa dekorasi di antara paragraf.

### Shadow Vocabulary

- **Paper:** `3px 5px 0 #202b2714`, untuk kartu dan formulir.
- **Action:** `2px 3px 0 var(--ink)`, untuk tombol publik.
- **Action Hover:** `3px 4px 0 var(--ink)`, dengan pergeseran 1px.
- **Action Pressed:** `0 1px 0 var(--ink)`, dengan pergeseran ke bawah.

## Shapes

Sudut tombol, formulir dan kartu sedikit tidak seragam; nilai utamanya tercatat
di frontmatter. Garis tinta setebal 1.5px menegaskan tindakan dan kartu. Batas isi
kebijakan lebih tipis. Logo mempertahankan rasio master; varian putih mengikuti
aturan latar di panduan aset.

## Components

### Buttons

Tindakan terasa seperti label pada lembar kerja: bingkai tinta, isi solid dan
bayangan kecil. Tinggi minimum tombol utama 50px; menu mobile 44px. Hover
mengubah warna dan posisi, pressed menurunkan bayangan. Fokus memakai outline
Forest 3px dengan offset 5px. Disabled memakai isi netral, teks terbaca dan tanpa
bayangan. Reduced motion meniadakan transisi.

### Cards / Containers

Kartu langkah menggabungkan ilustrasi, nomor urutan, judul dan penjelasan. Kartu
paket mengutamakan nama, harga dari layanan, kuota, masa simpan dan tindakan.
Warna Sage/Pale Yellow membedakan permukaan; informasi paket tetap ada di HTML.

Jenis website pada landing memakai kartu kertas berisi ikon garis, nama dan
keterangan dari katalog. Grid tiga kolom berubah menjadi dua kolom di tablet
dan satu kolom di ponsel. Kategori Lainnya memakai kertas kuning dengan bingkai
putus-putus. Kartu merupakan informasi, tanpa perilaku tombol atau hover palsu.

### Inputs / Fields

Isian memakai latar Sheet, bingkai Input Line dan ukuran teks 16px. Fokus
menampilkan outline Forest 2px dengan offset 3px. Label terlihat, pesan kesalahan
berdekatan dengan isian. Formulir mempertahankan pending, disabled, success,
error dan challenge dari alur autentikasi yang sudah ada.

### Navigation

Logo dan tautan utama terlihat di desktop. Menu mobile memiliki status expanded,
menutup setelah pemilihan halaman, dan Escape mengembalikan fokus ke tombol.
Halaman aktif memiliki underline. Tautan lewati konten tersedia pada publik dan
autentikasi; target formulir menerima fokus sebelum Tab ke kontrol pertama.

### FAQ and Reading Paper

FAQ memakai `details`/`summary` native dengan tanda tambah/minus. Jawaban tetap
terkirim di HTML. Daftar isi mengarah ke heading isi sebenarnya. Teks kebijakan
tidak dipindahkan ke gambar atau dikurangi ketika tema diterapkan.

### Artwork

Logo dan ilustrasi berasal dari `public/assets/`. Hero dimuat eager dengan
prioritas tinggi; ilustrasi bagian bawah dapat lazy. Dimensi gambar disediakan.
Gambar dekoratif memakai alt kosong, sementara judul dan instruksi tetap HTML.
Satu gerakan singkat pada hero memakai ease-out; reduced motion mematikannya.

## Do's and Don'ts

### Do:

- **Do** gunakan aset dokumen dan palet yang sudah tersedia sebagai satu keluarga.
- **Do** pertahankan tulisan tangan pada judul, dengan isi panjang mudah dibaca.
- **Do** periksa menu, fokus keyboard, pemuatan aset dan layout mobile.
- **Do** ambil harga, kuota dan ketersediaan paket dari data layanan.

### Don't:

- **Don't** terapkan wrapper atau token publik pada dashboard dan workspace.
- **Don't** tampilkan katalog skill internal pada antarmuka.
- **Don't** tambahkan harga, testimoni, sertifikasi atau janji produk yang belum ada.
- **Don't** letakkan dekorasi di atas paragraf kebijakan atau kontrol formulir.
