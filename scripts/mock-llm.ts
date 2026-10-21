import "dotenv/config";
import { createServer } from "node:http";
import { catalog, webTypes } from "../src/domain/catalog";
import { hasPositiveMention } from "../src/domain/planner";
import type { ProjectContext } from "../src/domain/project-context";
type Control = {
  mode?: string;
  failFile?: string;
  delay?: number;
  count?: number;
};
let control: Control = {};
let requests = 0;
const server = createServer(async (req, res) => {
  const send = (
    status: number,
    value: unknown,
    extra: Record<string, string> = {},
  ) => {
    res.writeHead(status, { "Content-Type": "application/json", ...extra });
    res.end(JSON.stringify(value));
  };
  if (req.url === "/health") return send(200, { ok: true });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 1048576) return send(413, { error: "too large" });
    chunks.push(part);
  }
  let body: Record<string, unknown> = {};
  try {
    if (size) body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return send(400, { error: "invalid JSON" });
  }
  if (req.url === "/__control" && req.method === "POST") {
    control = body as Control;
    requests = 0;
    return send(200, { ok: true });
  }
  if (req.url === "/__stats") return send(200, { requests });
  if (
    req.headers.authorization !==
    `Bearer ${process.env.MOCK_LLM_API_KEY || "mock-fixture-not-a-real-key"}`
  )
    return send(401, { error: "fixture authentication required" });
  if (control.mode === "auth")
    return send(401, { error: "fixture auth failure" });
  if (req.url === "/v1/models")
    return send(200, {
      data:
        control.mode === "empty-models"
          ? []
          : [{ id: "mock-planner" }, { id: "mock-writer" }],
    });
  if (req.url !== "/v1/chat/completions")
    return send(404, { error: "not found" });
  requests++;
  if (control.delay)
    await new Promise((resolve) => setTimeout(resolve, control.delay));
  if (control.mode === "rate" && requests <= (control.count ?? 1))
    return send(429, { error: "fixture rate limit" }, { "Retry-After": "1" });
  if (control.mode === "server") return send(503, { error: "fixture failure" });
  let input: Record<string, unknown>;
  try {
    const messages = body.messages as { content: string }[];
    const text = messages.at(-1)?.content ?? "{}";
    input = JSON.parse(
      text.includes("\nDATA:\n") ? text.split("\nDATA:\n").at(-1)! : text,
    );
  } catch {
    return send(400, { error: "invalid mock task" });
  }
  const brief = String(input.brief ?? "");
  const type = String(input.webType ?? "landing");
  const fileId = String(input.fileId ?? "");
  if (control.failFile === fileId)
    return send(503, { error: "fixture file failure" });
  let content: string;
  if (input.task === "plan") {
    const matches = catalog.filter((file) =>
      file.triggers.some((trigger) => hasPositiveMention(brief, trigger)),
    );
    content = JSON.stringify({
      project_name: `Rencana ${webTypes.find((t) => t.id === type)?.label ?? "website"}`,
      project_slug: `rencana-${type}`,
      web_type: type,
      summary: brief.slice(0, 300),
      complexity: type === "landing" ? "simple" : "medium",
      features_detected: matches.map((file) => {
        const trigger = file.triggers.find((t) =>
          hasPositiveMention(brief, t),
        )!;
        const index = brief.toLowerCase().indexOf(trigger);
        return {
          id: file.id,
          evidence: brief.slice(index, index + trigger.length),
        };
      }),
      files: matches.map((file) => ({
        id: file.id,
        decision: "include",
        reason: "Kebutuhan eksplisit pada brief",
        confidence: 0.9,
      })),
      missing_info:
        String(input.sourceBrief ?? brief).length < 80
          ? [
              { question: "Siapa pengguna utama website?", impact: "high" },
              { question: "Apa fitur yang wajib tersedia?", impact: "high" },
              { question: "Apa tujuan utama proyek?", impact: "high" },
            ]
          : [],
      assumptions: [
        "Mode mock: struktur untuk pengujian, belum dianalisis oleh model AI.",
      ],
      risks: [],
    });
  } else {
    const file = catalog.find((f) => f.id === fileId);
    content = `# ${file?.title ?? fileId}\n\n> MODE MOCK. Dokumen fixture untuk menguji alur aplikasi, bukan spesifikasi AI final.\n\n## Tujuan\n${file?.purpose ?? "Dokumen spesifikasi"}\n\n## Fakta dari brief\n${brief}\n\n## Rancangan awal\nREQ-01: Website memenuhi tujuan utama dalam brief.\nAC-01: REQ-01 dapat ditelusuri ke alur pengguna.\nTEST-01: Verifikasi REQ-01 terhadap AC-01 setelah implementasi.\nT-1.01: Implementasikan REQ-01 kemudian jalankan TEST-01.\n\n## Asumsi dan pertanyaan terbuka\nA-01: [ISI] Konfirmasi rincian kebutuhan bersama pemilik.\n\n## Status\nBelum diimplementasikan. Belum ada bukti pengujian proyek target.\n`;
  }
  const context = input.projectContext as ProjectContext | undefined;
  if (
    input.task !== "plan" &&
    context &&
    [
      "brief",
      "architecture",
      "design",
      "components",
      "agents",
      "security",
      "testing",
    ].includes(fileId)
  ) {
    content += `\n## Pilihan proyek (fixture)\nTeknologi: ${Object.entries(
      context.preferences.technology,
    )
      .map(([key, value]) => `${key}: ${value}`)
      .join(
        "; ",
      )}.\nWarna: ${context.preferences.palette.map((color) => `${color.name} ${color.hex}`).join(", ")}.\nGaya: ${JSON.stringify(context.preferences.style)}.\nSkill: ${context.skills.map((skill) => `${skill.name} (${skill.version})`).join(", ")}.\nReferensi: ${context.references.map((reference) => `${reference.name}: ${reference.note} ${reference.text}`).join("\n")}.\n`;
  }
  if (control.mode === "invalid") content = "not valid JSON or Markdown";
  return send(200, {
    id: `mock-${requests}`,
    model:
      control.mode === "model-change" && requests % 2 === 0
        ? "mock-fallback"
        : String(body.model),
    choices: [
      {
        message: {
          role: "assistant",
          content: control.mode === "empty" ? "" : content,
        },
        finish_reason: control.mode === "length" ? "length" : "stop",
      },
    ],
    usage: { prompt_tokens: 123, completion_tokens: 456 },
  });
});
server.listen(Number(process.env.MOCK_PORT || 4010), "127.0.0.1", () =>
  console.log(`Mock LLM: http://127.0.0.1:${process.env.MOCK_PORT || 4010}`),
);
