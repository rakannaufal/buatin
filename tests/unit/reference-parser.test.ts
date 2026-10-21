import { describe, expect, it } from "vitest";
import { fork } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { docxFixture, pdfFixture } from "../helpers/references";

async function parse(data: Buffer, mime: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "buatin-parser-test-"));
  const input = path.join(directory, "input"),
    output = path.join(directory, "output");
  await writeFile(input, data, { mode: 0o600 });
  const child = fork(path.resolve("scripts/parse-reference.mjs"), [], {
    execArgv: ["--max-old-space-size=192"],
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: { PATH: process.env.PATH, NODE_ENV: "test" },
  });
  try {
    const result = await new Promise<{
      ok: boolean;
      text?: string;
      mime?: string;
      code?: string;
    }>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("Parser timed out"));
      }, 10000);
      child.once("message", (message: { ok: boolean }) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Parser exited before response"));
      });
      child.send({ input, output, mime });
    });
    return { ...result, data: result.ok ? await readFile(output) : undefined };
  } finally {
    child.kill();
    await rm(directory, { recursive: true, force: true });
  }
}
describe("bounded reference parser", () => {
  it("extracts TXT/MD, rejects binary and malformed UTF-8, truncates context", async () => {
    expect(
      (await parse(Buffer.from("# Karsa\nKonten"), "text/markdown")).text,
    ).toContain("Konten");
    expect((await parse(Buffer.from([255, 254]), "text/plain")).ok).toBe(false);
    expect((await parse(Buffer.from("text\0"), "text/plain")).code).toBe(
      "INVALID_TEXT",
    );
    expect(
      (await parse(Buffer.from("x".repeat(15000)), "text/plain")).text,
    ).toHaveLength(12000);
  });
  it("re-encodes images to bounded WebP without EXIF", async () => {
    const image = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: "#235c46" },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const result = await parse(image, "image/jpeg");
    expect(result.mime).toBe("image/webp");
    const metadata = await sharp(result.data!).metadata();
    expect(metadata.width).toBe(1600);
    expect(metadata.exif).toBeUndefined();
    expect((await parse(Buffer.from("broken"), "image/png")).ok).toBe(false);
  });
  it("extracts PDF text and enforces the page limit", async () => {
    expect((await parse(pdfFixture(), "application/pdf")).text).toContain(
      "Studio Karsa",
    );
    expect((await parse(pdfFixture(101), "application/pdf")).code).toBe(
      "PDF_PAGE_LIMIT",
    );
    expect(
      (await parse(Buffer.from("%PDF-broken"), "application/pdf")).ok,
    ).toBe(false);
    expect(await parse(pdfFixture(1, ""), "application/pdf")).toMatchObject({
      ok: true,
      code: "OCR_REQUIRED",
      text: "",
    });
  });
  it("extracts DOCX while rejecting XML entities and expanded-size bombs", async () => {
    const mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect((await parse(await docxFixture(), mime)).text).toContain(
      "Studio Karsa",
    );
    expect(
      (
        await parse(
          await docxFixture(
            '<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]><w:t>&x;</w:t>',
          ),
          mime,
        )
      ).code,
    ).toBe("UNSAFE_DOCX");
    expect(
      (await parse(await docxFixture("x".repeat(2 * 1024 * 1024 + 1)), mime))
        .code,
    ).toBe("UNSAFE_DOCX");
  });
});
