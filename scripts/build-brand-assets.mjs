import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { format } from "prettier";
import {
  artwork,
  ornaments,
  colors,
  group,
  shape,
  symbol,
} from "./brand/artwork.mjs";
import { outlineFont } from "./brand/font-outlines.mjs";
import { galleryHtml } from "./brand/gallery.mjs";

const root = process.cwd();
const directory = path.join(root, "public/assets");
const entries = [];
const { ink, ocean, oceanInk, paper, white } = colors;
const illustrationBrief =
  "Original editorial doodle for Buatin, a service turning website briefs into planning documents. Controlled hand-drawn rounded ink lines, slight irregularity, simple shapes, generous negative space. Sea & Sun palette: ocean blue #167DAD, ink #173444, pale sky #DFF2FA, sunshine yellow #FFD35A, blue-white paper #F0FBFF. Transparent background. No written words, gradients, 3D, heavy shadows, watermarks, stock characters, or certification badges. Match this asset family's geometry.";
const logoBrief =
  "Original Buatin mark: a capital B formed by folded planning-document shapes and deliberate negative space. Friendly geometry, compact silhouette, legible at small sizes. Flat single color with clean paths. Derive variants from one parent mark.";
const fonts = {
  bold: await outlineFont(
    path.join(
      root,
      "node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff",
    ),
  ),
  regular: await outlineFont(
    path.join(
      root,
      "node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff",
    ),
  ),
  serif: await outlineFont(
    path.join(
      root,
      "node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff",
    ),
  ),
};
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function save(file, content, details = {}) {
  const absolute = path.join(directory, file);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
  const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
  entries.push({ file, bytes: data.length, sha256: hash(data), ...details });
  return data;
}
async function saveSvg(
  file,
  body,
  width,
  height,
  details,
  viewBox = `0 0 ${width} ${height}`,
) {
  const metadata = xml(
    JSON.stringify({ authoring: "native-vector", brief: details.prompt }),
  );
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${xml(details.title)}</title><metadata>${metadata}</metadata>${body}</svg>\n`;
  assert(
    !/<(?:script|foreignObject|image|text)\b|(?:href|src)\s*=|url\(/i.test(
      content,
    ),
    `Unsafe or non-outlined SVG: ${file}`,
  );
  assert(!/NaN|Infinity|undefined/.test(content), `Invalid geometry: ${file}`);
  const buffer = await save(file, content, {
    ...details,
    width,
    height,
    format: "svg",
  });
  const image = await sharp(buffer).metadata();
  assert.equal(image.width, width);
  assert.equal(image.height, height);
  return buffer;
}
async function raster(file, source, width, details = {}, type = "png") {
  const rendered = sharp(source).resize({ width, withoutEnlargement: false });
  const buffer =
    type === "webp"
      ? await rendered.webp({ lossless: true, effort: 6 }).toBuffer()
      : await rendered.png({ compressionLevel: 9 }).toBuffer();
  const image = await sharp(buffer).metadata();
  await save(file, buffer, {
    ...details,
    width: image.width,
    height: image.height,
    format: type,
  });
  return buffer;
}

for (const item of artwork) {
  const details = {
    id: item.id,
    group: "illustrations",
    title: item.title,
    usage: item.usage,
    decorative: true,
    prompt: `${illustrationBrief} ${item.prompt}`,
  };
  const file = `illustrations/${item.name}.svg`;
  const source = await saveSvg(
    file,
    item.body(),
    item.width,
    item.height,
    details,
    item.viewBox ?? "0 0 640 480",
  );
  await raster(`illustrations/png/${item.name}.png`, source, item.width, {
    ...details,
    source: file,
  });
  await raster(
    `illustrations/webp/${item.name}.webp`,
    source,
    item.width,
    { ...details, source: file },
    "webp",
  );
}
for (const item of ornaments) {
  const box = item.viewBox.split(" ").map(Number);
  await saveSvg(
    `doodles/${item.name}.svg`,
    item.body(),
    box[2],
    box[3],
    {
      id: item.id,
      group: "doodles",
      title: item.title,
      decorative: true,
      prompt: `${illustrationBrief} ${item.prompt}`,
    },
    item.viewBox,
  );
}

const wordmark = (size, x, y, color = ocean) =>
  fonts.bold.text("Buatin", size, { x, y, fill: color, tracking: -0.6 });
function logoBody(kind, color) {
  if (kind === "symbol" || kind === "symbol-micro")
    return {
      body: symbol(color, kind === "symbol-micro"),
      width: 64,
      height: 64,
    };
  if (kind === "wordmark") {
    const word = wordmark(104, 24, 112, color);
    return { body: word.body, width: Math.ceil(word.width + 48), height: 144 };
  }
  if (kind === "stacked") {
    const word = wordmark(76, 0, 260, color);
    return {
      body:
        group(symbol(color), 126, 24, 2.3) +
        group(word.body, (400 - word.width) / 2, 0),
      width: 400,
      height: 292,
    };
  }
  const word = wordmark(88, 126, 105, color);
  const width = Math.ceil(word.width + 156);
  let body = group(symbol(color), 20, 23, 1.4) + word.body;
  if (kind === "tagline")
    body += fonts.regular.text("Dari ide, jadi terarah.", 23, {
      x: 130,
      y: 145,
      fill: color,
    }).body;
  return { body, width, height: kind === "tagline" ? 172 : 144 };
}
const logoIds = {
  symbol: "B01",
  wordmark: "B02",
  horizontal: "B03",
  stacked: "B04",
  "symbol-micro": "B07",
  tagline: "B11",
};
for (const kind of Object.keys(logoIds)) {
  for (const [variant, color] of [
    ["primary", ocean],
    ["black", "#000000"],
    ["white", white],
  ]) {
    const drawing = logoBody(kind, color);
    const file = `logos/buatin-${kind}-${variant}.svg`;
    const details = {
      id:
        variant === "black"
          ? "B05"
          : variant === "white"
            ? "B06"
            : logoIds[kind],
      group: "logos",
      title: `Buatin ${kind} ${variant}`,
      prompt: `${logoBrief} ${kind} composition, ${variant} variant. Lettering outlined from the pinned Manrope font.`,
    };
    const source = await saveSvg(
      file,
      drawing.body,
      drawing.width,
      drawing.height,
      details,
    );
    if (["symbol", "wordmark", "horizontal", "stacked"].includes(kind))
      for (const width of variant === "primary" ? [512, 1024, 2048] : [1024])
        await raster(
          `logos/png/buatin-${kind}-${variant}-${width}.png`,
          source,
          width,
          { ...details, id: "B12", source: file },
        );
  }
}
for (const [id, name, body] of [
  ["L01", "folded-brief", group(symbol(), 72, 59, 2.5)],
  ["L02", "document-b", group(symbol(ocean, false, true), 72, 59, 2.5)],
  [
    "L03",
    "folded-wordmark",
    wordmark(67, 23, 153).body + shape("M205 167L223 167L223 149Z", ocean),
  ],
]) {
  await saveSvg(
    `logos/concepts/${id.toLowerCase()}-${name}.svg`,
    body,
    320,
    280,
    {
      id,
      group: "concepts",
      title: `Konsep ${id}: ${name}`,
      prompt: `${logoBrief} ${id === "L01" ? "Capital B folded-paper mark; working parent." : id === "L02" ? "Alternative document silhouette with lowercase-b negative space." : "Alternative outlined wordmark with a folded-paper terminal."}`,
    },
  );
}

const micro = await readFile(
  path.join(directory, "logos/buatin-symbol-micro-primary.svg"),
);
await save("icons/favicon.svg", micro, {
  id: "B08",
  group: "icons",
  format: "svg",
  width: 64,
  height: 64,
  title: "Favicon Buatin",
  source: "logos/buatin-symbol-micro-primary.svg",
});
const icoImages = [];
for (const size of [16, 32, 48])
  icoImages.push(
    await raster(`icons/favicon-${size}.png`, micro, size, {
      id: "B08",
      group: "icons",
      title: `Favicon ${size}px`,
    }),
  );
const icoHeader = Buffer.alloc(6 + icoImages.length * 16);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoImages.length, 4);
let icoOffset = icoHeader.length;
for (let i = 0; i < icoImages.length; i++) {
  const entry = 6 + i * 16;
  icoHeader[entry] = icoHeader[entry + 1] = [16, 32, 48][i];
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(icoImages[i].length, entry + 8);
  icoHeader.writeUInt32LE(icoOffset, entry + 12);
  icoOffset += icoImages[i].length;
}
await save("icons/favicon.ico", Buffer.concat([icoHeader, ...icoImages]), {
  id: "B08",
  group: "icons",
  format: "ico",
  title: "Favicon 16, 32, 48px",
});
for (const [name, sizes, maskable] of [
  ["apple-touch-icon", [180], false],
  ["android-chrome", [192, 512], false],
  ["maskable", [192, 512], true],
]) {
  const body =
    `<path fill="${paper}" d="M0 0H512V512H0Z"/>` +
    group(
      symbol(ocean, true),
      maskable ? 115 : 83,
      maskable ? 112 : 79,
      maskable ? 4.4 : 5.4,
    );
  const file = `icons/${name}.svg`;
  const source = await saveSvg(file, body, 512, 512, {
    id: "B09",
    group: "icons",
    title: `Ikon ${name}`,
    prompt: `${logoBrief} Centered device icon on blue-white paper; essential geometry inside a circle of 80 percent diameter.`,
  });
  for (const size of sizes)
    await raster(`icons/${name}-${size}.png`, source, size, {
      id: "B09",
      group: "icons",
      title: `${name} ${size}px`,
      source: file,
    });
}
const avatar = await saveSvg(
  "logos/buatin-avatar.svg",
  `<path fill="${ocean}" d="M0 0H1024V1024H0Z"/>${group(symbol(white), 253, 249, 8)}`,
  1024,
  1024,
  {
    id: "B10",
    group: "logos",
    title: "Avatar Buatin",
    prompt: `${logoBrief} White symbol on ocean blue, centered and safe under a circular crop.`,
  },
);
await raster("logos/png/buatin-avatar-1024.png", avatar, 1024, {
  id: "B10",
  group: "logos",
  title: "Avatar Buatin",
  source: "logos/buatin-avatar.svg",
});

// Seeded, seamless low-contrast grain, with no SVG filter or random build output.
const grain = Buffer.alloc(512 * 512 * 4);
let seed = 171024;
for (let i = 0; i < grain.length; i += 4) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  grain[i] = parseInt(ink.slice(1, 3), 16);
  grain[i + 1] = parseInt(ink.slice(3, 5), 16);
  grain[i + 2] = parseInt(ink.slice(5, 7), 16);
  grain[i + 3] = seed % 7 === 0 ? (seed >>> 24) % 10 : 0;
}
for (const format of ["png", "webp"]) {
  const image = sharp(grain, { raw: { width: 512, height: 512, channels: 4 } });
  const buffer =
    format === "png"
      ? await image.png().toBuffer()
      : await image.webp({ lossless: true }).toBuffer();
  await save(`textures/paper-grain.${format}`, buffer, {
    id: "D05",
    group: "textures",
    width: 512,
    height: 512,
    format,
    title: "Tekstur kertas halus",
    decorative: true,
    prompt:
      "Seamless extremely subtle transparent paper grain. No stains, creases, shadows, strong contrast, or visible repeating marks.",
    authoring: "seeded-raster",
  });
}

const socialPages = [
  [
    "landing",
    "S01",
    ["Ide website Anda,", "buatin rencananya."],
    "Dari brief menjadi dokumen perencanaan.",
    "hero-planning",
  ],
  [
    "pricing",
    "S02",
    ["Ruang untuk", "setiap tahap ide."],
    "Bandingkan paket Buatin.",
    "pricing-documents",
  ],
  [
    "terms",
    "S02",
    ["Ketentuan", "layanan."],
    "Akun, paket, dan penggunaan Buatin.",
    "terms-document",
  ],
  [
    "privacy",
    "S02",
    ["Kebijakan", "privasi."],
    "Data, penyimpanan, dan hak Anda.",
    "privacy-folder",
  ],
  [
    "faq",
    "S02",
    ["Pertanyaan?", "Temukan jawabannya."],
    "Panduan penggunaan Buatin.",
    "faq-conversation",
  ],
  [
    "refund",
    "S02",
    ["Pengembalian", "dana."],
    "Pengajuan dan penanganan tagihan.",
    "refund-receipt",
  ],
  [
    "disclaimer",
    "S02",
    ["Batas penggunaan", "hasil."],
    "Tinjau rencana sebelum digunakan.",
    "disclaimer-review",
  ],
  [
    "cookies",
    "S02",
    ["Kebijakan", "cookie."],
    "Sesi akun dan keamanan browser.",
    "cookies-browser",
  ],
  [
    "contact",
    "S02",
    ["Ada kendala?", "Hubungi pengelola."],
    "Bantuan akun, dokumen, dan pembayaran.",
    "contact-message",
  ],
];
function socialScene(page, square = false) {
  const [, , lines, subtitle, illustration] = page;
  const drawing = artwork.find((item) => item.name === illustration);
  const width = square ? 1080 : 1200,
    height = square ? 1080 : 630;
  let body =
    `<path fill="${paper}" d="M0 0H${width}V${height}H0Z"/>` +
    group(logoBody("horizontal", ocean).body, 40, 31, 0.56);
  const fontSize = square ? 76 : illustration === "faq-conversation" ? 62 : 68;
  lines.forEach((line, i) => {
    body += fonts.serif.text(line, fontSize, {
      x: 70,
      y: (square ? 236 : 269) + i * (fontSize + 9),
      fill: i ? ocean : ink,
      tracking: -0.6,
    }).body;
  });
  body += fonts.regular.text(subtitle, square ? 25 : 22, {
    x: 73,
    y: square ? 398 : 451,
    fill: oceanInk,
  }).body;
  body += `<svg x="${square ? 110 : 667}" y="${square ? 443 : 136}" width="${square ? 858 : 488}" height="${square ? 545 : 376}" viewBox="${drawing.viewBox ?? "0 0 640 480"}">${drawing.body()}</svg>`;
  body += `<path d="M72 ${height - 60}Q${width / 2} ${height - 54} ${width - 72} ${height - 60}" fill="none" stroke="${ocean}" stroke-width="1.5"/>`;
  return { body, width, height };
}
for (const page of socialPages) {
  const scene = socialScene(page);
  const details = {
    id: page[1],
    group: "social",
    title: `Pratinjau ${page[0]}`,
    prompt: `Buatin ${page[0]} sharing card: working L01 parent logo, corresponding doodle, blue-white paper, and separately outlined factual Indonesian text. No prices or unverified claims.`,
  };
  const file = `social/og-${page[0]}.svg`;
  const source = await saveSvg(
    file,
    scene.body,
    scene.width,
    scene.height,
    details,
  );
  await raster(`social/og-${page[0]}.png`, source, scene.width, {
    ...details,
    source: file,
  });
}
const squareScene = socialScene(socialPages[0], true);
const square = await saveSvg(
  "social/buatin-square.svg",
  squareScene.body,
  1080,
  1080,
  {
    id: "S03",
    group: "social",
    title: "Gambar berbagi persegi",
    prompt:
      "Recompose the sharing-card system into a square, preserving logo proportions, generous margins, and a short separately outlined Indonesian headline.",
  },
);
await raster("social/buatin-square.png", square, 1080, {
  id: "S03",
  group: "social",
  title: "Buatin persegi",
  source: "social/buatin-square.svg",
});

for (const [name, packageName, fontFile] of [
  ["Manrope", "manrope", "manrope-latin-400-normal.woff2"],
  ["Source Serif 4", "source-serif-4", "source-serif-4-latin-400-normal.woff2"],
]) {
  await mkdir(path.join(directory, "licenses"), { recursive: true });
  await copyFile(
    path.join(root, `node_modules/@fontsource/${packageName}/LICENSE`),
    path.join(directory, `licenses/${packageName}-OFL.txt`),
  );
  await save(
    `fonts/${packageName}.woff2`,
    await readFile(
      path.join(
        root,
        `node_modules/@fontsource/${packageName}/files/${fontFile}`,
      ),
    ),
    {
      group: "fonts",
      title: name,
      format: "woff2",
      license: `licenses/${packageName}-OFL.txt`,
    },
  );
}
await copyFile(
  path.join(root, "node_modules/@fontsource/caveat/LICENSE"),
  path.join(directory, "licenses/caveat-OFL.txt"),
);
await writeFile(
  path.join(directory, "index.html"),
  await format(galleryHtml(entries, colors), { parser: "html" }),
);
const promptItems = [...artwork, ...ornaments];
await writeFile(
  path.join(directory, "PROMPTS.md"),
  await format(
    [
      "# Brief dan prompt aset Buatin",
      "",
      "Aset digambar langsung sebagai geometri SVG. Prompt adalah brief sumber, bukan klaim penggunaan model gambar.",
      "",
      "## Ilustrasi dan doodle",
      "",
      `Prompt dasar: ${illustrationBrief}`,
      "",
      "| ID | Berkas | Prompt tambahan |",
      "| --- | --- | --- |",
      ...promptItems.map(
        (item) => `| ${item.id} | ${item.name}.svg | ${item.prompt} |`,
      ),
      "",
      "## Logo dan berbagi",
      "",
      logoBrief,
      "",
      "| ID | Berkas | Brief |",
      "| --- | --- | --- |",
      ...entries
        .filter(
          (item) =>
            item.prompt &&
            ["logos", "concepts", "icons", "social", "textures"].includes(
              item.group,
            ) &&
            (item.format === "svg" || item.group === "textures"),
        )
        .map((item) => `| ${item.id} | ${item.file} | ${item.prompt} |`),
      "",
    ].join("\n"),
    { parser: "markdown" },
  ),
);
await copyFile(
  path.join(root, "scripts/brand/README.md"),
  path.join(directory, "README.md"),
);
await writeFile(
  path.join(directory, "manifest.json"),
  await format(
    JSON.stringify({
      brand: "Buatin",
      version: 2,
      created: "2026-10-24",
      palette: colors,
      authoring:
        "Local SVG geometry and pinned-font outlines; no image-generation service used.",
      scope:
        "Public and authentication assets only; application routes unchanged.",
      parentLogo: "L01",
      approvalStatus: "pending-owner-review",
      trademarkReview: "not-performed",
      fontSources: [
        "@fontsource/manrope@5.3.0",
        "@fontsource/source-serif-4@5.3.1",
        "@fontsource/caveat@5.3.0",
      ],
      entries,
    }),
    { parser: "json" },
  ),
);
const total = (
  await Promise.all(
    entries.map((entry) => stat(path.join(directory, entry.file))),
  )
).reduce((sum, value) => sum + value.size, 0);
console.log(
  `Created ${entries.length} assets, ${(total / 1024 / 1024).toFixed(2)} MiB. Gallery: public/assets/index.html`,
);
