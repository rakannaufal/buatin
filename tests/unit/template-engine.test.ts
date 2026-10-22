import { describe, it, expect } from "vitest";
import { renderTemplate, escapeHtml } from "../../src/domain/template-engine";

describe("escapeHtml", () => {
  it("escapes &, <, >, quotes", () => {
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("renderTemplate", () => {
  // ── basic variable replacement ──
  it("replaces a simple variable", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "World" })).toBe(
      "Hello World!",
    );
  });

  it("escapes HTML in variables", () => {
    expect(renderTemplate("{{x}}", { x: "<b>hi</b>" })).toBe(
      "&lt;b&gt;hi&lt;/b&gt;",
    );
  });

  it("replaces multiple variables", () => {
    expect(renderTemplate("{{a}} and {{b}}", { a: "1", b: "2" })).toBe(
      "1 and 2",
    );
  });

  it("stringifies numbers", () => {
    expect(renderTemplate("count: {{n}}", { n: 42 })).toBe("count: 42");
  });

  it("stringifies booleans", () => {
    expect(renderTemplate("{{flag}}", { flag: true })).toBe("true");
  });

  // ── raw output ──
  it("outputs raw HTML with triple braces", () => {
    expect(renderTemplate("{{{html}}}", { html: "<b>bold</b>" })).toBe(
      "<b>bold</b>",
    );
  });

  // ── fallback ──
  it("uses fallback when variable is missing", () => {
    expect(renderTemplate('{{name | fallback "anon"}}', {})).toBe("anon");
  });

  it("uses fallback when variable is empty string", () => {
    expect(renderTemplate('{{name | fallback "anon"}}', { name: "" })).toBe(
      "anon",
    );
  });

  it("does not use fallback when variable exists", () => {
    expect(
      renderTemplate('{{name | fallback "anon"}}', { name: "Rakan" }),
    ).toBe("Rakan");
  });

  // ── missing variable ──
  it("returns empty string for missing variable", () => {
    expect(renderTemplate("Hello {{missing}}!", {})).toBe("Hello !");
  });

  it("returns empty string for undefined variable", () => {
    expect(renderTemplate("{{x}}", { x: undefined })).toBe("");
  });

  it("returns empty string for null variable", () => {
    expect(renderTemplate("{{x}}", { x: null })).toBe("");
  });

  // ── if/else conditional ──
  it("renders if-body when truthy", () => {
    expect(renderTemplate("{{#if show}}YES{{/if}}", { show: true })).toBe(
      "YES",
    );
  });

  it("hides if-body when falsy", () => {
    expect(renderTemplate("{{#if show}}YES{{/if}}", { show: false })).toBe("");
  });

  it("renders else branch when falsy", () => {
    expect(
      renderTemplate("{{#if show}}YES{{else}}NO{{/if}}", { show: false }),
    ).toBe("NO");
  });

  it("treats empty string as falsy in if", () => {
    expect(renderTemplate("{{#if val}}YES{{else}}NO{{/if}}", { val: "" })).toBe(
      "NO",
    );
  });

  it("treats 0 as falsy in if", () => {
    expect(renderTemplate("{{#if val}}YES{{else}}NO{{/if}}", { val: 0 })).toBe(
      "NO",
    );
  });

  it("treats non-empty array as truthy in if (length check)", () => {
    expect(renderTemplate("{{#if items}}HAS{{/if}}", { items: [1, 2] })).toBe(
      "HAS",
    );
  });

  it("treats empty array as falsy in if (length check)", () => {
    expect(
      renderTemplate("{{#if items}}HAS{{else}}EMPTY{{/if}}", { items: [] }),
    ).toBe("EMPTY");
  });

  // ── unless ──
  it("renders unless-body when falsy", () => {
    expect(
      renderTemplate("{{#unless hidden}}VISIBLE{{/unless}}", { hidden: false }),
    ).toBe("VISIBLE");
  });

  it("hides unless-body when truthy", () => {
    expect(
      renderTemplate("{{#unless hidden}}VISIBLE{{/unless}}", { hidden: true }),
    ).toBe("");
  });

  // ── each ──
  it("iterates over an array with this and @index", () => {
    expect(
      renderTemplate("{{#each items}}{{this}}:{{@index}} {{/each}}", {
        items: ["a", "b", "c"],
      }),
    ).toBe("a:0 b:1 c:2 ");
  });

  it("provides @index1 (1-based index)", () => {
    expect(
      renderTemplate("{{#each items}}{{@index1}}.{{this}} {{/each}}", {
        items: ["x", "y"],
      }),
    ).toBe("1.x 2.y ");
  });

  it("provides @key for object iteration", () => {
    expect(
      renderTemplate("{{#each obj}}{{@key}}={{this}} {{/each}}", {
        obj: { a: 1, b: 2 },
      }),
    ).toBe("a=1 b=2 ");
  });

  it("does nothing for each on undefined", () => {
    expect(renderTemplate("{{#each missing}}x{{/each}}", {})).toBe("");
  });

  // ── nested if inside each ──
  it("handles nested if inside each", () => {
    const tpl = "{{#each items}}{{#if this}}YES{{else}}NO{{/if}} {{/each}}";
    expect(renderTemplate(tpl, { items: [true, false, true] })).toBe(
      "YES NO YES ",
    );
  });

  // ── nested conditionals ──
  it("handles nested if blocks", () => {
    const tpl = "{{#if a}}{{#if b}}BOTH{{/if}}{{/if}}";
    expect(renderTemplate(tpl, { a: true, b: true })).toBe("BOTH");
    expect(renderTemplate(tpl, { a: true, b: false })).toBe("");
    expect(renderTemplate(tpl, { a: false, b: true })).toBe("");
  });

  // ── edge cases ──
  it("returns empty string for empty template", () => {
    expect(renderTemplate("", {})).toBe("");
  });

  it("returns template unchanged when no vars used", () => {
    expect(renderTemplate("plain text", {})).toBe("plain text");
  });

  it("handles template with no matching vars", () => {
    expect(renderTemplate("{{a}}{{b}}", {})).toBe("");
  });
});
