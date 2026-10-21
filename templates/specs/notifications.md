# Notifications

## Pemicu dan penerima

Daftar event, kanal, tujuan, penerima, template, preferensi pengguna dan REQ terkait. Pisahkan pesan layanan dari pemasaran.

## Pengiriman persisten

Simpan outbox dengan deduplication key, status, attempts, retry/backoff, timeout dan batas maksimum. Pengiriman tidak boleh membuat operasi utama bergantung pada respons email yang lambat.

## Privasi dan kegagalan

Minimalkan data, verifikasi alamat, lindungi tautan/token, jangan tulis isi rahasia ke log. Gunakan sender/domain terverifikasi, bounce/suppression dan eskalasi kegagalan sesuai provider.

## Verifikasi

Uji pemicu sekali, duplikat, provider gagal, unsubscribe/preferensi, token kedaluwarsa dan antrean lama. Pengiriman mock tidak membuktikan email/SMS/push nyata diterima.
