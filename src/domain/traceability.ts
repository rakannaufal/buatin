import type { OutputFile } from "./lint";

const patterns = {
  req: /\bREQ-\d+\b/g,
  ac: /\bAC-\d+\b/g,
  test: /\bTEST-\d+\b/g,
  task: /\bT-\d+\.\d+\b/g,
};
type Kind = keyof typeof patterns;
const source: Record<Kind, string> = {
  req: "prd",
  ac: "acceptance",
  test: "testing",
  task: "implementation-plan",
};
const ids = (text: string, kind: Kind) => [
  ...new Set(text.match(patterns[kind]) ?? []),
];

export function traceability(files: OutputFile[]) {
  const content = (kind: Kind) =>
    files.find((f) => f.id === source[kind])?.content ?? "";
  // A row, bullet, or paragraph is one relationship. Never infer links from the whole document.
  const records = (kind: Kind) =>
    content(kind).split(
      /\n\s*\n|\n(?=\s*(?:\||[-*] |#{1,6} |(?:REQ|AC|TEST|T)-))/,
    );
  const related = (kind: Kind, references: string[]) => [
    ...new Set(
      records(kind)
        .filter((record) =>
          references.some((ref) =>
            ids(record, "req")
              .concat(
                ids(record, "ac"),
                ids(record, "test"),
                ids(record, "task"),
              )
              .includes(ref),
          ),
        )
        .flatMap((record) => ids(record, kind)),
    ),
  ];
  const rows = ids(content("req"), "req").map((req) => {
    const ac = related("ac", [req]);
    const test = related("test", [req, ...ac]);
    return { req, ac, test, task: related("task", [req, ...ac, ...test]) };
  });
  const untested = ids(content("ac"), "ac").filter(
    (ac) => !related("test", [ac]).length,
  );
  const undefinedIds = files.flatMap((file) =>
    (Object.keys(patterns) as Kind[]).flatMap((kind) =>
      ids(file.content, kind)
        .filter((id) => !ids(content(kind), kind).includes(id))
        .map((id) => ({ fileId: file.id, id })),
    ),
  );
  return { rows, untested, undefinedIds };
}
