import assert from "node:assert/strict";
import console from "node:console";
import { fork } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import sharp from "sharp";

const root = process.cwd();
const tracePath = path.resolve(
  process.env.NEXT_BUILD_DIR || ".next",
  "server/app/api/[...segments]/route.js.nft.json",
);
const trace = JSON.parse(await readFile(tracePath, "utf8")).files;
for (const name of [
  "sharp",
  "detect-libc",
  "semver",
  "yauzl",
  "pend",
  "buffer-crc32",
])
  assert(
    trace.some((file) => file.includes(`/node_modules/${name}/`)),
    `${name} missing from deployment trace`,
  );
const directory = await mkdtemp(path.join(tmpdir(), "buatin-parser-trace-"));
let child;
try {
  let files = 0;
  for (const file of trace) {
    const source = path.resolve(path.dirname(tracePath), file);
    const relative = path.relative(root, source);
    if (
      relative === "scripts/parse-reference.mjs" ||
      /^node_modules\/(?:sharp|@img|detect-libc|semver|yauzl|pend|buffer-crc32)\//.test(
        relative,
      )
    ) {
      const target = path.join(directory, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      files++;
    }
  }
  // This directory has only traced parser assets, never the complete node_modules.
  const input = path.join(directory, "input"),
    output = path.join(directory, "output");
  const image = await sharp({
    create: { width: 64, height: 32, channels: 3, background: "#235c46" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  await writeFile(input, image, { mode: 0o600 });
  child = fork(path.join(directory, "scripts/parse-reference.mjs"), [], {
    cwd: directory,
    execArgv: ["--max-old-space-size=192"],
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: { PATH: process.env.PATH, NODE_ENV: "production" },
  });
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Traced parser timed out"));
    }, 10000);
    child.once("message", (value) => {
      clearTimeout(timer);
      resolve(value);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Traced parser exited before response"));
    });
    child.send({ input, output, mime: "image/jpeg" });
  });
  assert.equal(result.ok, true);
  assert.equal(result.mime, "image/webp");
  const metadata = await sharp(await readFile(output)).metadata();
  assert.equal(metadata.width, 64);
  assert.equal(metadata.exif, undefined);
  console.log(
    JSON.stringify({
      ok: true,
      tracedFiles: files,
      isolatedParser: true,
      exifRemoved: true,
    }),
  );
} finally {
  child?.kill();
  await rm(directory, { recursive: true, force: true });
}
