import { t as CURATED } from "./curated-3iZeuxmB.mjs";
import { a as WAIRO, d as gradientCss, f as gradientFromHexes, g as parseSolid, h as parseGradient, i as WAGRAD, n as UIGRADIENTS, t as WADA, y as toHex } from "./wada-CTQaV08E.mjs";
//#region src/palettes.ts
const japaneseGradients = WAGRAD.map(([name, kanji, colors]) => ({
	name: `${name} ${kanji}`,
	colors
}));
const japaneseColors = WAIRO.map(([name, kanji, hex]) => ({
	name: `${name} ${kanji}`,
	colors: [hex]
}));
const wadaCombinations = WADA.k.map((indexes, n) => ({
	name: `Wada ${n + 1}`,
	colors: indexes.map((i) => WADA.c[i][1])
}));
const uiGradients = UIGRADIENTS.map(([name, colors]) => ({
	name,
	colors
}));
/** Every collection the Library offers, in the order it shows them. */
const collections = [
	{
		id: "japanese-gradients",
		title: "Japanese gradients",
		credit: "tunekit",
		source: "https://github.com/fabiogaliano/tunekit",
		palettes: japaneseGradients
	},
	{
		id: "japanese-colors",
		title: "Traditional Japanese colors",
		credit: "nippon-iro",
		source: "https://nipponcolors.com",
		palettes: japaneseColors
	},
	{
		id: "wada",
		title: "Wada combinations",
		credit: "Sanzo Wada, digitized by Matt DesLauriers",
		source: "https://github.com/mattdesl/dictionary-of-colour-combinations",
		palettes: wadaCombinations
	},
	{
		id: "uigradients",
		title: "uiGradients",
		credit: "Indrashish Ghosh",
		source: "https://github.com/ghosh/uiGradients",
		palettes: uiGradients
	},
	...CURATED.map((c) => ({
		...c,
		palettes: c.palettes.map(([name, colors]) => ({
			name,
			colors
		}))
	}))
];
/** The CSS the picker writes when one of these is picked, so a value set from code looks picked by hand. */
const paletteGradient = (colors) => colors.length === 1 ? colors[0] : gradientCss(gradientFromHexes(colors));
/** The colours of a color control's value in order: a gradient's stops, or the one solid colour. Hex, no alpha. */
function paletteColors(value) {
	const g = parseGradient(value);
	if (g) return [...g.stops].sort((a, b) => a.pos - b.pos).map((s) => toHex(s.color, false));
	const solid = parseSolid(value);
	return solid ? [toHex(solid, false)] : [];
}
//#endregion
export { collections, japaneseColors, japaneseGradients, paletteColors, paletteGradient, uiGradients, wadaCombinations };
