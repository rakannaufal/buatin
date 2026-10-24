import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalog, webTypes } from "../../src/domain/catalog";
import {
  defaultPlanner,
  editPlan,
  resolvePlan,
} from "../../src/domain/planner";
import { defaultPreferences } from "../../src/domain/preferences";
import { projectContext } from "../../src/domain/project-context";
import { skillCatalog, skillSelectionIssues } from "../../src/domain/skills";
import { skillSetup } from "../../src/domain/skill-setup";
import { generateFromTemplates } from "../../src/domain/template-generator";

describe("skill installation handoff", () => {
  it("includes reviewed Anti-slop and rejects removed Superdesign", () => {
    expect(skillCatalog.find((skill) => skill.id === "antislop")).toMatchObject(
      {
        status: "ready",
        license: "MIT",
        version: "671ab15c2ff6913cdd80717f602a89f0a9429a4b",
      },
    );
    expect(skillCatalog.some((skill) => skill.id === "superdesign")).toBe(
      false,
    );
    const preferences = defaultPreferences();
    preferences.skills = { mode: "manual", selected: ["superdesign"] };
    expect(skillSelectionIssues(preferences)).toEqual([
      "Skill superdesign tidak dikenal.",
    ]);
  });

  for (const type of webTypes) {
    it(`generates mandatory, verifiable skill setup for ${type.id}`, () => {
      const context = projectContext(defaultPreferences(), type.id);
      const plan = resolvePlan(
        defaultPlanner(type.id, "Website test"),
        "Website test",
        type.id,
      );
      expect(() => editPlan(plan, "skills", false)).toThrow("FILE_REQUIRED");
      expect(plan.selected[0]).toMatchObject({ id: "skills", locked: true });
      const result = generateFromTemplates({
        projectName: "Test setup",
        projectSlug: "test-setup",
        brief: "Website test",
        webType: type.id,
        plan,
        catalog,
        templates: Object.fromEntries(
          catalog.map((entry) => [
            entry.id,
            readFileSync(`templates/${entry.path}`, "utf8"),
          ]),
        ),
        preferences: context.preferences,
        projectContext: context,
      });
      const setup = result.files.find((file) => file.id === "skills")!;
      expect(setup.path).toBe("SKILLS.md");
      expect(setup.content).toContain("sebelum menjalankan");
      expect(setup.content).toContain("belum diverifikasi");
      expect(setup.content).toContain("bantuin-antislop/SKILL.md");
      expect(setup.content).not.toContain("{{");
      expect(
        result.files.find((file) => file.id === "agents")!.content,
      ).toContain("[SKILLS.md](SKILLS.md)");
      expect(
        result.files.find((file) => file.id === "index")!.content,
      ).toContain("[SKILLS.md](../SKILLS.md)");
      expect(result.issues.filter((issue) => issue.blocksExport)).toEqual([]);
      for (const installed of skillSetup(context.skills)) {
        const block = installed.definitionBlock;
        const body = block.slice(
          block.indexOf("\n") + 1,
          block.lastIndexOf("\n") + 1,
        );
        expect(createHash("sha256").update(body).digest("hex")).toBe(
          installed.definitionChecksum,
        );
        expect(setup.content).toContain(installed.definitionChecksum);
        expect(setup.content).toContain(body);
      }
      expect(
        result.manifest.files.some((file) => file.path === "SKILLS.md"),
      ).toBe(true);
    });
  }

  it("preserves the chosen snapshot and safely fences embedded Markdown", () => {
    const original = skillCatalog.find((skill) => skill.id === "antislop")!;
    const snapshot = {
      ...original,
      version: "snapshot-version",
      guidance: "Reviewed guidance\n```text\nexample\n```",
    };
    const [installed] = skillSetup([snapshot]);
    expect(installed.version).toBe("snapshot-version");
    expect(installed.definitionBlock).toContain(snapshot.guidance);
    expect(installed.definitionBlock.startsWith("````markdown\n")).toBe(true);
    expect(skillSetup([])).toEqual([]);
  });

  it("exports legacy built-in IDs under the current brand namespace", () => {
    const skills = skillCatalog.filter((skill) => skill.required);
    expect(skills.map((skill) => skill.id)).toEqual([
      "buatin-security",
      "buatin-verification",
    ]);
    expect(skillSetup(skills).map((skill) => skill.installPath)).toEqual([
      ".agents/skills/bantuin-security/SKILL.md",
      ".agents/skills/bantuin-verification/SKILL.md",
    ]);
  });
});
