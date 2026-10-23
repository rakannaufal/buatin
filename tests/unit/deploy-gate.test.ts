import { expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

it("refuses fork, pull request, failed and stale-branch validation before accessing deployment credentials", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "buatin-deploy-gate-"));
  const file = path.join(directory, "event.json");
  const valid = {
    conclusion: "success",
    event: "push",
    head_branch: "main",
    head_repository: { full_name: "fixture/repo" },
    head_sha: "a".repeat(40),
  };
  try {
    for (const override of [
      { conclusion: "failure" },
      { event: "pull_request" },
      { head_branch: "feature" },
      { head_repository: { full_name: "fork/repo" } },
    ]) {
      await writeFile(
        file,
        JSON.stringify({ workflow_run: { ...valid, ...override } }),
      );
      const result = spawnSync(
        process.execPath,
        ["scripts/deploy-verified.mjs"],
        {
          encoding: "utf8",
          env: {
            NODE_ENV: "test",
            PATH: process.env.PATH,
            GITHUB_REPOSITORY: "fixture/repo",
            GITHUB_EVENT_PATH: file,
          },
        },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("successful main-branch push validation");
    }
    await writeFile(file, JSON.stringify({ workflow_run: valid }));
    const missing = spawnSync(
      process.execPath,
      ["scripts/deploy-verified.mjs"],
      {
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          GITHUB_REPOSITORY: "fixture/repo",
          GITHUB_EVENT_PATH: file,
        },
      },
    );
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("VERCEL_TOKEN must be configured");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
