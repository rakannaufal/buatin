import "dotenv/config";
import { db } from "../src/server/db";
import { productionChecks, operationsSnapshot } from "../src/server/operations";
import { deferredCheck, releaseScope } from "../src/domain/release-scope";
try {
  if (process.argv.includes("--runtime")) {
    const result = await operationsSnapshot();
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } else {
    const scope = releaseScope(process.argv);
    const checks = await productionChecks(
      process.argv.includes("--provider"),
      scope,
    );
    const runtime = await operationsSnapshot();
    const blockers = checks.filter(
      (check) => check.priority === "P0" && check.status !== "ready",
    );
    const activeBlockers = blockers.filter(
      (check) => !deferredCheck(check.id, scope),
    );
    console.log(
      JSON.stringify(
        {
          ready: runtime.ok && blockers.length === 0,
          scope,
          scopeReady: runtime.ok && activeBlockers.length === 0,
          deferred: checks
            .filter((check) => deferredCheck(check.id, scope))
            .map((check) => check.id),
          checks,
          runtime,
        },
        null,
        2,
      ),
    );
    if (!runtime.ok || activeBlockers.length > 0) process.exitCode = 1;
  }
} catch {
  console.error(
    JSON.stringify({
      ready: false,
      code: "OPERATIONS_CHECK_FAILED",
      detail: "Periksa database, migration dan konfigurasi filesystem.",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
