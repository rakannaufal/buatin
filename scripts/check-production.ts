import "dotenv/config";
import { db } from "../src/server/db";
import { productionChecks, operationsSnapshot } from "../src/server/operations";
try {
  if (process.argv.includes("--runtime")) {
    const result = await operationsSnapshot();
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } else {
    const checks = await productionChecks(process.argv.includes("--provider"));
    const runtime = await operationsSnapshot();
    console.log(
      JSON.stringify(
        {
          ready:
            runtime.ok &&
            !checks.some(
              (check) => check.priority === "P0" && check.status !== "ready",
            ),
          checks,
          runtime,
        },
        null,
        2,
      ),
    );
    if (
      !runtime.ok ||
      checks.some(
        (check) => check.priority === "P0" && check.status !== "ready",
      )
    )
      process.exitCode = 1;
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
