# Data model

## Entitas dan relasi

Daftar entitas, tujuan, pemilik, kardinalitas dan aturan domain yang mendasari penyimpanan. Hapus kebutuhan database bila konten statis sudah cukup.

## Schema dan constraint

Tulis tabel field, tipe, nullable/default, primary/foreign key, unique, index dan timestamps. Query terparameterisasi; indeks mengikuti filter/join/order/pagination yang nyata.

## Transaksi dan konsistensi

Tentukan operasi atomic, versi untuk concurrent edit, idempotensi, soft/hard delete dan N+1. Multi-tenant memerlukan tenant key dan pemeriksaan server pada setiap query.

## Migration dan lifecycle

Rencanakan migration berurutan, kompatibilitas data lama, seed fixture, retensi, penghapusan, backup terenkripsi serta restore ke lingkungan terpisah. Jangan menjalankan penghapusan produksi dari test.

## Verifikasi

Uji constraint, rollback transaksi, race, ownership, query plan pada volume representatif, migration maju dan latihan pemulihan. Status hasil tetap pending sebelum dijalankan.
