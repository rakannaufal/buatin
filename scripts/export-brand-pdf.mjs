import { Buffer } from "node:buffer";
import console from "node:console";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const directory = path.resolve("public/assets");
const manifest = JSON.parse(
  await readFile(path.join(directory, "manifest.json"), "utf8"),
);
const browser = await chromium.launch({ headless: true });
const entries = [];
try {
  const page = await browser.newPage();
  await mkdir(path.join(directory, "logos/pdf"), { recursive: true });
  for (const item of manifest.entries.filter(
    (entry) =>
      entry.format === "svg" && ["logos", "concepts"].includes(entry.group),
  )) {
    const source = await readFile(path.join(directory, item.file), "utf8");
    const whiteProof = item.file.includes("-white.svg");
    const name = `${path.basename(item.file, ".svg")}${whiteProof ? "-proof" : ""}.pdf`;
    const file = `logos/pdf/${name}`;
    await page.setContent(
      `<html><head><style>@page{size:${item.width}px ${item.height}px;margin:0}html,body{margin:0;width:${item.width}px;height:${item.height}px;background:${whiteProof ? "#235c46" : "transparent"}}svg{display:block}</style></head><body>${source}</body></html>`,
    );
    const data = await page.pdf({
      width: `${item.width}px`,
      height: `${item.height}px`,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });
    if (!Buffer.from(data).subarray(0, 5).equals(Buffer.from("%PDF-")))
      throw new Error(`Invalid PDF: ${file}`);
    await writeFile(path.join(directory, file), data);
    entries.push({
      file,
      source: item.file,
      width: item.width,
      height: item.height,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
      background: whiteProof
        ? "forest-green proof; use SVG for transparent white artwork"
        : "none",
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(directory, "pdf-manifest.json"),
  `${JSON.stringify({ authoring: "Vector PDF exported from local SVG paths by Chromium", entries }, null, 2)}\n`,
);
console.log(
  `Exported ${entries.length} vector PDFs to public/assets/logos/pdf.`,
);
process.exitCode = 0;
