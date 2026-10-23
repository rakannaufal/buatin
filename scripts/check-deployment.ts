import { deploymentChecks } from "../src/domain/deployment-checks";
import { releaseScope } from "../src/domain/release-scope";

try {
  const origin =
    process.argv.slice(2).find((arg) => !arg.startsWith("--")) ||
    process.env.APP_URL;
  if (!origin)
    throw new Error(
      "Usage: npm run deploy:smoke -- https://deployment-origin [--scope=operations]",
    );
  const result = await deploymentChecks(origin, releaseScope(process.argv));
  console.log(JSON.stringify(result, null, 2));
  if (!result.scopeReady) process.exitCode = 1;
} catch {
  console.error(
    "Deployment check failed. Supply a valid origin and --scope=full or --scope=operations; inspect private provider logs.",
  );
  process.exitCode = 1;
}
