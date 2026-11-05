/**
 * Converts the EMS Allure single-line script font into compact polylines for
 * the pencil-writing animation.
 *
 * Run with `npm run handwriting:generate`. Reads the SVG font shipped in the
 * hersheytext package and writes src/lib/fonts/ems-allure.json. Coordinates
 * are flipped so y grows downwards from the baseline, curves are flattened to
 * short segments, and each glyph stores its stroke length so the pencil can
 * move at a constant speed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Point = [number, number];

const CURVE_STEPS = 8;
const PRINTABLE = /^[\x20-\x7e]$/;

const root = join(import.meta.dirname, "..");
const source = readFileSync(join(root, "node_modules/hersheytext/svg_fonts/EMSAllure.svg"), "utf8");

const attr = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

const decode = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Splits path data into polylines, flattening cubic curves. */
function strokes(d: string): Point[][] {
  const tokens = d.match(/[MLC]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const lines: Point[][] = [];
  let current: Point[] = [];
  let command = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const flip = (x: number, y: number): Point => [Math.round(x), Math.round(-y)];
  while (i < tokens.length) {
    if (/[MLC]/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === "M") {
      if (current.length > 1) lines.push(current);
      current = [flip(num(), num())];
      command = "L";
    } else if (command === "L") {
      current.push(flip(num(), num()));
    } else if (command === "C") {
      const [x0, y0] = current[current.length - 1];
      const c1 = flip(num(), num());
      const c2 = flip(num(), num());
      const end = flip(num(), num());
      for (let s = 1; s <= CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS;
        const u = 1 - t;
        current.push([
          Math.round(u ** 3 * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * end[0]),
          Math.round(u ** 3 * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * end[1]),
        ]);
      }
    } else {
      i++;
    }
  }
  if (current.length > 1) lines.push(current);
  return lines;
}

const length = (lines: Point[][]): number =>
  Math.round(
    lines.reduce(
      (sum, line) => sum + line.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - line[k][0], p[1] - line[k][1]), 0),
      0,
    ),
  );

const fontTag = /<font\s[^>]*>/.exec(source)?.[0] ?? "";
const faceTag = /<font-face[\s\S]*?\/>/.exec(source)?.[0] ?? "";
const defaultAdvance = Number(attr(fontTag, "horiz-adv-x"));
const glyphs: Record<string, { adv: number; len: number; lines: Point[][] }> = {};
for (const match of source.matchAll(/<glyph\s[^>]*>/g)) {
  const raw = attr(match[0], "unicode");
  if (raw === null) continue;
  const char = decode(raw);
  if (!PRINTABLE.test(char)) continue;
  const lines = strokes(attr(match[0], "d") ?? "");
  glyphs[char] = {
    adv: Number(attr(match[0], "horiz-adv-x") ?? defaultAdvance),
    len: length(lines),
    lines,
  };
}

const font = {
  name: "EMS Allure",
  license:
    "SIL Open Font License 1.1. EMS Allure by Sheldon B. Michaels, derived from Allura by Rob Leuschke (TypeSETit).",
  unitsPerEm: Number(attr(faceTag, "units-per-em")),
  ascent: Number(attr(faceTag, "ascent")),
  descent: -Number(attr(faceTag, "descent")),
  glyphs,
};
writeFileSync(join(root, "src/lib/fonts/ems-allure.json"), JSON.stringify(font));
console.log(`Wrote ${Object.keys(glyphs).length} glyphs`);
