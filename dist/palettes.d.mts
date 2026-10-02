//#region src/palettes.d.ts
/** A named run of colours, in order. */
type Palette = {
  name: string;
  colors: string[];
};
declare const japaneseGradients: Palette[];
declare const japaneseColors: Palette[];
declare const wadaCombinations: Palette[];
declare const uiGradients: Palette[];
/** The CSS the picker writes when one of these is picked, so a value set from code looks picked by hand. */
declare const paletteGradient: (colors: readonly string[]) => string;
/** The colours of a color control's value in order: a gradient's stops, or the one solid colour. Hex, no alpha. */
declare function paletteColors(value: string): string[];
//#endregion
export { Palette, japaneseColors, japaneseGradients, paletteColors, paletteGradient, uiGradients, wadaCombinations };