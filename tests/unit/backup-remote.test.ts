import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
const { send, receipt } = vi.hoisted(() => ({
  send: vi.fn(),
  receipt: vi.fn(),
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
    destroy() {}
  },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  GetObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));
vi.mock("../../src/server/db", () => ({
  db: { setting: { upsert: receipt } },
  json: (value: unknown) => value,
}));
import { archiveBackup, downloadBackup } from "../../src/server/backup-remote";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "buatin-archive-test-"));
  const directory = path.join(
    root,
    `buatin-2026-10-23T00-00-00-000Z-${randomUUID()}`,
  );
  const { mkdir } = await import("node:fs/promises");
  await mkdir(directory);
  for (const name of [
    "database.dump.enc",
    "manifest.json.enc",
    "envelope.json",
  ])
    await writeFile(path.join(directory, name), randomBytes(40));
  vi.stubEnv("BACKUP_S3_BUCKET", "fixture");
  vi.stubEnv("BACKUP_S3_ACCESS_KEY", "test-only-access");
  vi.stubEnv("BACKUP_S3_SECRET_KEY", "test-only-secret");
  vi.stubEnv("BACKUP_S3_ENDPOINT", "https://storage.fixture.example");
  return { root, directory };
}
it("writes completion and shared receipt only after every encrypted object round-trips", async () => {
  const { root, directory } = await fixture();
  const objects = new Map<string, Buffer>();
  send.mockImplementation(async ({ input }) => {
    if (input.Body !== undefined) {
      if (typeof input.Body === "string")
        objects.set(input.Key, Buffer.from(input.Body));
      else {
        const chunks: Buffer[] = [];
        for await (const chunk of input.Body) chunks.push(Buffer.from(chunk));
        objects.set(input.Key, Buffer.concat(chunks));
      }
      return {};
    }
    return { Body: Readable.from(objects.get(input.Key)!) };
  });
  try {
    await expect(archiveBackup(directory)).resolves.toMatchObject({
      verified: true,
      files: 3,
    });
    expect([...objects.keys()].at(-1)).toMatch(/\/COMPLETE.json$/);
    expect(receipt).toHaveBeenCalledOnce();
    const downloaded = await downloadBackup(
      path.basename(directory),
      path.join(root, "downloads"),
    );
    for (const name of [
      "envelope.json",
      "manifest.json.enc",
      "database.dump.enc",
    ]) {
      expect(await readFile(path.join(downloaded.directory, name))).toEqual(
        await readFile(path.join(directory, name)),
      );
      expect(
        (await stat(path.join(downloaded.directory, name))).mode & 0o077,
      ).toBe(0);
    }
    expect(receipt).toHaveBeenCalledOnce();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("rejects traversal, duplicate names, excess size and corruption during disaster recovery", async () => {
  const { root, directory } = await fixture();
  const id = path.basename(directory);
  const valid = {
    version: 1,
    id,
    completedAt: new Date().toISOString(),
    files: ["envelope.json", "manifest.json.enc", "database.dump.enc"].map(
      (name) => ({ name, bytes: 40, sha256: "a".repeat(64) }),
    ),
  };
  try {
    await expect(downloadBackup("../invalid", root)).rejects.toThrow(
      "Invalid backup ID",
    );
    for (const value of [
      { ...valid, files: [...valid.files, valid.files[0]] },
      {
        ...valid,
        files: valid.files.map((file, index) =>
          index ? file : { ...file, name: "../escape" },
        ),
      },
      { ...valid, id: `${id}wrong` },
    ]) {
      send.mockResolvedValue({
        Body: Readable.from(Buffer.from(JSON.stringify(value))),
      });
      await expect(downloadBackup(id, root)).rejects.toThrow();
    }
    send.mockImplementation(async ({ input }) => ({
      Body: Readable.from(
        input.Key.endsWith("COMPLETE.json")
          ? JSON.stringify(valid)
          : Buffer.alloc(40),
      ),
    }));
    await expect(downloadBackup(id, root, 100)).rejects.toThrow(
      "download limit",
    );
    await expect(downloadBackup(id, root)).rejects.toThrow("checksum mismatch");
    expect(receipt).not.toHaveBeenCalled();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("rejects corrupt remote data without marking a backup complete", async () => {
  const { root, directory } = await fixture();
  send.mockImplementation(async ({ input }) => {
    if (input.Body) {
      for await (const chunk of input.Body) void chunk;
      return {};
    }
    return { Body: Readable.from(Buffer.from("corrupted fixture")) };
  });
  try {
    await expect(archiveBackup(directory)).rejects.toThrow("checksum mismatch");
    expect(receipt).not.toHaveBeenCalled();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
