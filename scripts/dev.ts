import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

const loopback = (host: string) => ["127.0.0.1", "localhost"].includes(host);

export function developmentConfig(env: Record<string, string | undefined>) {
  const app = new URL(env.APP_URL || "http://localhost:3000");
  if (!loopback(app.hostname) || app.protocol !== "http:")
    throw new Error(
      "Peluncur dev membutuhkan APP_URL HTTP localhost/127.0.0.1.",
    );
  const mock = env.MOCK_LLM === undefined || env.MOCK_LLM === "true";
  const mockUrl = new URL(
    (mock && env.MOCK_LLM_BASE_URL) || "http://127.0.0.1:4010/v1",
  );
  if (
    mock &&
    (!loopback(mockUrl.hostname) ||
      mockUrl.protocol !== "http:" ||
      !/^\/v1\/?$/.test(mockUrl.pathname))
  )
    throw new Error("Mock dev membutuhkan URL HTTP loopback berakhiran /v1.");
  const webPort = Number(app.port || 80);
  const mockPort = Number(mockUrl.port || 80);
  if (mock && webPort === mockPort)
    throw new Error("Port web dan mock harus berbeda.");
  const db = env.DATABASE_URL ? new URL(env.DATABASE_URL) : undefined;
  return {
    appUrl: app.origin,
    webPort,
    mock,
    mockPort,
    localDatabase:
      !db ||
      (loopback(db.hostname) &&
        db.port === "55432" &&
        db.pathname === "/speckit"),
  };
}

async function requireFreePort(port: number) {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) =>
      reject(
        new Error(
          error.code === "EADDRINUSE"
            ? `Port ${port} sedang dipakai. Hentikan layanan lama sebelum npm run dev.`
            : `Port ${port} tidak dapat diperiksa (${error.code}).`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(() => resolve()));
  });
}

export async function stopChildren(children: ChildProcess[], timeout = 15000) {
  // Each service has its own process group, including watcher/server descendants.
  function signal(child: ChildProcess, value: NodeJS.Signals) {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") child.kill(value);
      else process.kill(-child.pid, value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            try {
              signal(child, "SIGKILL");
              resolve();
            } catch (error) {
              reject(error);
            }
          }, timeout);
          child.once("close", () => {
            clearTimeout(timer);
            try {
              signal(child, "SIGKILL");
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          try {
            signal(child, "SIGTERM");
            if (child.exitCode !== null || child.signalCode !== null) {
              clearTimeout(timer);
              signal(child, "SIGKILL");
              resolve();
            }
          } catch (error) {
            clearTimeout(timer);
            reject(error);
          }
        }),
    ),
  );
}

async function main() {
  const children: ChildProcess[] = [];
  let stopping = false;
  async function finish(code: number) {
    if (stopping) return;
    stopping = true;
    console.log(
      "\nMenghentikan web, worker, dan mock. PostgreSQL tetap berjalan.",
    );
    try {
      await stopChildren(children);
    } catch {
      console.error(
        "Sebagian proses gagal dihentikan; periksa terminal lokal.",
      );
      code = 1;
    }
    process.exit(code);
  }
  process.on("SIGINT", () => void finish(0));
  process.on("SIGTERM", () => void finish(0));

  function launch(label: string, args: string[], persistent = false) {
    if (stopping) throw new Error("Startup dibatalkan.");
    console.log(`[dev] ${label}`);
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      detached: process.platform !== "win32",
      env: process.env,
    });
    children.push(child);
    const ended = new Promise<void>((resolve, reject) => {
      child.once("error", () => reject(new Error(`${label} gagal dimulai.`)));
      child.once("exit", (code) => {
        if (stopping || code === 0) resolve();
        else reject(new Error(`${label} berhenti (exit ${code ?? "signal"}).`));
      });
    });
    if (persistent)
      void ended.then(
        () => {
          if (!stopping) {
            console.error(`${label} berhenti; layanan lain akan dihentikan.`);
            void finish(1);
          }
        },
        (error: Error) => {
          console.error(error.message);
          void finish(1);
        },
      );
    return ended;
  }

  try {
    console.log(`[dev] Node.js ${process.versions.node}`);
    config({ quiet: true });
    let settings = developmentConfig(process.env);
    await requireFreePort(settings.webPort);
    if (settings.mock) await requireFreePort(settings.mockPort);
    if (settings.localDatabase) {
      await launch("PostgreSQL lokal", [
        "--import",
        "tsx",
        "scripts/local-db.ts",
      ]);
      config({ quiet: true });
      settings = developmentConfig(process.env);
    }
    await launch("Prisma client", [
      "node_modules/prisma/build/index.js",
      "generate",
    ]);
    if (settings.localDatabase)
      await launch("Migration database lokal", [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
      ]);
    if (settings.mock) {
      process.env.MOCK_PORT = String(settings.mockPort);
      void launch("Mock AI", ["--import", "tsx", "scripts/mock-llm.ts"], true);
    }
    void launch("Worker", ["--import", "tsx", "src/worker/index.ts"], true);
    void launch(
      `Web ${settings.appUrl}`,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(settings.webPort),
      ],
      true,
    );
    console.log("Ctrl+C untuk berhenti. Mode AI mengikuti .env.");
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Startup dev gagal.",
    );
    await finish(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
