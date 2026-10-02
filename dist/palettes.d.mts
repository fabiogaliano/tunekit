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
/** One of the Library's collections, with who made it and where it comes from. */
type Collection = {
  id: string;
  title: string;
  credit: string;
  source: string;
  palettes: Palette[];
};
/** Every collection the Library offers, in the order it shows them. */
declare const collections: Collection[];
/** The CSS the picker writes when one of these is picked, so a value set from code looks picked by hand. */
declare const paletteGradient: (colors: readonly string[]) => string;
/** The colours of a color control's value in order: a gradient's stops, or the one solid colour. Hex, no alpha. */
declare function paletteColors(value: string): string[];
//#endregion
export { Collection, Palette, collections, japaneseColors, japaneseGradients, paletteColors, paletteGradient, uiGradients, wadaCombinations };