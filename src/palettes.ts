// The colour libraries behind the picker's Library tab, for code that picks from them itself (a "random palette"
// button, say) and for reading back what the picker wrote.
import { gradientCss, gradientFromHexes, parseGradient, parseSolid, toHex } from "./color/model.ts";
import { WAGRAD, WAIRO } from "./color/data/japanese.ts";
import { UIGRADIENTS } from "./color/data/uigradients.ts";
import { WADA } from "./color/data/wada.ts";

/** A named run of colours, in order. */
export type Palette = { name: string; colors: string[] };

export const japaneseGradients: Palette[] = WAGRAD.map(([name, kanji, colors]) => ({ name: `${name} ${kanji}`, colors }));
export const japaneseColors: Palette[] = WAIRO.map(([name, kanji, hex]) => ({ name: `${name} ${kanji}`, colors: [hex] }));
export const wadaCombinations: Palette[] = WADA.k.map((indexes, n) => ({ name: `Wada ${n + 1}`, colors: indexes.map((i) => WADA.c[i]![1]) }));
export const uiGradients: Palette[] = UIGRADIENTS.map(([name, colors]) => ({ name, colors }));

/** The CSS the picker writes when one of these is picked, so a value set from code looks picked by hand. */
export const paletteGradient = (colors: readonly string[]): string =>
  colors.length === 1 ? colors[0]! : gradientCss(gradientFromHexes(colors));

/** The colours of a color control's value in order: a gradient's stops, or the one solid colour. Hex, no alpha. */
export function paletteColors(value: string): string[] {
  const g = parseGradient(value);
  if (g) return [...g.stops].sort((a, b) => a.pos - b.pos).map((s) => toHex(s.color, false));
  const solid = parseSolid(value);
  return solid ? [toHex(solid, false)] : [];
}
