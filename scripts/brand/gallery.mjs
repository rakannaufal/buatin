const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");

export function galleryHtml(entries, colors) {
  const { ink, ocean, oceanInk, paper } = colors;
  const groups = [
    [
      "logos",
      "Identitas Buatin",
      entries.filter(
        (item) =>
          item.group === "logos" &&
          item.format === "svg" &&
          !item.file.includes("micro"),
      ),
    ],
    [
      "concepts",
      "Alternatif konsep",
      entries.filter((item) => item.group === "concepts"),
    ],
    [
      "illustrations",
      "Ilustrasi halaman",
      entries.filter(
        (item) => item.group === "illustrations" && item.format === "svg",
      ),
    ],
    [
      "doodles",
      "Kit doodle",
      entries.filter((item) => item.group === "doodles"),
    ],
    [
      "icons",
      "Ikon perangkat",
      entries.filter((item) => item.group === "icons" && item.format === "png"),
    ],
    [
      "social",
      "Pratinjau tautan",
      entries.filter(
        (item) => item.group === "social" && item.format === "png",
      ),
    ],
  ];
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Aset Buatin</title><style>
@font-face{font-family:Manrope;src:url(fonts/manrope.woff2) format('woff2');font-display:swap}
@font-face{font-family:SourceSerif;src:url(fonts/source-serif-4.woff2) format('woff2');font-display:swap}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${paper};color:${ink};font:15px/1.65 Manrope,sans-serif}
a{color:${oceanInk};text-underline-offset:4px}a:focus-visible{outline:3px solid ${ocean};outline-offset:4px}
header,main,footer{max-width:1440px;margin:auto;padding:40px clamp(20px,5vw,72px)}header{padding-top:62px;border-bottom:1px solid #b9d6e3}
h1{font:400 clamp(42px,5vw,72px)/1.1 SourceSerif,serif;letter-spacing:-.025em;margin:24px 0}h2{font:400 34px/1.2 SourceSerif,serif;margin:0 0 32px}p{max-width:70ch}
nav{display:flex;flex-wrap:wrap;gap:8px 24px}nav a{display:inline-flex;min-height:44px;align-items:center}
section{padding:32px 0 54px;scroll-margin-top:24px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 28px}.grid.social{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0;min-width:0}figure>a{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;background:#ffffff;border:1px solid #b9d6e3;border-radius:8px;overflow:hidden}figure.dark>a{background:${ocean}}
figure img{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;padding:16px}#logos img{padding:28px}#doodles img{padding:40px}
#icons img{width:auto;height:auto;max-width:100px;max-height:100px;image-rendering:auto;padding:0}#social img{padding:0}figcaption{padding-top:12px}figcaption span{display:block;color:${oceanInk};font-size:12px;margin-top:4px;overflow-wrap:anywhere}
.hero-preview{display:grid;grid-template-columns:1fr 1.3fr;align-items:center;gap:32px}.hero-preview img{width:100%}.hero-preview p{font-size:18px}footer{border-top:1px solid #b9d6e3;font-size:13px}
@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-preview{grid-template-columns:1fr}header{padding-top:30px}}
@media(max-width:480px){.grid,.grid.social{grid-template-columns:1fr}h2{font-size:28px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><header><img src="logos/buatin-horizontal-primary.svg" width="210" height="70" alt="Buatin"><div class="hero-preview"><div><h1>Dari coretan,<br>jadi terarah.</h1><p>Keluarga aset untuk halaman publik Buatin. Logo, ilustrasi, dan ornamen dibuat sebagai vektor. Palet Laut &amp; Matahari dipakai pada halaman publik dan autentikasi.</p><p>Logo L01 menjadi induk kerja. Persetujuan merek dan pemeriksaan kemiripan tetap terbuka.</p></div><img src="illustrations/hero-planning.svg" alt="Brief berubah menjadi kumpulan dokumen perencanaan"></div><nav aria-label="Kelompok aset">${groups.map(([id, title]) => `<a href="#${id}">${title}</a>`).join("")}<a href="README.md">Panduan</a></nav></header><main>${groups.map(([id, title, items]) => `<section id="${id}" aria-labelledby="${id}-heading"><h2 id="${id}-heading">${title}</h2><div class="grid ${id}">${items.map((item) => `<figure${item.file.includes("white.svg") ? ' class="dark"' : ""}><a href="${item.file}" aria-label="Buka ${xml(item.title)}"><img src="${item.file}" width="${item.width}" height="${item.height}" loading="lazy" alt="${xml(item.title)}"></a><figcaption>${xml(item.id ?? "")} ${xml(item.title)}<span>${xml(item.file)} &middot; ${item.format.toUpperCase()}${item.width ? ` &middot; ${item.width} &times; ${item.height}` : ""}</span></figcaption></figure>`).join("")}</div></section>`).join("")}</main><footer><p>Gambar asli disusun langsung dari path SVG. Lettering memakai Manrope dan Source Serif 4 dengan lisensi SIL OFL yang disertakan. Tidak menggunakan ilustrasi stok atau logo provider. Setiap aset dapat dibuka dari galeri.</p><a href="manifest.json">Manifest berkas dan checksum</a></footer></body></html>\n`;
}
