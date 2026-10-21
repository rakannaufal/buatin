# Architecture

## Konteks dan batas sistem

Jelaskan pengguna, modul, API, data, storage, queue serta layanan eksternal yang benar-benar diperlukan. Mulai dari arsitektur sederhana; pemisahan layanan harus mempunyai alasan.

## Pilihan teknologi

Catat kategori, teknologi, versi yang perlu diverifikasi, lisensi, alasan dan alternatif material. Kunci pilihan manual dan none; stack generator Buatin tidak menentukan stack target. Hindari layanan yang tidak memberi nilai bagi kebutuhan.

## Rendering dan aliran data

Petakan per halaman SSG/SSR/streaming/CSR, server/client, state lokal/server, cache/invalidation dan kontrak data. Hero/LCP dan isi awal tersedia segera; lazy aset/kode dan pagination diputuskan terpisah. Skeleton hanya untuk penantian async nyata.

## Struktur dan integrasi

Tetapkan batas domain, direktori, schema/migration, auth/RBAC, transaksi, timeout/retry, idempotensi dan pekerjaan latar yang relevan. Nyatakan env dan secrets tanpa nilainya.

## Risiko dan verifikasi

Hubungkan keputusan D-xxx ke kebutuhan. Tinjau keamanan, aksesibilitas, biaya, operasional, backup/restore dan kapasitas 12 bulan. Catat pemeriksaan yang harus dilakukan setelah implementasi.
