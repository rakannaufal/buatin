/**
 * Lightweight Handlebars-like template engine — zero external dependencies.
 *
 * Supported syntax:
 *   {{var}}                         – escaped variable
 *   {{{var}}}                       – raw (unescaped) variable
 *   {{var | fallback "default"}}    – fallback when var is nullish/empty
 *   {{#if cond}}...{{else}}...{{/if}}
 *   {{#unless cond}}...{{/unless}}
 *   {{#each arr}}{{this}} {{@index}} {{@index1}} {{@key}}{{/each}}
 *
 * Nested blocks are fully supported.
 */

// ─── helpers ────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

// ─── token types ────────────────────────────────────────────────────────

type Token =
  | { type: "text"; value: string }
  | { type: "var"; key: string; raw: boolean; fallback: string | null }
  | {
      type: "block";
      kind: "if" | "unless" | "each";
      key: string;
      body: Token[];
      elseBody: Token[];
    };

// ─── tokeniser ──────────────────────────────────────────────────────────

function tokenise(template: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < template.length) {
    // look for next opening tag
    const rawOpen = template.indexOf("{{{", pos);
    const dblOpen = template.indexOf("{{", pos);

    // no more tags → rest is text
    if (dblOpen === -1) {
      tokens.push({ type: "text", value: template.slice(pos) });
      break;
    }

    // raw triple-brace must start at same position as double to take priority
    const isRaw = rawOpen === dblOpen;

    const openLen = isRaw ? 3 : 2;
    const closeTag = isRaw ? "}}}" : "}}";
    const closeLen = isRaw ? 3 : 2;

    // text before tag
    if (dblOpen > pos) {
      tokens.push({ type: "text", value: template.slice(pos, dblOpen) });
    }

    const closeIdx = template.indexOf(closeTag, dblOpen + openLen);
    if (closeIdx === -1) {
      // unclosed tag → treat rest as text
      tokens.push({ type: "text", value: template.slice(dblOpen) });
      break;
    }

    const inner = template.slice(dblOpen + openLen, closeIdx).trim();
    pos = closeIdx + closeLen;

    // ── block open: #if / #unless / #each
    if (inner.startsWith("#")) {
      const spaceIdx = inner.indexOf(" ");
      const keyword =
        spaceIdx === -1 ? inner.slice(1) : inner.slice(1, spaceIdx);
      const key = spaceIdx === -1 ? "" : inner.slice(spaceIdx + 1).trim();

      if (keyword === "if" || keyword === "unless" || keyword === "each") {
        const { body, elseBody, end } = parseBlock(template, pos, keyword);
        tokens.push({ type: "block", kind: keyword, key, body, elseBody });
        pos = end;
      }
      continue;
    }

    // ── variable (possibly with fallback)
    const fallbackMatch = inner.match(/^(.+?)\s*\|\s*fallback\s+"([^"]*)"\s*$/);
    if (fallbackMatch) {
      tokens.push({
        type: "var",
        key: fallbackMatch[1].trim(),
        raw: isRaw,
        fallback: fallbackMatch[2],
      });
    } else {
      tokens.push({ type: "var", key: inner, raw: isRaw, fallback: null });
    }
  }

  return tokens;
}

/**
 * Parse until we hit {{/keyword}}, collecting body and optional {{else}} branch.
 * Handles nesting of the same keyword.
 */
