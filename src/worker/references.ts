import { fork, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { db } from "../server/db";
import { getEnv } from "../server/config";
import { readReference, writeReference } from "../server/reference-storage";
import { userLock } from "../server/limits";

interface Parsed {
  ok: boolean;
  text?: string;
  mime?: string;
  code?: string;
  image?: boolean;
}
export async function processReference(id: string) {
  const claimed = await db.projectAttachment.updateMany({
    where: { id, status: "queued", included: true },
    data: { status: "processing" },
  });
  if (!claimed.count) return;
  const attachment = await db.projectAttachment.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!attachment) return;
  const directory = await mkdtemp(path.join(tmpdir(), "buatin-reference-"));
  try {
    const input = path.join(directory, "input"),
      output = path.join(directory, "output");
    await writeFile(input, await readReference(attachment.storageKey), {
      mode: 0o600,
    });
    const binaryDocument =
      !attachment.mime.startsWith("image/") &&
      !attachment.mime.startsWith("text/");
    if (binaryDocument) {
      if (getEnv().REFERENCE_SCANNER_PATH) {
        try {
          await promisify(execFile)(
            getEnv().REFERENCE_SCANNER_PATH,
            ["--no-summary", input],
            {
              timeout: 20000,
              maxBuffer: 4096,
              env: {
                NODE_ENV: "production",
                PATH: process.env.PATH || "/usr/bin:/bin",
                CLAMAV_DATABASE_DIR:
                  process.env.CLAMAV_DATABASE_DIR || "/var/lib/clamav",
                TMPDIR: process.env.TMPDIR || "/tmp",
              },
            },
          );
        } catch {
          throw new Error("REFERENCE_SCAN_FAILED");
        }
      } else if (
        !["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(getEnv().APP_URL).hostname,
        )
      )
        throw new Error("REFERENCE_SCANNER_REQUIRED");
    }
    const parsed = await new Promise<Parsed>((resolve, reject) => {
      const child = fork(path.resolve("scripts/parse-reference.mjs"), [], {
        execArgv: ["--max-old-space-size=192"],
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" },
      });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("REFERENCE_PARSE_TIMEOUT"));
      }, getEnv().REFERENCE_PARSE_TIMEOUT_MS);
      child.once("error", () => {
        clearTimeout(timer);
        reject(new Error("REFERENCE_PARSE_FAILED"));
      });
      child.once("message", (value: Parsed) => {
        clearTimeout(timer);
        resolve(value);
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("REFERENCE_PARSE_FAILED"));
      });
      child.send({ input, output, mime: attachment.mime });
    });
    if (!parsed.ok) throw new Error(parsed.code ?? "REFERENCE_PARSE_FAILED");
    const data = await readFile(output);
    if (
      data.length >
      (parsed.image
        ? getEnv().MAX_REFERENCE_IMAGE_BYTES
        : getEnv().MAX_REFERENCE_DOCUMENT_BYTES)
    )
      throw new Error("REFERENCE_TOO_LARGE");
    await db.$transaction(
      async (tx) => {
        await userLock(tx, attachment.project.userId);
        const current = await tx.projectAttachment.findFirst({
          where: {
            id,
            included: true,
            status: "processing",
            processingVersion: attachment.processingVersion,
          },
        });
        if (!current) return;
        const usage = await tx.projectAttachment.aggregate({
          where: { projectId: attachment.projectId, included: true },
          _sum: { bytes: true },
        });
        if (
          (usage._sum.bytes ?? 0) - current.bytes + data.length >
          getEnv().MAX_REFERENCE_TOTAL_BYTES
        )
          throw new Error("REFERENCE_TOO_LARGE");
        await writeReference(attachment.storageKey, data);
        await tx.projectAttachment.update({
          where: { id },
          data: {
            status: "ready",
            text: parsed.text ?? "",
            mime: parsed.mime ?? attachment.mime,
            bytes: data.length,
            checksum: createHash("sha256").update(data).digest("hex"),
            errorCode:
              parsed.code ?? (parsed.image ? "IMAGE_NOT_ANALYZED" : null),
          },
        });
        // Upload already increments the brief version; planning is blocked until extraction finishes.
      },
      { timeout: 35000 },
    );
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "REFERENCE_PARSE_FAILED";
    await db.projectAttachment.updateMany({
      where: {
        id,
        status: "processing",
        processingVersion: attachment.processingVersion,
      },
      data: { status: "rejected", errorCode: code },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
