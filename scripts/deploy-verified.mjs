import process from "node:process";
import console from "node:console";
import { URLSearchParams } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const { fetch, AbortSignal } = globalThis;
import { readFile } from "node:fs/promises";

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const run = event.workflow_run;
const repository = process.env.GITHUB_REPOSITORY;
if (
  run?.conclusion !== "success" ||
  run.event !== "push" ||
  run.head_branch !== "main" ||
  run.head_repository.full_name !== repository ||
  !/^[a-f0-9]{40}$/.test(run.head_sha)
)
  throw new Error(
    "Production requires a successful main-branch push validation in this repository.",
  );
for (const name of [
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_PROJECT_ID",
  "GH_TOKEN",
])
  if (!process.env[name])
    throw new Error(
      `${name} must be configured in the protected production environment. Automatic Git deployment stays disabled.`,
    );
const branch = await fetch(
  `https://api.github.com/repos/${repository}/git/ref/heads/main`,
  {
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(15000),
  },
);
if (!branch.ok) throw new Error("Cannot verify current main revision.");
if ((await branch.json()).object.sha !== run.head_sha)
  throw new Error("A newer commit exists on main; refusing stale deployment.");
const query = new URLSearchParams({ teamId: process.env.VERCEL_TEAM_ID });
const headers = {
  Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};
const response = await fetch(
  `https://api.vercel.com/v13/deployments?${query}`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "buatin",
      project: process.env.VERCEL_PROJECT_ID,
      target: "production",
      gitSource: {
        type: "github",
        repoId: event.repository.id,
        ref: "main",
        sha: run.head_sha,
      },
      meta: { validatedCommit: run.head_sha, validationRun: String(run.id) },
    }),
    signal: AbortSignal.timeout(30000),
  },
);
if (!response.ok)
  throw new Error(
    `Vercel deployment request failed (${response.status}); inspect provider logs without printing secrets.`,
  );
const deployment = await response.json();
if (!deployment.id) throw new Error("Vercel did not return a deployment ID.");
const deadline = Date.now() + 15 * 60000;
while (Date.now() < deadline) {
  const status = await fetch(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(deployment.id)}?${query}`,
    { headers, signal: AbortSignal.timeout(15000) },
  );
  if (!status.ok)
    throw new Error(`Cannot read deployment state (${status.status}).`);
  const state = await status.json();
  if (state.readyState === "READY") {
    console.log(
      `Deployment ready: ${deployment.id}; commit ${run.head_sha}. Public runtime checks follow.`,
    );
    process.exit(0);
  }
  if (["ERROR", "CANCELED"].includes(state.readyState))
    throw new Error(`Deployment ${deployment.id} ${state.readyState}.`);
  await delay(10000);
}
throw new Error("Deployment timed out; inspect Vercel before retrying.");