function parseBlock(
  template: string,
  startPos: number,
  keyword: string,
): { body: Token[]; elseBody: Token[]; end: number } {
  let depth = 1;
  let innerDepth = 0; // tracks nested blocks of OTHER types
  let pos = startPos;
  let elsePos: number | null = null;

  while (pos < template.length && depth > 0) {
    const next = template.indexOf("{{", pos);
    if (next === -1) break;

    // determine inner of this tag
    const isTriple = template.startsWith("{{{", next);
    const openLen = isTriple ? 3 : 2;
    const closeTag = isTriple ? "}}}" : "}}";
    const closeIdx = template.indexOf(closeTag, next + openLen);
    if (closeIdx === -1) break;

    const inner = template.slice(next + openLen, closeIdx).trim();
    const tagEnd = closeIdx + (isTriple ? 3 : 2);

    if (inner === `/${keyword}` && innerDepth === 0) {
      depth--;
      if (depth === 0) {
        const bodyStr =
          elsePos === null
            ? template.slice(startPos, next)
            : template.slice(startPos, elsePos);
        const elseStr = elsePos === null ? "" : template.slice(elsePos, next);
        return {
          body: tokenise(bodyStr),
          elseBody: tokenise(elseStr),
          end: tagEnd,
        };
      }
    } else if (inner.startsWith(`#${keyword}`)) {
      depth++;
    } else if (
      inner.startsWith("#if") ||
      inner.startsWith("#unless") ||
      inner.startsWith("#each")
    ) {
      // opening of a different block type
      innerDepth++;
    } else if (inner.startsWith("/") && innerDepth > 0) {
      // closing of a nested different block type
      innerDepth--;
    } else if (inner === "else" && depth === 1 && innerDepth === 0) {
      elsePos = tagEnd;
    }

    pos = tagEnd;
  }

  // unclosed block → treat remaining as body
  return {
    body: tokenise(template.slice(startPos)),
    elseBody: [],
    end: template.length,
  };
}

// ─── resolver ───────────────────────────────────────────────────────────

function resolve(key: string, vars: Record<string, unknown>): unknown {
  if (key === "this") return vars["this"];
  if (key === "@index") return vars["@index"];
  if (key === "@index1") return vars["@index1"];
  if (key === "@key") return vars["@key"];

  // dot-path resolution
  const parts = key.split(".");
  let current: unknown = vars;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isTruthy(value: unknown): boolean {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === 0 ||
    value === ""
  ) {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return String(value);
}

// ─── renderer ───────────────────────────────────────────────────────────

function renderTokens(tokens: Token[], vars: Record<string, unknown>): string {
  let out = "";

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        out += token.value;
        break;

      case "var": {
        const resolved = resolve(token.key, vars);
        let str = stringify(resolved);
        if (str === "" && token.fallback !== null) {
          str = token.fallback;
        }
        out += token.raw ? str : escapeHtml(str);
        break;
      }

      case "block": {
        if (token.kind === "if") {
          const cond = resolve(token.key, vars);
          out += isTruthy(cond)
            ? renderTokens(token.body, vars)
            : renderTokens(token.elseBody, vars);
        } else if (token.kind === "unless") {
          const cond = resolve(token.key, vars);
          out += !isTruthy(cond)
            ? renderTokens(token.body, vars)
            : renderTokens(token.elseBody, vars);
        } else if (token.kind === "each") {
          const list = resolve(token.key, vars);
          if (Array.isArray(list)) {
            for (let i = 0; i < list.length; i++) {
              const itemVars: Record<string, unknown> = {
                ...vars,
                this: list[i],
                "@index": i,
                "@index1": i + 1,
                "@key": i,
              };
              out += renderTokens(token.body, itemVars);
            }
          } else if (
            list !== null &&
            list !== undefined &&
            typeof list === "object"
          ) {
            const entries = Object.entries(list as Record<string, unknown>);
            for (let i = 0; i < entries.length; i++) {
              const [key, value] = entries[i];
              const itemVars: Record<string, unknown> = {
                ...vars,
                this: value,
                "@index": i,
                "@index1": i + 1,
                "@key": key,
              };
              out += renderTokens(token.body, itemVars);
            }
          }
        }
        break;
      }
    }
  }

  return out;
}

// ─── public API ─────────────────────────────────────────────────────────

export function renderTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  const tokens = tokenise(template);
  return renderTokens(tokens, vars);
}
