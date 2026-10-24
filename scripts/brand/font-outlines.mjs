import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const number = (value) => Number(value.toFixed(6));

// Build-time reader for the pinned local TrueType WOFF fonts, never user uploads.
export async function outlineFont(file) {
  const source = await readFile(file);
  if (source.toString("ascii", 0, 4) !== "wOFF")
    throw new Error(`Expected a TrueType WOFF font: ${file}`);
  const tables = new Map();
  for (let i = 0; i < source.readUInt16BE(12); i++) {
    const position = 44 + i * 20;
    const tag = source.toString("ascii", position, position + 4);
    const offset = source.readUInt32BE(position + 4);
    const length = source.readUInt32BE(position + 8);
    const originalLength = source.readUInt32BE(position + 12);
    const data = source.subarray(offset, offset + length);
    const table = length < originalLength ? inflateSync(data) : data;
    if (table.length !== originalLength)
      throw new Error(`Invalid font table: ${tag}`);
    tables.set(tag, table);
  }
  for (const tag of ["head", "hhea", "hmtx", "loca", "glyf", "cmap"])
    if (!tables.has(tag)) throw new Error(`Missing font table: ${tag}`);
  const head = tables.get("head");
  const units = head.readUInt16BE(18);
  const longLocations = head.readInt16BE(50) === 1;
  const hhea = tables.get("hhea");
  const metricsCount = hhea.readUInt16BE(34);
  const cmap = tables.get("cmap");
  const mappings = [];
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const offset = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(offset);
    if (format === 4 || format === 12) mappings.push({ offset, format });
  }
  mappings.sort((a, b) => b.format - a.format);
  if (!mappings.length) throw new Error("Unsupported font character mapping");
  const mapping = mappings[0];
  function glyphIndex(character) {
    const code = character.codePointAt(0);
    const base = mapping.offset;
    if (mapping.format === 12) {
      const count = cmap.readUInt32BE(base + 12);
      for (let i = 0; i < count; i++) {
        const start = base + 16 + i * 12;
        const first = cmap.readUInt32BE(start);
        const last = cmap.readUInt32BE(start + 4);
        if (code >= first && code <= last)
          return cmap.readUInt32BE(start + 8) + code - first;
      }
    } else {
      const count = cmap.readUInt16BE(base + 6) / 2;
      for (let i = 0; i < count; i++) {
        const end = cmap.readUInt16BE(base + 14 + i * 2);
        const start = cmap.readUInt16BE(base + 16 + count * 2 + i * 2);
        if (code < start || code > end) continue;
        const delta = cmap.readInt16BE(base + 16 + count * 4 + i * 2);
        const rangeAt = base + 16 + count * 6 + i * 2;
        const range = cmap.readUInt16BE(rangeAt);
        if (!range) return (code + delta) & 0xffff;
        const index = cmap.readUInt16BE(rangeAt + range + (code - start) * 2);
        return index ? (index + delta) & 0xffff : 0;
      }
    }
    throw new Error(`Font has no glyph for ${JSON.stringify(character)}`);
  }
  const cache = new Map();
  function glyph(index, depth = 0) {
    if (cache.has(index)) return cache.get(index);
    if (depth > 8) throw new Error("Unexpected recursive font glyph");
    const locations = tables.get("loca");
    const location = (id) =>
      longLocations
        ? locations.readUInt32BE(id * 4)
        : locations.readUInt16BE(id * 2) * 2;
    const offset = location(index);
    if (offset === location(index + 1)) return "";
    const data = tables.get("glyf").subarray(offset, location(index + 1));
    const count = data.readInt16BE(0);
    let result = "";
    if (count >= 0) {
      const ends = Array.from({ length: count }, (_, i) =>
        data.readUInt16BE(10 + i * 2),
      );
      if (!ends.length) return "";
      let position = 10 + count * 2;
      const instructions = data.readUInt16BE(position);
      position += 2 + instructions;
      const pointCount = ends.at(-1) + 1;
      const flags = [];
      while (flags.length < pointCount) {
        const flag = data[position++];
        flags.push(flag);
        if (flag & 8) {
          const repeats = data[position++];
          for (let i = 0; i < repeats; i++) flags.push(flag);
        }
      }
      const coordinates = (shortBit, positiveBit) => {
        let coordinate = 0;
        return flags.map((flag) => {
          if (flag & shortBit) {
            const distance = data[position++];
            coordinate += flag & positiveBit ? distance : -distance;
          } else if (!(flag & positiveBit)) {
            coordinate += data.readInt16BE(position);
            position += 2;
          }
          return coordinate;
        });
      };
      const xs = coordinates(2, 16);
      const ys = coordinates(4, 32);
      let first = 0;
      let outline = "";
      for (const end of ends) {
        const points = flags.slice(first, end + 1).map((flag, i) => ({
          x: xs[first + i],
          y: ys[first + i],
          on: Boolean(flag & 1),
        }));
        const last = points.at(-1);
        const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const start = points[0].on
          ? points.shift()
          : last.on
            ? points.pop()
            : midpoint(last, points[0]);
        let path = `M${start.x} ${start.y}`;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          if (point.on) path += `L${point.x} ${point.y}`;
          else {
            const next = points[i + 1] ?? { ...start, on: true };
            const target = next.on ? next : midpoint(point, next);
            path += `Q${point.x} ${point.y} ${target.x} ${target.y}`;
            if (next.on) i++;
          }
        }
        outline += `${path}Z`;
        first = end + 1;
      }
      result = `<path d="${outline}"/>`;
    } else {
      let position = 10;
      let flags;
      do {
        flags = data.readUInt16BE(position);
        const child = data.readUInt16BE(position + 2);
        position += 4;
        if (!(flags & 2)) throw new Error("Unsupported point-matched glyph");
        const wide = Boolean(flags & 1);
        const x = wide ? data.readInt16BE(position) : data.readInt8(position);
        const y = wide
          ? data.readInt16BE(position + 2)
          : data.readInt8(position + 1);
        position += wide ? 4 : 2;
        let a = 1,
          b = 0,
          c = 0,
          d = 1;
        const fixed = () => {
          const value = data.readInt16BE(position) / 16384;
          position += 2;
          return value;
        };
        if (flags & 8) a = d = fixed();
        else if (flags & 64) {
          a = fixed();
          d = fixed();
        } else if (flags & 128) {
          a = fixed();
          c = fixed();
          b = fixed();
          d = fixed();
        }
        result += `<g transform="matrix(${a} ${b} ${c} ${d} ${x} ${y})">${glyph(child, depth + 1)}</g>`;
      } while (flags & 32);
    }
    cache.set(index, result);
    return result;
  }
  function text(
    value,
    size,
    { x = 0, y = 0, fill = "#202b27", tracking = 0 } = {},
  ) {
    let cursor = x;
    const scale = size / units;
    let body = "";
    for (const character of value) {
      const index = glyphIndex(character);
      body += `<g transform="translate(${number(cursor)} ${number(y)}) scale(${number(scale)} ${number(-scale)})">${glyph(index)}</g>`;
      const metric = Math.min(index, metricsCount - 1);
      cursor += tables.get("hmtx").readUInt16BE(metric * 4) * scale + tracking;
    }
    return {
      body: `<g fill="${fill}">${body}</g>`,
      width: cursor - x - (value.length ? tracking : 0),
    };
  }
  return { text, units };
}
