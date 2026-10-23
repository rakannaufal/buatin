import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { hasSecret } from "../src/domain/lint";

const baseline = JSON.parse(
  await readFile("security-history-baseline.json", "utf8"),
) as {
  revoked: Array<{ path: string; fingerprint: string }>;
};
const allowed = new Set(
  baseline.revoked.map((item) => `${item.path}:${item.fingerprint}`),
);
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], {
  encoding: "utf8",
});
let reviewed = 0,
  legacy = 0,
  failures = 0;
for (const row of objects.trim().split("\n")) {
  const [id, ...parts] = row.split(" ");
  const path = parts.join(" ");
  if (
    !/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|txt|example)$/.test(path) ||
    path.endsWith("package-lock.json")
  )
    continue;
  const content = execFileSync("git", ["cat-file", "blob", id], {
    encoding: "utf8",
    maxBuffer: 8 * 1048576,
  });
  reviewed++;
  for (const [index, line] of content.split("\n").entries()) {
    if (!hasSecret(line)) continue;
    const fingerprint = createHash("sha256").update(line.trim()).digest("hex");
    if (allowed.has(`${path}:${fingerprint}`)) {
      legacy++;
      continue;
    }
    console.error(
      `${id.slice(0, 12)} ${path}:${index + 1}: unreviewed historical credential (value redacted)`,
    );
    failures++;
  }
}
console.log(
  JSON.stringify({
    reviewed,
    revokedLegacyMatches: legacy,
    unreviewedMatches: failures,
  }),
);
if (failures) process.exitCode = 1;
