# Multitenancy

## Definisi tenant

Tentukan organisasi, keanggotaan, undangan, role, pemilik resource dan pemisahan pengguna yang tergabung beberapa organisasi.

## Isolasi server dan schema

Semua query/mutation/cache/storage/job membawa tenant terotorisasi dari sesi server. Gunakan constraint gabungan, index dan kebijakan RLS bila sesuai; tenant ID dari request tidak dipercaya tanpa membership.

## Lifecycle dan administrasi

Rancang pindah tenant, undangan kedaluwarsa, penghapusan organisasi, ekspor, billing serta audit. Akses operator lintas tenant harus eksplisit, terbatas dan tercatat.

## Verifikasi

Uji pembacaan/pembaruan/download lintas tenant, role downgrade, job latar, cache pollution, membership dicabut serta export/delete tanpa kebocoran.
