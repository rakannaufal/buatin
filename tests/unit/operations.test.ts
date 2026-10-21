import { afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encryptBackup, decryptBackup } from "../../src/server/backup-crypto";
import { estimatedMicros } from "../../src/server/ai-budget";
import { checkOperatorMfa } from "../../src/server/operator-access";
import { callLlm } from "../../src/server/llm";
afterEach(() => vi.unstubAllEnvs());
it("authenticates encrypted backup contents and their file context", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "buatin-backup-test-"));
  try {
    const key = randomBytes(32),
      source = path.join(directory, "source"),
      encrypted = path.join(directory, "cipher");
    await writeFile(source, "private fixture contents", { mode: 0o600 });
    await encryptBackup(source, encrypted, key, "fixture/database.dump");
    await decryptBackup(
      encrypted,
      path.join(directory, "restored"),
      key,
      "fixture/database.dump",
    );
    expect(await readFile(path.join(directory, "restored"), "utf8")).toBe(
      "private fixture contents",
    );
    await expect(
      decryptBackup(
        encrypted,
        path.join(directory, "wrong-context"),
        key,
        "other/database.dump",
      ),
    ).rejects.toThrow();
    const tampered = await readFile(encrypted);
    tampered[tampered.length - 1] ^= 1;
    await writeFile(encrypted, tampered);
    await expect(
      decryptBackup(
        encrypted,
        path.join(directory, "tampered"),
        key,
        "fixture/database.dump",
      ),
    ).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("requires MFA for public operator access", () => {
  vi.stubEnv("APP_URL", "https://fixture.example");
  vi.stubEnv("ADMIN_REQUIRE_2FA", "true");
  expect(() => checkOperatorMfa({ twoFactorEnabled: false })).toThrowError(
    "ADMIN_2FA_REQUIRED",
  );
  expect(() => checkOperatorMfa({ twoFactorEnabled: true })).not.toThrow();
});
it("rounds cost reservations upward and rejects unaudited real AI calls", async () => {
  expect(estimatedMicros(1, 1, 0.1, 0.2)).toBe(1n);
  const config = {
    baseUrl: "http://127.0.0.1/v1",
    authMode: "header" as const,
    planner: "fixture",
    writer: "fixture",
    mock: false,
    timeout: 1000,
    interval: 0,
    maxTokens: 100,
    maxResponseBytes: 2048,
    systemAsUser: false,
    temperaturePlanner: 0,
    temperatureWriter: 0,
  };
  await expect(callLlm(config, "write", "fixture", {})).rejects.toMatchObject({
    code: "LLM_AUDIT_REQUIRED",
  });
});
