import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { developmentConfig, stopChildren } from "../../scripts/dev";

describe("development configuration", () => {
  it("starts local PostgreSQL and mock by default", () => {
    expect(developmentConfig({})).toMatchObject({
      webPort: 3000,
      mockPort: 4010,
      mock: true,
      localDatabase: true,
    });
  });

  it("honors custom ports and leaves an external database/provider alone", () => {
    expect(
      developmentConfig({
        APP_URL: "http://127.0.0.1:3100",
        MOCK_LLM: "false",
        MOCK_LLM_BASE_URL: "unused",
        DATABASE_URL: "postgresql://localhost:5432/external_dev",
      }),
    ).toMatchObject({ webPort: 3100, mock: false, localDatabase: false });
    expect(
      developmentConfig({ MOCK_LLM_BASE_URL: "http://localhost:4100/v1" })
        .mockPort,
    ).toBe(4100);
  });

  it("rejects public development URLs, wrong mock paths and port conflicts", () => {
    expect(() =>
      developmentConfig({ APP_URL: "https://example.com" }),
    ).toThrow();
    expect(() =>
      developmentConfig({ MOCK_LLM_BASE_URL: "http://example.com/v1" }),
    ).toThrow();
    expect(() =>
      developmentConfig({ MOCK_LLM_BASE_URL: "http://localhost:4010/api" }),
    ).toThrow();
    expect(() =>
      developmentConfig({ MOCK_LLM_BASE_URL: "http://localhost:3000/v1" }),
    ).toThrow("Port web dan mock harus berbeda");
  });
});

describe("development process cleanup", () => {
  const children: ChildProcess[] = [];
  afterEach(async () => {
    await stopChildren(children, 100);
    children.length = 0;
  });

  async function fixture(ignoreTermination = false) {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `${ignoreTermination ? 'process.on("SIGTERM", () => {});' : ""}
         setInterval(() => {}, 1000); console.log("ready");`,
      ],
      {
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    children.push(child);
    await once(child.stdout!, "data");
    return child;
  }

  it("terminates all launched services", async () => {
    const first = await fixture();
    const second = await fixture();
    const closed = Promise.all([once(first, "close"), once(second, "close")]);
    await stopChildren(children);
    await closed;
    expect(first.signalCode).toBe("SIGTERM");
    expect(second.signalCode).toBe("SIGTERM");
  });

  it("forces termination when a service ignores SIGTERM", async () => {
    const child = await fixture(true);
    const closed = once(child, "close");
    await stopChildren(children, 100);
    await closed;
    expect(child.signalCode).toBe("SIGKILL");
  });

  it.skipIf(process.platform === "win32")(
    "cleans up descendants after their parent has already exited",
    async () => {
      const parent = spawn(
        process.execPath,
        [
          "-e",
          `const { spawn } = require("node:child_process");
           const child = spawn(process.execPath, ["-e", 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000); console.log("ready");'], { stdio: ["ignore", "pipe", "ignore"] });
           child.stdout.once("data", () => { console.log(child.pid); child.unref(); child.stdout.destroy(); });`,
        ],
        { detached: true, stdio: ["ignore", "pipe", "pipe"] },
      );
      children.push(parent);
      const closed = once(parent, "close");
      await once(parent.stdout!, "data");
      await closed;
      // The orphan keeps the original process group alive until cleanup.
      expect(() => process.kill(-parent.pid!, 0)).not.toThrow();
      await stopChildren(children, 100);
      await expect
        .poll(() => {
          try {
            process.kill(-parent.pid!, 0);
            return false;
          } catch (error) {
            return (error as NodeJS.ErrnoException).code === "ESRCH";
          }
        })
        .toBe(true);
    },
  );
});
