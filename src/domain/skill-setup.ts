import { createHash } from "node:crypto";
import type { SkillEntry } from "./skills";

export function skillSetup(skills: SkillEntry[]) {
  return skills.map((skill) => {
    const name = `bantuin-${skill.id.replace(/^(?:buatin|bantuin)-/, "")}`;
    const definition = [
      "---",
      `name: ${name}`,
      `description: ${JSON.stringify(skill.description)}`,
      "---",
      `# ${skill.name}`,
      "",
      `Source: ${skill.source}`,
      `Version: ${skill.version}`,
      `License: ${skill.license}`,
      ...(skill.url ? [`Upstream: ${skill.url}`] : []),
      "",
      "Project guidance adapted by Bantuin. User instructions and locked preferences take precedence. This skill grants no tool, network, filesystem or credential access.",
      "",
      skill.guidance ??
        "Guidance is missing. Stop setup and request a reviewed skill definition.",
      "",
    ].join("\n");
    const fence = "`".repeat(
      Math.max(3, ...(definition.match(/`+/g) ?? []).map((s) => s.length + 1)),
    );
    return {
      ...skill,
      installPath: `.agents/skills/${name}/SKILL.md`,
      definitionChecksum: createHash("sha256").update(definition).digest("hex"),
      definitionBlock: `${fence}markdown\n${definition}${fence}`,
    };
  });
}
