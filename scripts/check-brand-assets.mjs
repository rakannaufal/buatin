import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const directory = path.resolve("public/assets");
const manifest = JSON.parse(
  await readFile(path.join(directory, "manifest.json"), "utf8"),
);
const ids = new Set(manifest.entries.map((entry) => entry.id));
for (const [prefix, count] of [
  ["I", 20],
  ["D", 10],
  ["B", 12],
  ["L", 3],
  ["S", 3],
])
  for (let i = 1; i <= count; i++)
    assert(
      ids.has(`${prefix}${String(i).padStart(2, "0")}`),
      `Missing ${prefix}${i}`,
    );
const seen = new Set();
let vectors = 0,
  rasters = 0;
for (const item of manifest.entries) {
  assert(!seen.has(item.file), `Duplicate asset: ${item.file}`);
  seen.add(item.file);
  assert(!path.isAbsolute(item.file) && !item.file.split("/").includes(".."));
  const data = await readFile(path.join(directory, item.file));
  assert.equal(
    createHash("sha256").update(data).digest("hex"),
    item.sha256,
    item.file,
  );
  assert.equal(data.length, item.bytes, item.file);
  if (["svg", "png", "webp"].includes(item.format)) {
    const metadata = await sharp(data).metadata();
    assert.equal(metadata.width, item.width, item.file);
    assert.equal(metadata.height, item.height, item.file);
    if (item.format === "svg") {
      vectors++;
      const source = data.toString("utf8");
      assert(
        !/<(?:script|foreignObject|image|text)\b|(?:href|src)\s*=|url\(/i.test(
          source,
        ),
        item.file,
      );
      assert(!/NaN|Infinity|undefined/.test(source), item.file);
    } else rasters++;
    if (
      ["svg", "png", "webp"].includes(item.format) &&
      item.group === "illustrations"
    ) {
      const { data: pixels, info } = await sharp(data)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(
        pixels[3],
        0,
        `Non-transparent illustration corner: ${item.file}`,
      );
      assert(
        pixels.some((value, i) => i % info.channels === 3 && value > 0),
        `Blank asset: ${item.file}`,
      );
    }
  }
}
for (const size of [192, 512]) {
  const { data, info } = await sharp(
    path.join(directory, `icons/maskable-${size}.png`),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const background = [1, 3, 5].map((at) =>
    parseInt(manifest.palette.paper.slice(at, at + 2), 16),
  );
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * info.channels;
      if (
        Math.max(
          ...background.map((value, i) => Math.abs(data[offset + i] - value)),
        ) > 30
      )
        assert(
          Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) < size * 0.4,
          "Maskable mark outside safe circle",
        );
    }
}
const ico = await readFile(path.join(directory, "icons/favicon.ico"));
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 3);
for (let i = 0; i < 3; i++) {
  const at = 6 + i * 16,
    size = [16, 32, 48][i];
  assert.equal(ico[at], size);
  const data = ico.subarray(
    ico.readUInt32LE(at + 12),
    ico.readUInt32LE(at + 12) + ico.readUInt32LE(at + 8),
  );
  assert.equal((await sharp(data).metadata()).width, size);
}
const pdfs = JSON.parse(
  await readFile(path.join(directory, "pdf-manifest.json"), "utf8"),
);
for (const item of pdfs.entries) {
  const data = await readFile(path.join(directory, item.file));
  assert(data.subarray(0, 5).equals(Buffer.from("%PDF-")));
  assert.equal(createHash("sha256").update(data).digest("hex"), item.sha256);
}
console.log(
  `Verified ${manifest.entries.length} assets: ${vectors} SVG, ${rasters} raster, all 48 brief IDs, safe maskable icons, 3 ICO sizes and ${pdfs.entries.length} PDFs.`,
);
