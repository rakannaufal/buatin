# Spesifikasi Privasi — {{projectName}}

> Dokumen ini mendefinisikan kebijakan privasi dan perlindungan data pengguna untuk **{{projectName}}**, sesuai dengan UU PDP (Undang-Undang Perlindungan Data Pribadi) Indonesia dan prinsip GDPR.

---

## Ringkasan

{{brief}}

Privasi pengguna adalah prioritas utama. Dokumen ini mengatur data apa yang dikumpulkan, mengapa, berapa lama disimpan, dan hak apa yang dimiliki pengguna atas data mereka.

---

## Data yang Dikumpulkan

### Data Identitas

| Data | Dasar Hukum | Tujuan | Retensi |
| ---- | ----------- | ------ | ------- |
{{#if hasAuth}}
| Nama lengkap | Kontrak | Identifikasi akun | Selama akun aktif |
| Alamat email | Kontrak | Login, komunikasi | Selama akun aktif |
| Password (hashed) | Kontrak | Autentikasi | Selama akun aktif |
| Foto profil | Persetujuan | Personalisasi | Selama akun aktif |
| Nomor telepon | Persetujuan | Kontak opsional | Selama akun aktif |
{{else}}
| Nama (opsional) | Persetujuan | Form kontak | 1 tahun |
| Email (opsional) | Persetujuan | Form kontak | 1 tahun |
{{/if}}

### Data Teknis

| Data       | Dasar Hukum     | Tujuan                    | Retensi           |
| ---------- | --------------- | ------------------------- | ----------------- |
| IP Address | Kepentingan sah | Keamanan, rate limiting   | 90 hari           |
| User Agent | Kepentingan sah | Kompatibilitas, debugging | 90 hari           |
| Cookie ID  | Persetujuan     | Session management        | Sesuai TTL cookie |
{{#if hasAuth}}
| Login timestamp | Kepentingan sah | Audit keamanan | 1 tahun |
| Device fingerprint | Kepentingan sah | Deteksi anomali | 90 hari |
{{/if}}

{{#if isEcommerce}}

### Data Transaksi

| Data              | Dasar Hukum | Tujuan              | Retensi         |
| ----------------- | ----------- | ------------------- | --------------- |
| Alamat pengiriman | Kontrak     | Fulfillment pesanan | 5 tahun (pajak) |
| Riwayat pesanan   | Kontrak     | Layanan pelanggan   | 5 tahun         |
| Data pembayaran   | Kontrak     | Proses pembayaran   | Tidak disimpan* |

> *Data kartu kredit/debit diproses langsung oleh payment gateway dan tidak disimpan di server {{projectName}}.

{{/if}}

{{#if isSaas}}

### Data Organisasi

| Data               | Dasar Hukum | Tujuan                 | Retensi           |
| ------------------ | ----------- | ---------------------- | ----------------- |
| Nama organisasi    | Kontrak     | Identifikasi workspace | Selama akun aktif |
| Data penggunaan    | Kontrak     | Billing, quota         | 2 tahun           |
| Konten yang dibuat | Kontrak     | Layanan inti           | Selama akun aktif |

{{/if}}

{{#if hasAnalytics}}

### Data Analitik

| Data                    | Dasar Hukum | Tujuan              | Retensi  |
| ----------------------- | ----------- | ------------------- | -------- |
| Halaman yang dikunjungi | Persetujuan | Analisis penggunaan | 26 bulan |
| Durasi kunjungan        | Persetujuan | Analisis UX         | 26 bulan |
| Event interaksi         | Persetujuan | Optimisasi fitur    | 26 bulan |
| Referrer URL            | Persetujuan | Analisis traffic    | 26 bulan |

> Analitik menggunakan cookie yang memerlukan persetujuan eksplisit pengguna.

{{/if}}

---

## Dasar Hukum Pemrosesan

| Dasar               | Contoh Penggunaan                                   |
| ------------------- | --------------------------------------------------- |
| **Kontrak**         | Pemrosesan yang diperlukan untuk memberikan layanan |
| **Persetujuan**     | Analitik, marketing email, cookie non-esensial      |
| **Kepentingan Sah** | Keamanan, pencegahan fraud, debugging               |
| **Kewajiban Hukum** | Retensi data transaksi untuk perpajakan             |

---

## Hak Pengguna (Subjek Data)

Sesuai UU PDP dan prinsip GDPR, pengguna memiliki hak:

| Hak                       | Deskripsi                           | Implementasi                 |
| ------------------------- | ----------------------------------- | ---------------------------- |
| **Hak Akses**             | Melihat data pribadi yang disimpan  | Halaman profil + export data |
| **Hak Koreksi**           | Memperbaiki data yang tidak akurat  | Edit profil                  |
| **Hak Hapus**             | Menghapus akun dan data pribadi     | Fitur hapus akun             |
| **Hak Portabilitas**      | Mengunduh data dalam format standar | Export JSON/CSV              |
| **Hak Keberatan**         | Menolak pemrosesan tertentu         | Opt-out settings             |
| **Hak Pembatasan**        | Membatasi pemrosesan data           | Pengaturan privasi           |
| **Hak Tarik Persetujuan** | Mencabut persetujuan yang diberikan | Cookie settings, unsubscribe |

### Mekanisme Pelaksanaan Hak

| Aksi              | Cara                            | Waktu Respons          |
| ----------------- | ------------------------------- | ---------------------- |
| Akses data        | Self-service via profil         | Instan                 |
| Export data       | Tombol "Download Data Saya"     | Maks 72 jam            |
| Hapus akun        | Pengaturan → Hapus Akun         | 30 hari (grace period) |
| Tarik persetujuan | Pengaturan cookie / unsubscribe | Instan                 |
| Pengaduan         | Email ke DPO / form kontak      | Maks 30 hari           |

---

## Cookie & Tracking

### Kategori Cookie

| Kategori       | Persetujuan | Contoh                     | Tujuan               |
| -------------- | ----------- | -------------------------- | -------------------- |
| **Esensial**   | Tidak perlu | Session ID, CSRF token     | Fungsionalitas dasar |
| **Fungsional** | Perlu       | Preferensi bahasa, tema    | Personalisasi        |
| **Analitik**   | Perlu       | Google Analytics, Mixpanel | Analisis penggunaan  |
| **Marketing**  | Perlu       | Facebook Pixel, Google Ads | Iklan tertarget      |

### Cookie Consent Banner

- Ditampilkan saat kunjungan pertama
- Opsi: "Terima Semua", "Tolak Non-Esensial", "Kelola Preferensi"
- Preferensi disimpan dan bisa diubah kapan saja
- Cookie non-esensial TIDAK dimuat sebelum persetujuan

---

## Keamanan Data

| Aspek                      | Implementasi                              |
| -------------------------- | ----------------------------------------- |
| **Enkripsi Transit**       | TLS 1.3 (HTTPS wajib)                     |
| **Enkripsi at Rest**       | AES-256 untuk data sensitif               |
| **Password**               | bcrypt hashing (cost 12)                  |
| **Akses Database**         | Least privilege, tidak ada akses langsung |
| **Backup**                 | Terenkripsi, retensi 30 hari              |
| **Audit Log**              | Semua akses data sensitif dicatat         |
| **Vulnerability Scanning** | Rutin, sebelum setiap release             |
| **Incident Response**      | Prosedur notifikasi dalam 72 jam          |

---

## Pihak Ketiga (Data Processor)

| Pihak Ketiga | Tujuan | Data yang Dibagikan | Lokasi Server |
| ------------ | ------ | ------------------- | ------------- |
{{#if hasAnalytics}}
| Google Analytics | Analitik web | Event anonim, IP (masked) | Global |
{{/if}}
{{#if hasPayments}}
| Payment Gateway | Proses pembayaran | Data transaksi | Indonesia/Global |
{{/if}}
| Cloud Provider | Hosting | Semua data aplikasi | Sesuai konfigurasi |
| Email Service | Transactional email | Nama, email | Global |
{{#if hasUploads}}
| Cloud Storage | Penyimpanan file | File yang diupload | Sesuai konfigurasi |
{{/if}}

> Semua pihak ketiga terikat Data Processing Agreement (DPA).

---

## Retensi & Penghapusan Data

| Kategori Data  | Retensi              | Setelah Retensi |
| -------------- | -------------------- | --------------- |
| Akun aktif     | Selama akun aktif    | —               |
| Akun dihapus   | 30 hari grace period | Hapus permanen  |
| Data transaksi | 5 tahun (pajak)      | Anonymize       |
| Log teknis     | 90 hari              | Hapus otomatis  |
| Analitik       | 26 bulan             | Hapus otomatis  |
| Backup         | 30 hari              | Rotasi otomatis |

### Proses Penghapusan Akun

1. User request hapus akun
2. Konfirmasi via email
3. Akun di-deactivate (30 hari grace period)
4. Setelah 30 hari, proses penghapusan:
   - Data profil → dihapus permanen
   - Konten yang dibuat → di-anonymize atau dihapus
   - Data transaksi → di-anonymize (retensi pajak)
   - Log → dihapus sesuai jadwal retensi

---

## Data Protection Officer (DPO)

| Aspek                 | Detail                          |
| --------------------- | ------------------------------- |
| **Kontak**            | privacy@{{projectName           | lowercase}}.com |
| **Tanggung Jawab**    | Pengawasan kepatuhan privasi    |
| **Pelaporan Insiden** | Dalam 72 jam setelah terdeteksi |
| **Review Kebijakan**  | Minimal 1x per tahun            |

---

## Kepatuhan

| Regulasi                | Status           | Catatan                                           |
| ----------------------- | ---------------- | ------------------------------------------------- |
| **UU PDP** (UU 27/2022) | Wajib            | Undang-Undang Perlindungan Data Pribadi Indonesia |
| **GDPR**                | Jika ada user EU | General Data Protection Regulation                |
| **PP 71/2019**          | Wajib            | Penyelenggaraan Sistem dan Transaksi Elektronik   |

---

> Kebijakan privasi ini harus di-review oleh tim legal sebelum implementasi dan di-update minimal setahun sekali. Versi terbaru harus selalu tersedia di halaman `/privacy` **{{projectName}}**.
