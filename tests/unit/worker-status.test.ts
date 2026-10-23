import { afterEach, expect, it, vi } from "vitest";
import {
  workerScannerReady,
  scannerExecutableAvailable,
} from "../../src/server/worker-status";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const find = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/db", () => ({
  db: { setting: { findUnique: find } },
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("fails scanner capability closed when the executable health probe fails", async () => {
  vi.stubEnv("REFERENCE_SCANNER_PATH", "/usr/bin/true");
  vi.stubEnv("REFERENCE_SCANNER_HEALTH_PATH", "/usr/bin/false");
  expect(await scannerExecutableAvailable()).toBe(false);
  const directory = await mkdtemp(path.join(tmpdir(), "buatin-scanner-probe-"));
  try {
    const probe = path.join(directory, "probe");
    await writeFile(
      probe,
      '#!/bin/sh\ntest "$1" = "--health" && test -z "$DATABASE_URL" && test -z "$NINEROUTER_API_KEY"\n',
      { mode: 0o700 },
    );
    vi.stubEnv("REFERENCE_SCANNER_HEALTH_PATH", probe);
    expect(await scannerExecutableAvailable()).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("refuses missing and expired ClamAV databases before scanning", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "buatin-signature-test-"),
  );
  try {
    const args = ["scripts/reference-scanner.mjs", "--health"];
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      PATH: process.env.PATH,
      CLAMAV_DATABASE_DIR: directory,
    };
    expect(spawnSync(process.execPath, args, { env }).status).toBe(2);
    const file = path.join(directory, "daily.cvd");
    await writeFile(file, "expired fixture");
    const { utimes } = await import("node:fs/promises");
    await utimes(file, new Date(0), new Date(0));
    expect(spawnSync(process.execPath, args, { env }).status).toBe(2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("uses fresh worker capabilities rather than the web host scanner path", async () => {
  vi.spyOn(Date, "now").mockReturnValue(100000);
  for (const heartbeat of [
    null,
    { value: { scanner: true }, updatedAt: new Date(69999) },
    { value: { scanner: true }, updatedAt: new Date(100001) },
    { value: { at: "legacy-heartbeat" }, updatedAt: new Date(99999) },
    { value: { scanner: false }, updatedAt: new Date(99999) },
  ]) {
    find.mockResolvedValue(heartbeat);
    await expect(workerScannerReady()).resolves.toBe(false);
  }
  find.mockResolvedValue({
    value: { scanner: true },
    updatedAt: new Date(99999),
  });
  await expect(workerScannerReady()).resolves.toBe(true);
});
