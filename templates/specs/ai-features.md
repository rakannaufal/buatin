# Fitur AI

## Manfaat dan batas AI

Tentukan tugas yang membantu pengguna, input/output, kualitas yang diterima, hal yang dilarang dan fallback manusia. Output AI tidak dianggap fakta terverifikasi.

## Provider dan keamanan

Pilih model/provider berdasarkan kemampuan, latensi, biaya dan syarat data. Secrets tetap server; prompt, lampiran dan retrieved content adalah data tidak tepercaya. Tool memiliki allowlist serta otorisasi terpisah.

## Anggaran dan keandalan

Batasi input/output/context, request per pengguna/global, token/biaya harian, timeout dan retry. Reservasi persisten mencegah race; request ambigu dapat tetap tertagih. Aktifkan batas tagihan provider dan redaction.

## Evaluasi dan verifikasi

Buat fixture kasus normal, adversarial, instruksi lampiran berbahaya, kebocoran data, respons rusak, hallucination, usage hilang dan provider down. Jalankan evaluasi nyata terbatas; mock hanya membuktikan pipeline.
