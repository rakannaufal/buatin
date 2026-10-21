# Implementation plan

## Urutan pengiriman

Susun vertical slice yang dapat dijalankan dari awal sampai hasil, dimulai bootstrap/CI lalu alur inti, keamanan, kegagalan dan operasi. Gunakan task T-phase.number yang sesuai matriks penerimaan.

## Kontrak tiap task

Catat tujuan, REQ/AC/TEST, file/modul, dependency, owner/peran, risiko dan verifikasi. Gunakan task kecil yang meninggalkan proyek dalam keadaan dapat dijalankan.

## Persiapan rilis

Sediakan migration/seed bila perlu, env.example tanpa secrets, staging, auth, storage, backup/restore, health/readiness, logging, monitoring, domain/HTTPS dan rollback sesuai stack.

## Status dan keputusan

Tandai semua task target pending; pisahkan keputusan user/provider yang menghambat. Jangan menyatakan generator sudah membangun, menguji atau menerbitkan website target.
