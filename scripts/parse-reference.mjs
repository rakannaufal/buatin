import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import process from "node:process";
import { TextDecoder } from "node:util";
import sharp from "sharp";
import yauzl from "yauzl";

const fail = (code) => {
  throw new Error(code);
};
async function docx(data) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      data,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error || !zip) {
          reject(new Error("INVALID_DOCX"));
          return;
        }
        let entries = 0,
          expanded = 0,
          content = "";
        const abort = () => {
          zip.close();
          reject(new Error("UNSAFE_DOCX"));
        };
        zip.on("error", () => {
          zip.close();
          reject(new Error("INVALID_DOCX"));
        });
        zip.on("entry", (entry) => {
          entries++;
          expanded += entry.uncompressedSize;
          if (
            entries > 300 ||
            expanded > 20 * 1024 * 1024 ||
            entry.uncompressedSize > 2 * 1024 * 1024 ||
            entry.isEncrypted() ||
            /(?:^|\/)\.\.(?:\/|$)|vbaProject|\.bin$/i.test(entry.fileName)
          ) {
            abort();
            return;
          }
          if (entry.fileName !== "word/document.xml") {
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (error, stream) => {
            if (error || !stream) {
              abort();
              return;
            }
            const chunks = [];
            let size = 0;
            stream.on("data", (chunk) => {
              size += chunk.length;
              if (size > 2 * 1024 * 1024) {
                stream.destroy();
                abort();
              } else chunks.push(chunk);
            });
            stream.on("error", () => abort());
            stream.on("end", () => {
              const xml = Buffer.concat(chunks).toString("utf8");
              if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
                abort();
                return;
              }
              content = xml
                .replace(/<w:(?:p|br|tab)[\s>][^>]*>/g, "\n")
                .replace(/<[^>]*>/g, "")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&amp;/g, "&")
                .slice(0, 12000);
              zip.readEntry();
            });
          });
        });
        zip.on("end", () =>
          content.trim()
            ? resolve(content)
            : reject(new Error("EMPTY_DOCUMENT")),
        );
        zip.readEntry();
      },
    );
  });
}
process.once("message", async ({ input, output, mime }) => {
  try {
    const data = await readFile(input);
    let text = "",
      warning,
      resultMime = mime,
      image = false;
    if (mime.startsWith("image/")) {
      const instance = sharp(data, {
        limitInputPixels: 24000000,
        animated: false,
        failOn: "error",
      });
      const metadata = await instance.metadata();
      if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1)
        fail("INVALID_IMAGE");
      await instance
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 86 })
        .toFile(output);
      resultMime = "image/webp";
      image = true;
    } else if (mime === "application/pdf") {
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loading = getDocument({
        data: new Uint8Array(data),
        isEvalSupported: false,
        useSystemFonts: false,
        disableFontFace: true,
        useWorkerFetch: false,
      });
      try {
        const document = await loading.promise;
        if (document.numPages > 100) fail("PDF_PAGE_LIMIT");
        for (
          let number = 1;
          number <= document.numPages && text.length < 12000;
          number++
        ) {
          const page = await document.getPage(number);
          const content = await page.getTextContent();
          text +=
            `\n[Halaman ${number}]\n` +
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");
          page.cleanup();
        }
      } finally {
        await loading.destroy();
      }
      if (!text.replace(/\[Halaman \d+\]/g, "").trim()) {
        warning = "OCR_REQUIRED";
        text = "";
      }
      await writeFile(output, data, { mode: 0o600 });
    } else if (mime.includes("wordprocessingml")) {
      text = await docx(data);
      await writeFile(output, data, { mode: 0o600 });
    } else {
      text = new TextDecoder("utf-8", { fatal: true }).decode(data);
      if (
        [...text].some(
          (character) =>
            character.charCodeAt(0) < 32 &&
            ![9, 10, 13].includes(character.charCodeAt(0)),
        ) ||
        !text.trim()
      )
        fail("INVALID_TEXT");
      await writeFile(output, Buffer.from(text, "utf8"), { mode: 0o600 });
    }
    process.send?.({
      ok: true,
      text: text.slice(0, 12000),
      mime: resultMime,
      image,
      code: warning,
    });
  } catch (error) {
    process.send?.({
      ok: false,
      code:
        error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "REFERENCE_PARSE_FAILED",
    });
  } finally {
    process.disconnect();
  }
});
