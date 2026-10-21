import "dotenv/config";
import { spawn } from "node:child_process";
import { hostedConfigurationIssues } from "../src/server/hosted";

const mode = process.argv[2];
if (!["web", "worker", "check"].includes(mode)) {
  console.error("Usage: node --import tsx scripts/hosted.ts web|worker|check");
  process.exit(1);
}
let issues: string[];
try {
  issues = hostedConfigurationIssues();
} catch {
  console.error(
    "Konfigurasi environment tidak valid. Periksa .env.example dan panduan deployment; nilai rahasia tidak dicetak.",
  );
  process.exit(1);
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}
if (mode === "check") {
  console.log(
    "Konfigurasi hosting lolos. Koneksi, kredensial dan layanan nyata tetap perlu uji staging.",
  );
} else {
  const args =
    mode === "web"
      ? ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
      : ["--import", "tsx", "src/worker/index.ts"];
  const child = spawn(process.execPath, args, {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => child.kill(signal));
  child.once("error", () => {
    console.error("Proses hosting tidak dapat dimulai.");
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    process.exitCode =
      code ?? (signal === "SIGTERM" || signal === "SIGINT" ? 0 : 1);
  });
}
