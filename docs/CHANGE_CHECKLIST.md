# Checklist perubahan

- Tujuan dan acceptance criteria jelas; dampak dibatasi pada kebutuhan perubahan.
- Pola repo, preferensi manual dan kompatibilitas draft/snapshot lama diperiksa.
- Input/API divalidasi; ownership, secrets, upload dan retensi ditinjau.
- Bug memiliki reproduksi atau regression test yang bermakna.
- Test relevan dijalankan setelah edit; perintah, hasil dan gap dicatat.
- Format, lint, typecheck, test, build, audit dan secret scan wajib lulus sebelum rilis.
- UI diuji desktop/mobile, keyboard, kontras, serta loading/error/empty/success.
- Strategi lazy/skeleton dinilai per halaman; hero/LCP langsung tersedia,
  placeholder stabil/aksesibel, tanpa delay buatan atau progres palsu. Perubahan
  performa dibuktikan dengan HTML/network dan metrik aktual bila target tersedia.
- Migration dan environment baru didokumentasikan; rollback menjaga data lama.
- Tabel aplikasi baru mengaktifkan RLS dan mencabut akses role publik Supabase;
  server tetap memakai role yang ditinjau. Query web memakai pool kecil, sedangkan
  migration/backup dan advisory lock worker memakai koneksi direct/session.
- Skill/dependency baru memiliki sumber, versi terkunci, lisensi dan batas dukungan.
- Hasil mock serta test pending tidak dilaporkan sebagai bukti produksi.
