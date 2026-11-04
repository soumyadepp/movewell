/**
 * Lays out text in EMS Allure, a single-line script font, as pencil strokes.
 * Each stroke carries its length and how far the pencil has travelled before
 * it, so the whole word can be drawn at one steady speed like handwriting.
 */
import allure from "./fonts/ems-allure.json";

export interface HandFont {
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly glyphs: Readonly<
    Record<string, { adv: number; len: number; lines: number[][][] }>
  >;
}

export interface Stroke {
  readonly d: string;
  /** Length of this stroke in font units. */
  readonly length: number;
  /** Pencil travel before this stroke starts, in font units. */
  readonly start: number;
}

export interface Writing {
  /** Every pen stroke of every letter, in writing order. */
  readonly strokes: readonly Stroke[];
  /** Total pencil travel in font units, excluding pen lifts. */
  readonly length: number;
  readonly viewBox: string;
  /** Width divided by height, so the SVG can be sized in em. */
  readonly aspect: number;
  /** Height of the box in em, from ascender to descender. */
  readonly heightEm: number;
  /** Depth below the baseline in em, used to sit the SVG on the text baseline. */
  readonly descentEm: number;
}

export const ALLURE: HandFont = allure;

/** Side padding in font units, so loops that swing past the advance width are not cut off. */
const PAD = 120;

const polylineLength = (line: number[][]): number =>
  line
    .slice(1)
    .reduce(
      (sum, [px, py], k) => sum + Math.hypot(px - line[k][0], py - line[k][1]),
      0,
    );

/**
 * Writes text as pencil strokes.
 *
 * Args:
 *   text: The text to write.
 *   font: The single-line font to write it in.
 *
 * Returns:
 *   The strokes and their box, or null when the font lacks a character (for
 *   example Devanagari), so the caller can fall back to plain text.
 */
export function write(text: string, font: HandFont = ALLURE): Writing | null {
  const strokes: Stroke[] = [];
  let x = PAD;
  let length = 0;
  for (const char of text) {
    const glyph = font.glyphs[char];
    if (!glyph) return null;
    for (const line of glyph.lines) {
      const d = line
        .map(([px, py], k) => `${k ? "L" : "M"}${px + x} ${py + font.ascent}`)
        .join("");
      const strokeLength = polylineLength(line);
      strokes.push({ d, length: strokeLength, start: length });
      length += strokeLength;
    }
    x += glyph.adv;
  }
  const width = x + PAD;
  const height = font.ascent + font.descent;
  return {
    strokes,
    length,
    viewBox: `0 0 ${width} ${height}`,
    aspect: width / height,
    heightEm: height / font.unitsPerEm,
    descentEm: font.descent / font.unitsPerEm,
  };
}
