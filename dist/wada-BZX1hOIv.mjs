//#region src/vendor/dialkit/color.ts
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const wrapHue = (h) => (h % 360 + 360) % 360;
const multiply = (m, v) => m.map((row) => row.reduce((n, x, i) => n + x * v[i], 0));
const linearize = (v) => Math.abs(v) <= .04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + .055) / 1.055) ** 2.4;
const encode = (v) => Math.abs(v) <= .0031308 ? 12.92 * v : Math.sign(v) * (1.055 * Math.abs(v) ** (1 / 2.4) - .055);
const RGB_XYZ = [
	[
		.4123907993,
		.3575843394,
		.1804807884
	],
	[
		.2126390059,
		.7151686788,
		.0721923154
	],
	[
		.0193308187,
		.1191947798,
		.9505321522
	]
];
const P3_XYZ = [
	[
		.4865709486,
		.2656676932,
		.1982172852
	],
	[
		.2289745641,
		.6917385218,
		.0792869141
	],
	[
		0,
		.0451133819,
		1.0439443689
	]
];
const XYZ_RGB = [
	[
		3.2409699419,
		-1.5373831776,
		-.4986107603
	],
	[
		-.9692436363,
		1.8759675015,
		.0415550574
	],
	[
		.0556300797,
		-.2039769589,
		1.0569715142
	]
];
const XYZ_P3 = [
	[
		2.4934969119,
		-.9313836179,
		-.4027107845
	],
	[
		-.8294889696,
		1.7626640603,
		.0236246858
	],
	[
		.0358458302,
		-.0761723893,
		.956884524
	]
];
function rgbToColor(rgb, a = 1, space = "srgb") {
	const [l, m, s] = multiply([
		[
			.819022438,
			.3619062601,
			-.1288737815
		],
		[
			.0329836539,
			.9292868616,
			.0361446664
		],
		[
			.0481771894,
			.2642395318,
			.6335478285
		]
	], multiply(space === "p3" ? P3_XYZ : RGB_XYZ, rgb.map(linearize))).map(Math.cbrt);
	const L = .2104542553 * l + .793617785 * m - .0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
	const B = .0259040371 * l + .7827717662 * m - .808675766 * s;
	const c = Math.hypot(A, B);
	return {
		l: clamp(L),
		c: c < 1e-7 ? 0 : c,
		h: c < 1e-7 ? 0 : wrapHue(Math.atan2(B, A) * 180 / Math.PI),
		a: clamp(a)
	};
}
function colorToRgb(color, space = "srgb") {
	const a = color.c * Math.cos(color.h * Math.PI / 180);
	const b = color.c * Math.sin(color.h * Math.PI / 180);
	const xyz = multiply([
		[
			1.2268798734,
			-.5578149966,
			.2813910502
		],
		[
			-.0405757626,
			1.1122868294,
			-.0717110667
		],
		[
			-.0763729497,
			-.421493324,
			1.5869240244
		]
	], [
		(color.l + .3963377774 * a + .2158037573 * b) ** 3,
		(color.l - .1055613458 * a - .0638541728 * b) ** 3,
		(color.l - .0894841775 * a - 1.291485548 * b) ** 3
	]);
	return multiply(space === "p3" ? XYZ_P3 : XYZ_RGB, xyz).map(encode);
}
function inGamut(color, space = "srgb") {
	return colorToRgb(color, space).every((n) => n >= -1e-5 && n <= 1.00001);
}
/** Preserve lightness and hue when reducing chroma to an RGB gamut. */
function fitGamut(color, space = "srgb") {
	if (inGamut(color, space)) return color;
	let lo = 0;
	let hi = color.c;
	for (let i = 0; i < 20; i++) {
		const mid = (lo + hi) / 2;
		if (inGamut({
			...color,
			c: mid
		}, space)) lo = mid;
		else hi = mid;
	}
	return {
		...color,
		c: lo
	};
}
const round = (v, digits = 4) => Number(v.toFixed(digits));
function formatColor(color, format) {
	const alpha = color.a < 1 ? ` / ${round(color.a)}` : "";
	if (format === "oklch") return `oklch(${round(color.l)} ${round(color.c)} ${round(color.h, 2)}${alpha})`;
	const rgb = colorToRgb(fitGamut(color, format === "p3" ? "p3" : "srgb"), format === "p3" ? "p3" : "srgb");
	if (format === "p3") return `color(display-p3 ${rgb.map((n) => round(clamp(n), 5)).join(" ")}${alpha})`;
	const bytes = rgb.map((n) => Math.round(clamp(n) * 255));
	if (color.a < 1) bytes.push(Math.round(color.a * 255));
	return "#" + bytes.map((n) => n.toString(16).padStart(2, "0")).join("");
}
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|deg|grad|rad|turn)?$/i;
function number(value, percentScale = 1, hue = false) {
	const match = value.match(NUMBER);
	if (!match) return null;
	const n = parseFloat(value);
	if (!Number.isFinite(n)) return null;
	const unit = match[1]?.toLowerCase();
	if (hue) return unit === "rad" ? n * 180 / Math.PI : unit === "turn" ? n * 360 : unit === "grad" ? n * .9 : !unit || unit === "deg" ? n : null;
	return unit === "%" ? n * percentScale / 100 : !unit ? n : null;
}
/** Absolute hex, RGB, HSL, OKLCH and Display P3 colors; no browser/DOM dependency. */
function parseColor(value) {
	const text = value.trim().toLowerCase();
	if (text === "transparent") return {
		l: 0,
		c: 0,
		h: 0,
		a: 0
	};
	if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(text)) {
		let hex = text.slice(1);
		if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
		const bytes = hex.match(/../g).map((c) => parseInt(c, 16) / 255);
		return rgbToColor(bytes.slice(0, 3), bytes[3] ?? 1);
	}
	const match = text.match(/^(oklch|rgb|rgba|hsl|hsla|color)\(([^()]*)\)$/);
	if (!match) return null;
	const kind = match[1];
	let body = match[2].trim();
	const p3 = kind === "color";
	if (p3) {
		if (!body.startsWith("display-p3 ")) return null;
		body = body.slice(11).trim();
	}
	const legacy = body.includes(",");
	if (legacy && (p3 || kind === "oklch" || body.includes("/"))) return null;
	const parts = legacy ? body.split(",").map((x) => x.trim()) : body.split(/\s*\/\s*/);
	if (!legacy && parts.length > 2) return null;
	const channels = legacy ? parts.slice(0, 3) : parts[0].split(/\s+/);
	if (channels.length !== 3 || legacy && parts.length !== 3 && parts.length !== 4) return null;
	if (legacy && kind.startsWith("rgb") && channels.some((c) => c.endsWith("%")) && !channels.every((c) => c.endsWith("%"))) return null;
	const alphaText = legacy ? parts[3] : parts[1];
	const alpha = alphaText === void 0 ? 1 : number(alphaText);
	if (alpha === null) return null;
	if (kind === "oklch") {
		const l = number(channels[0]);
		const c = number(channels[1], .4);
		const h = number(channels[2], 1, true);
		return l === null || c === null || h === null ? null : {
			l: clamp(l),
			c: Math.max(0, c),
			h: wrapHue(h),
			a: clamp(alpha)
		};
	}
	if (kind.startsWith("hsl")) {
		const h = number(channels[0], 1, true);
		const s = number(channels[1]);
		const l = number(channels[2]);
		if (h === null || s === null || l === null || !channels[1].endsWith("%") || !channels[2].endsWith("%")) return null;
		const sat = clamp(s), light = clamp(l);
		const a = sat * Math.min(light, 1 - light);
		const f = (n) => {
			const k = (n + wrapHue(h) / 30) % 12;
			return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		};
		return rgbToColor([
			f(0),
			f(8),
			f(4)
		], alpha);
	}
	const values = channels.map((c) => number(c, p3 ? 1 : 255));
	if (values.some((n) => n === null)) return null;
	return rgbToColor(values.map((n) => p3 ? n : clamp(n / 255)), alpha, p3 ? "p3" : "srgb");
}
//#endregion
//#region src/color/model.ts
function hsvToRgb({ h, s, v }) {
	const f = (n) => {
		const k = (n + h / 60) % 6;
		return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
	};
	return [
		f(5),
		f(3),
		f(1)
	];
}
function rgbToHsv([r, g, b], a = 1, prevH = 0) {
	const max = Math.max(r, g, b);
	const d = max - Math.min(r, g, b);
	let h = prevH;
	if (d > 1e-6) {
		h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
		h = (h * 60 + 360) % 360;
	}
	return {
		h,
		s: max ? d / max : 0,
		v: max,
		a
	};
}
const byte = (n) => Math.round(clamp(n) * 255);
const hex2 = (n) => byte(n).toString(16).padStart(2, "0");
function toHex(c, withAlpha = true) {
	return "#" + hsvToRgb(c).map(hex2).join("") + (withAlpha && c.a < 1 ? hex2(c.a) : "");
}
function parseSolid(value, prevH) {
	const parsed = parseColor(value);
	if (!parsed) return null;
	return rgbToHsv(colorToRgb(fitGamut(parsed)).map((n) => clamp(n)), parsed.a, prevH);
}
function formatOf(value) {
	const v = value.trim().toLowerCase();
	return v.startsWith("oklch(") ? "oklch" : v.startsWith("rgb") ? "rgb" : "hex";
}
function formatSolid(c, format) {
	if (format === "hex") return toHex(c);
	const rgb = hsvToRgb(c);
	if (format === "oklch") return formatColor(rgbToColor(rgb, c.a), "oklch");
	const alpha = c.a < 1 ? ` / ${Number(c.a.toFixed(3))}` : "";
	return `rgb(${rgb.map(byte).join(" ")}${alpha})`;
}
function toOklch(c) {
	const o = rgbToColor(hsvToRgb(c));
	return [
		o.l,
		o.c,
		o.h
	];
}
/** Out-of-gamut input keeps lightness and hue and loses chroma, as designers expect. */
function fromOklch(l, ch, h, prev) {
	return rgbToHsv(colorToRgb(fitGamut({
		l,
		c: ch,
		h,
		a: 1
	})).map((n) => clamp(n)), prev.a, prev.h);
}
const luminance = (rgb) => {
	const [r, g, b] = rgb.map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
	return .2126 * r + .7152 * g + .0722 * b;
};
/** WCAG 2 contrast ratio, compositing a translucent foreground over the background first. */
function contrastRatio(fg, bg) {
	const b = hsvToRgb(bg);
	const [hi, lo] = [luminance(hsvToRgb(fg).map((c, i) => c * fg.a + b[i] * (1 - fg.a))), luminance(b)].sort((x, y) => y - x);
	return (hi + .05) / (lo + .05);
}
function contrastGrade(ratio) {
	return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail";
}
const isGradient = (value) => /^\s*(linear|radial|conic)-gradient\(/i.test(value);
function gradientCss(g, asBar = false) {
	const stops = [...g.stops].sort((a, b) => a.pos - b.pos).map((s) => `${toHex(s.color)} ${Math.round(s.pos * 1e3) / 10}%`).join(", ");
	const interp = g.interp === "srgb" ? "" : ` in ${g.interp}`;
	const angle = Math.round(g.angle);
	if (asBar) return `linear-gradient(90deg${interp}, ${stops})`;
	if (g.type === "radial") return `radial-gradient(circle${interp}, ${stops})`;
	if (g.type === "conic") return `conic-gradient(from ${angle}deg${interp}, ${stops})`;
	return `linear-gradient(${angle}deg${interp}, ${stops})`;
}
const SIDES = {
	top: 0,
	right: 90,
	bottom: 180,
	left: 270
};
/** Split on commas that aren't inside parentheses (stop colors like `rgb(1, 2, 3)`). */
function splitTop(body) {
	const out = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if (ch === "," && depth === 0) {
			out.push(body.slice(start, i).trim());
			start = i + 1;
		}
	}
	out.push(body.slice(start).trim());
	return out;
}
/** Reads the gradients this picker writes, plus common hand-written ones. */
function parseGradient(value) {
	const m = value.trim().match(/^(linear|radial|conic)-gradient\(([\s\S]*)\)$/i);
	if (!m) return null;
	const type = m[1].toLowerCase();
	const parts = splitTop(m[2]);
	const g = {
		type,
		angle: type === "linear" ? 180 : 0,
		interp: "srgb",
		stops: []
	};
	const stopOf = (part) => {
		const sm = part.match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/);
		const color = sm && parseSolid(sm[1]);
		return color ? {
			color,
			pos: sm[2] === void 0 ? null : clamp(parseFloat(sm[2]) / 100)
		} : null;
	};
	if (!stopOf(parts[0])) {
		const header = parts.shift().toLowerCase();
		const interp = header.match(/\bin\s+(srgb|oklab|oklch)\b/);
		if (interp) g.interp = interp[1];
		const deg = header.match(/(-?[\d.]+)deg/);
		if (deg) g.angle = (parseFloat(deg[1]) % 360 + 360) % 360;
		const side = header.match(/\bto\s+(top|right|bottom|left)\b/);
		if (side) g.angle = SIDES[side[1]];
	}
	const raw = parts.map(stopOf);
	if (raw.length < 2 || raw.some((s) => !s)) return null;
	g.stops = raw.map((s, i) => ({
		color: s.color,
		pos: s.pos ?? i / (raw.length - 1)
	}));
	return g;
}
function gradientFromHexes(hexes) {
	return {
		type: "linear",
		angle: 135,
		interp: "oklab",
		stops: hexes.map((h, i) => ({
			pos: i / Math.max(1, hexes.length - 1),
			color: parseSolid(h)
		}))
	};
}
/** Colour at `pos`, so a stop added mid-bar doesn't change how the gradient looks. */
function sampleGradient(g, pos) {
	const st = [...g.stops].sort((a, b) => a.pos - b.pos);
	if (pos <= st[0].pos) return { ...st[0].color };
	for (let i = 1; i < st.length; i++) {
		const a = st[i - 1];
		const b = st[i];
		if (pos <= b.pos) {
			const t = (pos - a.pos) / (b.pos - a.pos || 1);
			const A = hsvToRgb(a.color);
			const B = hsvToRgb(b.color);
			return rgbToHsv(A.map((c, k) => c + (B[k] - c) * t), a.color.a + (b.color.a - a.color.a) * t);
		}
	}
	return { ...st[st.length - 1].color };
}
//#endregion
//#region src/color/data/japanese.ts
const WAIRO = [
	[
		"Sakura",
		"桜",
		"#FEDFE1"
	],
	[
		"Momo",
		"桃",
		"#F596AA"
	],
	[
		"Kōbai",
		"紅梅",
		"#E16B8C"
	],
	[
		"Kurenai",
		"紅",
		"#CB1B45"
	],
	[
		"Akane",
		"茜",
		"#CB4042"
	],
	[
		"Benihi",
		"紅緋",
		"#F75C2F"
	],
	[
		"Sango",
		"珊瑚",
		"#F17C67"
	],
	[
		"Kaki",
		"柿",
		"#ED784A"
	],
	[
		"Kuchiba",
		"朽葉",
		"#E2943B"
	],
	[
		"Kohaku",
		"琥珀",
		"#CA7A2C"
	],
	[
		"Yamabuki",
		"山吹",
		"#FFB11B"
	],
	[
		"Kihada",
		"黄蘗",
		"#FBE251"
	],
	[
		"Uguisu",
		"鶯",
		"#6C6A2D"
	],
	[
		"Koke",
		"苔",
		"#838A2D"
	],
	[
		"Moegi",
		"萌黄",
		"#7BA23F"
	],
	[
		"Nae",
		"苗",
		"#86C166"
	],
	[
		"Wakatake",
		"若竹",
		"#5DAC81"
	],
	[
		"Tokiwa",
		"常磐",
		"#1B813E"
	],
	[
		"Rokushō",
		"緑青",
		"#24936E"
	],
	[
		"Mizu",
		"水",
		"#81C7D4"
	],
	[
		"Asagi",
		"浅葱",
		"#33A6B8"
	],
	[
		"Hanada",
		"縹",
		"#006284"
	],
	[
		"Ruri",
		"瑠璃",
		"#005CAF"
	],
	[
		"Ai",
		"藍",
		"#0D5661"
	],
	[
		"Kon",
		"紺",
		"#0F2540"
	],
	[
		"Benikake",
		"紅掛花",
		"#4E4F97"
	],
	[
		"Fuji",
		"藤",
		"#8B81C3"
	],
	[
		"Shion",
		"紫苑",
		"#8F77B5"
	],
	[
		"Murasaki",
		"紫",
		"#77428D"
	],
	[
		"Ebi",
		"葡萄",
		"#6D2E5B"
	],
	[
		"Sumi",
		"墨",
		"#1C1C1C"
	],
	[
		"Nezumi",
		"鼠",
		"#828282"
	],
	[
		"Rikyū",
		"利休鼠",
		"#707C74"
	],
	[
		"Ginnezu",
		"銀鼠",
		"#91989F"
	],
	[
		"Shironeri",
		"白練",
		"#FCFAF2"
	],
	[
		"Gofun",
		"胡粉",
		"#FFFFFB"
	],
	[
		"Kincha",
		"金茶",
		"#C7802D"
	],
	[
		"Kogane",
		"黄金",
		"#E9CD4C"
	],
	[
		"Tsuyukusa",
		"露草",
		"#2EA9DF"
	],
	[
		"Mizuasagi",
		"水浅葱",
		"#66BAB7"
	]
];
const WAGRAD = [
	[
		"Yozakura",
		"夜桜",
		[
			"#0F2540",
			"#8B81C3",
			"#FEDFE1"
		]
	],
	[
		"Asagiri",
		"朝霧",
		[
			"#FCFAF2",
			"#A5DEE4",
			"#66BAB7"
		]
	],
	[
		"Yūyake",
		"夕焼け",
		[
			"#4E4F97",
			"#F75C2F",
			"#FFB11B"
		]
	],
	[
		"Hinode",
		"日の出",
		[
			"#0F2540",
			"#CB1B45",
			"#FFB11B"
		]
	],
	[
		"Momiji",
		"紅葉",
		[
			"#6D2E5B",
			"#CB4042",
			"#E2943B"
		]
	],
	[
		"Wakaba",
		"若葉",
		[
			"#5DAC81",
			"#86C166",
			"#FBE251"
		]
	],
	[
		"Aizome",
		"藍染",
		[
			"#0F2540",
			"#0D5661",
			"#33A6B8"
		]
	],
	[
		"Fujinami",
		"藤波",
		[
			"#77428D",
			"#8B81C3",
			"#FEDFE1"
		]
	],
	[
		"Ume",
		"梅",
		["#E16B8C", "#FCFAF2"]
	],
	[
		"Tsuki",
		"月",
		[
			"#0F2540",
			"#4E4F97",
			"#E9CD4C"
		]
	],
	[
		"Hotaru",
		"蛍",
		[
			"#0B1013",
			"#1B813E",
			"#E9CD4C"
		]
	],
	[
		"Sumi-e",
		"墨絵",
		[
			"#1C1C1C",
			"#828282",
			"#FFFFFB"
		]
	],
	[
		"Kintsugi",
		"金継ぎ",
		[
			"#1C1C1C",
			"#C7802D",
			"#E9CD4C"
		]
	],
	[
		"Kohaku",
		"琥珀",
		["#CA7A2C", "#FFB11B"]
	],
	[
		"Shinkai",
		"深海",
		[
			"#08192D",
			"#005CAF",
			"#2EA9DF"
		]
	],
	[
		"Ajisai",
		"紫陽花",
		[
			"#4E4F97",
			"#8F77B5",
			"#F596AA"
		]
	],
	[
		"Matcha",
		"抹茶",
		[
			"#6C6A2D",
			"#838A2D",
			"#C5C56A"
		]
	],
	[
		"Sango",
		"珊瑚",
		["#F17C67", "#FEDFE1"]
	],
	[
		"Tokiwa",
		"常磐",
		[
			"#1B813E",
			"#24936E",
			"#66BAB7"
		]
	],
	[
		"Yuki",
		"雪",
		[
			"#FFFFFB",
			"#DAE3EA",
			"#91989F"
		]
	],
	[
		"Kitsune-bi",
		"狐火",
		[
			"#1C1C1C",
			"#F75C2F",
			"#FBE251"
		]
	],
	[
		"Rikyū",
		"利休",
		[
			"#707C74",
			"#91989F",
			"#FCFAF2"
		]
	],
	[
		"Hanabi",
		"花火",
		[
			"#0F2540",
			"#CB1B45",
			"#F596AA",
			"#FBE251"
		]
	],
	[
		"Ruri-iro",
		"瑠璃色",
		[
			"#0F2540",
			"#005CAF",
			"#81C7D4"
		]
	],
	[
		"Sakura-fubuki",
		"桜吹雪",
		[
			"#FFFFFB",
			"#FEDFE1",
			"#F596AA"
		]
	],
	[
		"Kōyō",
		"紅葉狩",
		[
			"#E2943B",
			"#CB4042",
			"#77428D"
		]
	],
	[
		"Natsuzora",
		"夏空",
		[
			"#2EA9DF",
			"#81C7D4",
			"#FFFFFB"
		]
	],
	[
		"Kurenai-zome",
		"紅染",
		[
			"#6D2E5B",
			"#CB1B45",
			"#F17C67"
		]
	]
];
const CLASSIC = [
	["Red", "#EF4444"],
	["Orange", "#F97316"],
	["Yellow", "#EAB308"],
	["Green", "#22C55E"],
	["Cyan", "#06B6D4"],
	["Blue", "#3B82F6"],
	["Violet", "#8B5CF6"],
	["Pink", "#EC4899"],
	["Rose", "#F43F5E"]
];
//#endregion
//#region src/color/data/uigradients.ts
const UIGRADIENTS = [
	["Omolon", [
		"#091E3A",
		"#2F80ED",
		"#2D9EE0"
	]],
	["Farhan", ["#9400D3", "#4B0082"]],
	["Purple", ["#c84e89", "#F15F79"]],
	["Ibtesam", ["#00F5A0", "#00D9F5"]],
	["Radioactive Heat", [
		"#F7941E",
		"#72C6EF",
		"#00A651"
	]],
	["The Sky And The Sea", ["#F7941E", "#004E8F"]],
	["From Ice To Fire", ["#72C6EF", "#004E8F"]],
	["Blue & Orange", ["#FD8112", "#0085CA"]],
	["Purple Dream", ["#bf5ae0", "#a811da"]],
	["Blu", ["#00416A", "#E4E5E6"]],
	["Summer Breeze", ["#fbed96", "#abecd6"]],
	["Ver", ["#FFE000", "#799F0C"]],
	["Ver Black", ["#F7F8F8", "#ACBB78"]],
	["Combi", [
		"#00416A",
		"#799F0C",
		"#FFE000"
	]],
	["Anwar", ["#334d50", "#cbcaa5"]],
	["Bluelagoo", [
		"#0052D4",
		"#4364F7",
		"#6FB1FC"
	]],
	["Lunada", [
		"#5433FF",
		"#20BDFF",
		"#A5FECB"
	]],
	["Reaqua", ["#799F0C", "#ACBB78"]],
	["Mango", ["#ffe259", "#ffa751"]],
	["Bupe", ["#00416A", "#E4E5E6"]],
	["Rea", ["#FFE000", "#799F0C"]],
	["Windy", ["#acb6e5", "#86fde8"]],
	["Royal Blue", ["#536976", "#292E49"]],
	["Royal Blue + Petrol", [
		"#BBD2C5",
		"#536976",
		"#292E49"
	]],
	["Copper", ["#B79891", "#94716B"]],
	["Anamnisar", ["#9796f0", "#fbc7d4"]],
	["Petrol", ["#BBD2C5", "#536976"]],
	["Sky", ["#076585", "#fff"]],
	["Sel", ["#00467F", "#A5CC82"]],
	["Afternoon", ["#000C40", "#607D8B"]],
	["Skyline", ["#1488CC", "#2B32B2"]],
	["DIMIGO", ["#ec008c", "#fc6767"]],
	["Purple Love", ["#cc2b5e", "#753a88"]],
	["Sexy Blue", ["#2193b0", "#6dd5ed"]],
	["Blooker20", ["#e65c00", "#F9D423"]],
	["Sea Blue", ["#2b5876", "#4e4376"]],
	["Nimvelo", ["#314755", "#26a0da"]],
	["Hazel", [
		"#77A1D3",
		"#79CBCA",
		"#E684AE"
	]],
	["Noon to Dusk", ["#ff6e7f", "#bfe9ff"]],
	["YouTube", ["#e52d27", "#b31217"]],
	["Cool Brown", ["#603813", "#b29f94"]],
	["Harmonic Energy", ["#16A085", "#F4D03F"]],
	["Playing with Reds", ["#D31027", "#EA384D"]],
	["Sunny Days", ["#EDE574", "#E1F5C4"]],
	["Green Beach", ["#02AAB0", "#00CDAC"]],
	["Intuitive Purple", ["#DA22FF", "#9733EE"]],
	["Emerald Water", ["#348F50", "#56B4D3"]],
	["Lemon Twist", ["#3CA55C", "#B5AC49"]],
	["Monte Carlo", [
		"#CC95C0",
		"#DBD4B4",
		"#7AA1D2"
	]],
	["Horizon", ["#003973", "#E5E5BE"]],
	["Rose Water", ["#E55D87", "#5FC3E4"]],
	["Frozen", ["#403B4A", "#E7E9BB"]],
	["Mango Pulp", ["#F09819", "#EDDE5D"]],
	["Bloody Mary", ["#FF512F", "#DD2476"]],
	["Aubergine", ["#AA076B", "#61045F"]],
	["Aqua Marine", ["#1A2980", "#26D0CE"]],
	["Sunrise", ["#FF512F", "#F09819"]],
	["Purple Paradise", ["#1D2B64", "#F8CDDA"]],
	["Stripe", [
		"#1FA2FF",
		"#12D8FA",
		"#A6FFCB"
	]],
	["Sea Weed", ["#4CB8C4", "#3CD3AD"]],
	["Pinky", ["#DD5E89", "#F7BB97"]],
	["Cherry", ["#EB3349", "#F45C43"]],
	["Mojito", ["#1D976C", "#93F9B9"]],
	["Juicy Orange", ["#FF8008", "#FFC837"]],
	["Mirage", ["#16222A", "#3A6073"]],
	["Steel Gray", ["#1F1C2C", "#928DAB"]],
	["Kashmir", ["#614385", "#516395"]],
	["Electric Violet", ["#4776E6", "#8E54E9"]],
	["Venice Blue", ["#085078", "#85D8CE"]],
	["Bora Bora", ["#2BC0E4", "#EAECC6"]],
	["Moss", ["#134E5E", "#71B280"]],
	["Shroom Haze", ["#5C258D", "#4389A2"]],
	["Mystic", ["#757F9A", "#D7DDE8"]],
	["Midnight City", ["#232526", "#414345"]],
	["Sea Blizz", ["#1CD8D2", "#93EDC7"]],
	["Opa", ["#3D7EAA", "#FFE47A"]],
	["Titanium", ["#283048", "#859398"]],
	["Mantle", ["#24C6DC", "#514A9D"]],
	["Dracula", ["#DC2424", "#4A569D"]],
	["Peach", ["#ED4264", "#FFEDBC"]],
	["Moonrise", ["#DAE2F8", "#D6A4A4"]],
	["Clouds", ["#ECE9E6", "#FFFFFF"]],
	["Stellar", ["#7474BF", "#348AC7"]],
	["Bourbon", ["#EC6F66", "#F3A183"]],
	["Calm Darya", ["#5f2c82", "#49a09d"]],
	["Influenza", ["#C04848", "#480048"]],
	["Shrimpy", ["#e43a15", "#e65245"]],
	["Army", ["#414d0b", "#727a17"]],
	["Miaka", ["#FC354C", "#0ABFBC"]],
	["Pinot Noir", ["#4b6cb7", "#182848"]],
	["Day Tripper", ["#f857a6", "#ff5858"]],
	["Namn", ["#a73737", "#7a2828"]],
	["Blurry Beach", ["#d53369", "#cbad6d"]],
	["Vasily", ["#e9d362", "#333333"]],
	["A Lost Memory", ["#DE6262", "#FFB88C"]],
	["Petrichor", ["#666600", "#999966"]],
	["Jonquil", ["#FFEEEE", "#DDEFBB"]],
	["Sirius Tamed", ["#EFEFBB", "#D4D3DD"]],
	["Kyoto", ["#c21500", "#ffc500"]],
	["Misty Meadow", ["#215f00", "#e4e4d9"]],
	["Aqualicious", ["#50C9C3", "#96DEDA"]],
	["Moor", ["#616161", "#9bc5c3"]],
	["Almost", ["#ddd6f3", "#faaca8"]],
	["Forever Lost", ["#5D4157", "#A8CABA"]],
	["Winter", ["#E6DADA", "#274046"]],
	["Nelson", ["#f2709c", "#ff9472"]],
	["Autumn", ["#DAD299", "#B0DAB9"]],
	["Candy", ["#D3959B", "#BFE6BA"]],
	["Reef", ["#00d2ff", "#3a7bd5"]],
	["The Strain", ["#870000", "#190A05"]],
	["Dirty Fog", ["#B993D6", "#8CA6DB"]],
	["Earthly", ["#649173", "#DBD5A4"]],
	["Virgin", ["#C9FFBF", "#FFAFBD"]],
	["Ash", ["#606c88", "#3f4c6b"]],
	["Cherryblossoms", ["#FBD3E9", "#BB377D"]],
	["Parklife", ["#ADD100", "#7B920A"]],
	["Dance To Forget", ["#FF4E50", "#F9D423"]],
	["Starfall", ["#F0C27B", "#4B1248"]],
	["Red Mist", ["#000000", "#e74c3c"]],
	["Teal Love", ["#AAFFA9", "#11FFBD"]],
	["Neon Life", ["#B3FFAB", "#12FFF7"]],
	["Man of Steel", ["#780206", "#061161"]],
	["Amethyst", ["#9D50BB", "#6E48AA"]],
	["Cheer Up Emo Kid", ["#556270", "#FF6B6B"]],
	["Shore", ["#70e1f5", "#ffd194"]],
	["Facebook Messenger", ["#00c6ff", "#0072ff"]],
	["SoundCloud", ["#fe8c00", "#f83600"]],
	["Behongo", ["#52c234", "#061700"]],
	["ServQuick", ["#485563", "#29323c"]],
	["Friday", ["#83a4d4", "#b6fbff"]],
	["Martini", ["#FDFC47", "#24FE41"]],
	["Metallic Toad", ["#abbaab", "#ffffff"]],
	["Between The Clouds", ["#73C8A9", "#373B44"]],
	["Crazy Orange I", ["#D38312", "#A83279"]],
	["Hersheys", ["#1e130c", "#9a8478"]],
	["Talking To Mice Elf", ["#948E99", "#2E1437"]],
	["Purple Bliss", ["#360033", "#0b8793"]],
	["Predawn", ["#FFA17F", "#00223E"]],
	["Endless River", ["#43cea2", "#185a9d"]],
	["Pastel Orange at the Sun", ["#ffb347", "#ffcc33"]],
	["Twitch", ["#6441A5", "#2a0845"]],
	["Atlas", [
		"#FEAC5E",
		"#C779D0",
		"#4BC0C8"
	]],
	["Instagram", [
		"#833ab4",
		"#fd1d1d",
		"#fcb045"
	]],
	["Flickr", ["#ff0084", "#33001b"]],
	["Vine", ["#00bf8f", "#001510"]],
	["Turquoise flow", ["#136a8a", "#267871"]],
	["Portrait", ["#8e9eab", "#eef2f3"]],
	["Virgin America", ["#7b4397", "#dc2430"]],
	["Koko Caramel", ["#D1913C", "#FFD194"]],
	["Fresh Turboscent", ["#F1F2B5", "#135058"]],
	["Green to dark", ["#6A9113", "#141517"]],
	["Ukraine", ["#004FF9", "#FFF94C"]],
	["Curiosity blue", ["#525252", "#3d72b4"]],
	["Dark Knight", ["#BA8B02", "#181818"]],
	["Piglet", ["#ee9ca7", "#ffdde1"]],
	["Lizard", ["#304352", "#d7d2cc"]],
	["Sage Persuasion", ["#CCCCB2", "#757519"]],
	["Between Night and Day", ["#2c3e50", "#3498db"]],
	["Timber", ["#fc00ff", "#00dbde"]],
	["Passion", ["#e53935", "#e35d5b"]],
	["Clear Sky", ["#005C97", "#363795"]],
	["Master Card", ["#f46b45", "#eea849"]],
	["Back To Earth", ["#00C9FF", "#92FE9D"]],
	["Deep Purple", ["#673AB7", "#512DA8"]],
	["Little Leaf", ["#76b852", "#8DC26F"]],
	["Netflix", ["#8E0E00", "#1F1C18"]],
	["Light Orange", ["#FFB75E", "#ED8F03"]],
	["Green and Blue", ["#c2e59c", "#64b3f4"]],
	["Poncho", ["#403A3E", "#BE5869"]],
	["Back to the Future", ["#C02425", "#F0CB35"]],
	["Blush", ["#B24592", "#F15F79"]],
	["Inbox", ["#457fca", "#5691c8"]],
	["Purplin", ["#6a3093", "#a044ff"]],
	["Pale Wood", ["#eacda3", "#d6ae7b"]],
	["Haikus", ["#fd746c", "#ff9068"]],
	["Pizelex", ["#114357", "#F29492"]],
	["Joomla", ["#1e3c72", "#2a5298"]],
	["Christmas", ["#2F7336", "#AA3A38"]],
	["Minnesota Vikings", ["#5614B0", "#DBD65C"]],
	["Miami Dolphins", ["#4DA0B0", "#D39D38"]],
	["Forest", ["#5A3F37", "#2C7744"]],
	["Nighthawk", ["#2980b9", "#2c3e50"]],
	["Superman", ["#0099F7", "#F11712"]],
	["Suzy", ["#834d9b", "#d04ed6"]],
	["Dark Skies", ["#4B79A1", "#283E51"]],
	["Deep Space", ["#000000", "#434343"]],
	["Decent", ["#4CA1AF", "#C4E0E5"]],
	["Colors Of Sky", ["#E0EAFC", "#CFDEF3"]],
	["Purple White", ["#BA5370", "#F4E2D8"]],
	["Ali", ["#ff4b1f", "#1fddff"]],
	["Alihossein", ["#f7ff00", "#db36a4"]],
	["Shahabi", ["#a80077", "#66ff00"]],
	["Red Ocean", ["#1D4350", "#A43931"]],
	["Tranquil", ["#EECDA3", "#EF629F"]],
	["Transfile", ["#16BFFD", "#CB3066"]],
	["Sylvia", ["#ff4b1f", "#ff9068"]],
	["Sweet Morning", ["#FF5F6D", "#FFC371"]],
	["Politics", ["#2196f3", "#f44336"]],
	["Bright Vault", ["#00d2ff", "#928DAB"]],
	["Solid Vault", ["#3a7bd5", "#3a6073"]],
	["Sunset", ["#0B486B", "#F56217"]],
	["Grapefruit Sunset", ["#e96443", "#904e95"]],
	["Deep Sea Space", ["#2C3E50", "#4CA1AF"]],
	["Dusk", ["#2C3E50", "#FD746C"]],
	["Minimal Red", ["#F00000", "#DC281E"]],
	["Royal", ["#141E30", "#243B55"]],
	["Mauve", ["#42275a", "#734b6d"]],
	["Frost", ["#000428", "#004e92"]],
	["Lush", ["#56ab2f", "#a8e063"]],
	["Firewatch", ["#cb2d3e", "#ef473a"]],
	["Sherbert", ["#f79d00", "#64f38c"]],
	["Blood Red", ["#f85032", "#e73827"]],
	["Sun on the Horizon", ["#fceabb", "#f8b500"]],
	["IIIT Delhi", ["#808080", "#3fada8"]],
	["Jupiter", ["#ffd89b", "#19547b"]],
	["50 Shades of Grey", ["#bdc3c7", "#2c3e50"]],
	["Dania", ["#BE93C5", "#7BC6CC"]],
	["Limeade", ["#A1FFCE", "#FAFFD1"]],
	["Disco", ["#4ECDC4", "#556270"]],
	["Love Couple", ["#3a6186", "#89253e"]],
	["Azure Pop", ["#ef32d9", "#89fffd"]],
	["Nepal", ["#de6161", "#2657eb"]],
	["Cosmic Fusion", ["#ff00cc", "#333399"]],
	["Snapchat", ["#fffc00", "#ffffff"]],
	["Ed's Sunset Gradient", ["#ff7e5f", "#feb47b"]],
	["Brady Brady Fun Fun", ["#00c3ff", "#ffff1c"]],
	["Black Rosé", ["#f4c4f3", "#fc67fa"]],
	["80's Purple", ["#41295a", "#2F0743"]],
	["Radar", [
		"#A770EF",
		"#CF8BF3",
		"#FDB99B"
	]],
	["Ibiza Sunset", ["#ee0979", "#ff6a00"]],
	["Dawn", ["#F3904F", "#3B4371"]],
	["Mild", ["#67B26F", "#4ca2cd"]],
	["Vice City", ["#3494E6", "#EC6EAD"]],
	["Jaipur", ["#DBE6F6", "#C5796D"]],
	["Jodhpur", [
		"#9CECFB",
		"#65C7F7",
		"#0052D4"
	]],
	["Cocoaa Ice", ["#c0c0aa", "#1cefff"]],
	["EasyMed", ["#DCE35B", "#45B649"]],
	["Rose Colored Lenses", ["#E8CBC0", "#636FA4"]],
	["What lies Beyond", ["#F0F2F0", "#000C40"]],
	["Roseanna", ["#FFAFBD", "#ffc3a0"]],
	["Honey Dew", ["#43C6AC", "#F8FFAE"]],
	["Under the Lake", ["#093028", "#237A57"]],
	["The Blue Lagoon", ["#43C6AC", "#191654"]],
	["Can You Feel The Love Tonight", ["#4568DC", "#B06AB3"]],
	["Very Blue", ["#0575E6", "#021B79"]],
	["Love and Liberty", ["#200122", "#6f0000"]],
	["Orca", ["#44A08D", "#093637"]],
	["Venice", ["#6190E8", "#A7BFE8"]],
	["Pacific Dream", ["#34e89e", "#0f3443"]],
	["Learning and Leading", ["#F7971E", "#FFD200"]],
	["Celestial", ["#C33764", "#1D2671"]],
	["Purplepine", ["#20002c", "#cbb4d4"]],
	["Sha la la", ["#D66D75", "#E29587"]],
	["Mini", ["#30E8BF", "#FF8235"]],
	["Maldives", ["#B2FEFA", "#0ED2F7"]],
	["Cinnamint", ["#4AC29A", "#BDFFF3"]],
	["Html", ["#E44D26", "#F16529"]],
	["Coal", ["#EB5757", "#000000"]],
	["Sunkist", ["#F2994A", "#F2C94C"]],
	["Blue Skies", ["#56CCF2", "#2F80ED"]],
	["Chitty Chitty Bang Bang", ["#007991", "#78ffd6"]],
	["Visions of Grandeur", ["#000046", "#1CB5E0"]],
	["Crystal Clear", ["#159957", "#155799"]],
	["Mello", ["#c0392b", "#8e44ad"]],
	["Compare Now", ["#EF3B36", "#FFFFFF"]],
	["Meridian", ["#283c86", "#45a247"]],
	["Relay", [
		"#3A1C71",
		"#D76D77",
		"#FFAF7B"
	]],
	["Alive", ["#CB356B", "#BD3F32"]],
	["Scooter", ["#36D1DC", "#5B86E5"]],
	["Terminal", ["#000000", "#0f9b0f"]],
	["Telegram", ["#1c92d2", "#f2fcfe"]],
	["Crimson Tide", ["#642B73", "#C6426E"]],
	["Socialive", ["#06beb6", "#48b1bf"]],
	["Subu", [
		"#0cebeb",
		"#20e3b2",
		"#29ffc6"
	]],
	["Broken Hearts", ["#d9a7c7", "#fffcdc"]],
	["Kimoby Is The New Blue", ["#396afc", "#2948ff"]],
	["Dull", ["#C9D6FF", "#E2E2E2"]],
	["Purpink", ["#7F00FF", "#E100FF"]],
	["Orange Coral", ["#ff9966", "#ff5e62"]],
	["Summer", ["#22c1c3", "#fdbb2d"]],
	["King Yna", [
		"#1a2a6c",
		"#b21f1f",
		"#fdbb2d"
	]],
	["Velvet Sun", ["#e1eec3", "#f05053"]],
	["Zinc", [
		"#ADA996",
		"#F2F2F2",
		"#DBDBDB",
		"#EAEAEA"
	]],
	["Hydrogen", [
		"#667db6",
		"#0082c8",
		"#0082c8",
		"#667db6"
	]],
	["Argon", [
		"#03001e",
		"#7303c0",
		"#ec38bc",
		"#fdeff9"
	]],
	["Lithium", ["#6D6027", "#D3CBB8"]],
	["Digital Water", ["#74ebd5", "#ACB6E5"]],
	["Orange Fun", ["#fc4a1a", "#f7b733"]],
	["Rainbow Blue", ["#00F260", "#0575E6"]],
	["Pink Flavour", ["#800080", "#ffc0cb"]],
	["Sulphur", ["#CAC531", "#F3F9A7"]],
	["Selenium", ["#3C3B3F", "#605C3C"]],
	["Delicate", ["#D3CCE3", "#E9E4F0"]],
	["Ohhappiness", ["#00b09b", "#96c93d"]],
	["Lawrencium", [
		"#0f0c29",
		"#302b63",
		"#24243e"
	]],
	["Relaxing red", ["#fffbd5", "#b20a2c"]],
	["Taran Tado", ["#23074d", "#cc5333"]],
	["Bighead", ["#c94b4b", "#4b134f"]],
	["Sublime Vivid", ["#FC466B", "#3F5EFB"]],
	["Sublime Light", ["#FC5C7D", "#6A82FB"]],
	["Pun Yeta", ["#108dc7", "#ef8e38"]],
	["Quepal", ["#11998e", "#38ef7d"]],
	["Sand to Blue", ["#3E5151", "#DECBA4"]],
	["Wedding Day Blues", [
		"#40E0D0",
		"#FF8C00",
		"#FF0080"
	]],
	["Shifter", ["#bc4e9c", "#f80759"]],
	["Red Sunset", [
		"#355C7D",
		"#6C5B7B",
		"#C06C84"
	]],
	["Moon Purple", ["#4e54c8", "#8f94fb"]],
	["Pure Lust", ["#333333", "#dd1818"]],
	["Slight Ocean View", ["#a8c0ff", "#3f2b96"]],
	["eXpresso", ["#ad5389", "#3c1053"]],
	["Shifty", ["#636363", "#a2ab58"]],
	["Vanusa", ["#DA4453", "#89216B"]],
	["Evening Night", ["#005AA7", "#FFFDE4"]],
	["Magic", [
		"#59C173",
		"#a17fe0",
		"#5D26C1"
	]],
	["Margo", ["#FFEFBA", "#FFFFFF"]],
	["Blue Raspberry", ["#00B4DB", "#0083B0"]],
	["Citrus Peel", ["#FDC830", "#F37335"]],
	["Sin City Red", ["#ED213A", "#93291E"]],
	["Rastafari", [
		"#1E9600",
		"#FFF200",
		"#FF0000"
	]],
	["Summer Dog", ["#a8ff78", "#78ffd6"]],
	["Wiretap", [
		"#8A2387",
		"#E94057",
		"#F27121"
	]],
	["Burning Orange", ["#FF416C", "#FF4B2B"]],
	["Ultra Voilet", ["#654ea3", "#eaafc8"]],
	["By Design", ["#009FFF", "#ec2F4B"]],
	["Kyoo Tah", ["#544a7d", "#ffd452"]],
	["Kye Meh", ["#8360c3", "#2ebf91"]],
	["Kyoo Pal", ["#dd3e54", "#6be585"]],
	["Metapolis", ["#659999", "#f4791f"]],
	["Flare", ["#f12711", "#f5af19"]],
	["Witching Hour", ["#c31432", "#240b36"]],
	["Azur Lane", [
		"#7F7FD5",
		"#86A8E7",
		"#91EAE4"
	]],
	["Neuromancer", ["#f953c6", "#b91d73"]],
	["Harvey", ["#1f4037", "#99f2c8"]],
	["Amin", ["#8E2DE2", "#4A00E0"]],
	["Memariani", [
		"#aa4b6b",
		"#6b6b83",
		"#3b8d99"
	]],
	["Yoda", ["#FF0099", "#493240"]],
	["Cool Sky", [
		"#2980B9",
		"#6DD5FA",
		"#FFFFFF"
	]],
	["Dark Ocean", ["#373B44", "#4286f4"]],
	["Evening Sunshine", ["#b92b27", "#1565C0"]],
	["JShine", [
		"#12c2e9",
		"#c471ed",
		"#f64f59"
	]],
	["Moonlit Asteroid", [
		"#0F2027",
		"#203A43",
		"#2C5364"
	]],
	["MegaTron", [
		"#C6FFDD",
		"#FBD786",
		"#f7797d"
	]],
	["Cool Blues", ["#2193b0", "#6dd5ed"]],
	["Piggy Pink", ["#ee9ca7", "#ffdde1"]],
	["Grade Grey", ["#bdc3c7", "#2c3e50"]],
	["Telko", [
		"#F36222",
		"#5CB644",
		"#007FC3"
	]],
	["Zenta", ["#2A2D3E", "#FECB6E"]],
	["Electric Peacock", [
		"#8a2be2",
		"#0000cd",
		"#228b22",
		"#ccff00"
	]],
	["Under Blue Green", [
		"#051937",
		"#004d7a",
		"#008793",
		"#00bf72",
		"#a8eb12"
	]],
	["Lensod", ["#6025F5", "#FF5555"]],
	["Newspaper", [
		"#8a2be2",
		"#ffa500",
		"#f8f8ff"
	]],
	["Dark Blue Gradient", [
		"#2774ae",
		"#002E5D",
		"#002E5D"
	]],
	["Dark Blu Two", ["#004680", "#4484BA"]],
	["Lemon Lime", ["#7ec6bc", "#ebe717"]],
	["Beleko", [
		"#ff1e56",
		"#f9c942",
		"#1e90ff"
	]],
	["Mango Papaya", ["#de8a41", "#2ada53"]],
	["Unicorn Rainbow", [
		"#f7f0ac",
		"#acf7f0",
		"#f0acf7"
	]],
	["Flame", ["#ff0000", "#fdcf58"]],
	["Blue Red", ["#36B1C7", "#960B33"]],
	["Twitter", ["#1DA1F2", "#009ffc"]],
	["Blooze", [
		"#6da6be",
		"#4b859e",
		"#6da6be"
	]],
	["Blue Slate", ["#B5B9FF", "#2B2C49"]],
	["Space Light Green", ["#9FA0A8", "#5C7852"]],
	["Flower", ["#DCFFBD", "#CC86D1"]],
	["Elate The Euge", [
		"#8BDEDA",
		"#43ADD0",
		"#998EE0",
		"#E17DC2",
		"#EF9393"
	]],
	["Peach Sea", ["#E6AE8C", "#A8CECF"]],
	["Abbas", ["#00fff0", "#0083fe"]],
	["Winter Woods", [
		"#333333",
		"#a2ab58",
		"#A43931"
	]],
	["Ameena", [
		"#0c0c6d",
		"#de512b",
		"#98d0c1",
		"#5bb226",
		"#023c0d"
	]],
	["Emerald Sea", ["#05386b", "#5cdb95"]],
	["Bleem", ["#4284DB", "#29EAC4"]],
	["Coffee Gold", ["#554023", "#c99846"]],
	["Compass", ["#516b8b", "#056b3b"]],
	["Andreuzza's", ["#D70652", "#FF025E"]],
	["Moonwalker", ["#152331", "#000000"]],
	["Whinehouse", [
		"#f7f7f7",
		"#b9a0a0",
		"#794747",
		"#4e2020",
		"#111111"
	]],
	["Hyper Blue", ["#59CDE9", "#0A2A88"]],
	["Racker", [
		"#EB0000",
		"#95008A",
		"#3300FC"
	]],
	["After the Rain", [
		"#ff75c3",
		"#ffa647",
		"#ffe83f",
		"#9fff5b",
		"#70e2ff",
		"#cd93ff"
	]],
	["Neon Green", ["#81ff8a", "#64965e"]],
	["Dusty Grass", ["#d4fc79", "#96e6a1"]],
	["Visual Blue", ["#003d4d", "#00c996"]]
];
//#endregion
//#region src/color/data/wada.ts
const WADA = {
	"c": [
		["Hermosa Pink", "#f9c1ce"],
		["Corinthian Pink", "#f8b6ba"],
		["Cameo Pink", "#e0b3b6"],
		["Fawn", "#d1b0a7"],
		["Light Brown Drab", "#b59392"],
		["Coral Red", "#f58e84"],
		["Fresh Color", "#f6917e"],
		["Grenadine Pink", "#f48067"],
		["Eosine Pink", "#f37f94"],
		["Spinel Red", "#f27291"],
		["Old Rose", "#d46d7a"],
		["Eugenia Red | A", "#e2625e"],
		["Eugenia Red | B", "#da525d"],
		["Raw Sienna", "#bb7125"],
		["Vinaceous Tawny", "#c56127"],
		["Jasper Red", "#eb5324"],
		["Spectrum Red", "#e31f26"],
		["Red Orange", "#dd4027"],
		["Etruscan Red", "#c55347"],
		["Burnt Sienna", "#ae5224"],
		["Ochre Red", "#ab544d"],
		["Scarlet", "#cb2f43"],
		["Carmine", "#cc1236"],
		["Indian Lake", "#c53c69"],
		["Rosolanc Purple", "#b73f74"],
		["Pomegranite Purple", "#b71f57"],
		["Hydrangea Red", "#a94151"],
		["Brick Red", "#a84222"],
		["Carmine Red", "#a62c37"],
		["Pompeian Red", "#ab2439"],
		["Red", "#a72144"],
		["Brown", "#7c4226"],
		["Hay's Russet", "#793327"],
		["Vandyke Red", "#82241f"],
		["Pansy Purple", "#7d133a"],
		["Pale Burnt Lake", "#802626"],
		["Violet Red", "#642d5e"],
		["Vistoris Lake", "#6d4145"],
		["Sulpher Yellow", "#f5ecc2"],
		["Pale Lemon Yellow", "#ffefae"],
		["Naples Yellow", "#fbe6a0"],
		["Ivory Buff", "#ebd3a2"],
		["Seashell Pink", "#fdd4bd"],
		["Light Pinkish Cinnamon", "#fcc79b"],
		["Pinkish Cinnamon", "#eeb480"],
		["Cinnamon Buff", "#fdc57e"],
		["Cream Yellow", "#fdbf68"],
		["Golden Yellow", "#f3a257"],
		["Vinaceous Cinnamon", "#eea78c"],
		["Ochraceous Salmon", "#d8a37b"],
		["Isabella Color", "#c5a56e"],
		["Maple", "#c59f6b"],
		["Olive Buff", "#c1c494"],
		["Ecru", "#c2ae93"],
		["Yellow", "#fff200"],
		["Lemon Yellow", "#f8ed43"],
		["Apricot Yellow", "#ffdd00"],
		["Pyrite Yellow", "#cab356"],
		["Olive Ocher", "#d6b43e"],
		["Yellow Ocher", "#e2b540"],
		["Orange Yellow", "#fcb315"],
		["Yellow Orange", "#f99d1b"],
		["Apricot Orange", "#f68c50"],
		["Orange", "#f37420"],
		["Peach Red", "#f15a30"],
		["English Red", "#d96629"],
		["Cinnamon Rufous", "#c27544"],
		["Orange Rufous", "#c16b27"],
		["Sulphine Yellow", "#c19f2c"],
		["Khaki", "#bc892b"],
		["Citron Yellow", "#b2b73e"],
		["Citrine", "#b09f36"],
		["Buffy Citrine", "#96874d"],
		["Dark Citrine", "#8b835b"],
		["Light Grayish Olive", "#848061"],
		["Krongbergs Green", "#84875e"],
		["Olive", "#837e31"],
		["Orange Citrine", "#986f2d"],
		["Sudan Brown", "#a36752"],
		["Olive Green", "#6b7140"],
		["Light Brownish Olive", "#806e4b"],
		["Deep Grayish Olive", "#635a3a"],
		["Pale Raw Umber", "#71502f"],
		["Sepia", "#644b1e"],
		["Madder Brown", "#762c19"],
		["Mars Brown Tobacco", "#653514"],
		["Vandyke Brown", "#4b3317"],
		["Turquoise Green", "#b5decc"],
		["Glaucous Green", "#b4cdc2"],
		["Dark Greenish Glaucous", "#b7c2a9"],
		["Yellow Green", "#afd472"],
		["Light Green Yellow", "#c7d14f"],
		["Night Green", "#87c540"],
		["Olive Yellow", "#a6a159"],
		["Artemesia Green", "#709390"],
		["Andover Green", "#6d7e77"],
		["Rainette Green", "#8fa071"],
		["Chromium Green", "#719470"],
		["Pistachio Green", "#648f7b"],
		["Sea Green", "#00b49b"],
		["Benzol Green", "#00978d"],
		["Light Porcelain Green", "#00908a"],
		["Green", "#489b6e"],
		["Dull Viridian Green", "#009465"],
		["Oil Green", "#819238"],
		["Diamine Green", "#1a7444"],
		["Cossack Green", "#437742"],
		["Lincoln Green", "#555832"],
		["Blackish Olive", "#42533e"],
		["Deep Slate Olive", "#253122"],
		["Nile Blue", "#bce4e5"],
		["Pale King's Blue", "#a7d4e4"],
		["Light Glaucous Blue", "#a5c8d1"],
		["Salvia Blue", "#97acc8"],
		["Cobalt Green", "#96d1aa"],
		["Calamine BLue", "#78cdd0"],
		["Venice Green", "#62c6bf"],
		["Cerulian Blue", "#0093a5"],
		["Peacock Blue", "#00939b"],
		["Green Blue", "#099197"],
		["Olympic Blue", "#5a82b3"],
		["Blue", "#006eb8"],
		["Antwarp Blue", "#007190"],
		["Helvetia Blue", "#005b8d"],
		["Dark Medici Blue", "#547076"],
		["Dusky Green", "#004f46"],
		["Deep Lyons Blue", "#1c4286"],
		["Violet Blue", "#40456a"],
		["Vandar Poel's Blue", "#064f6e"],
		["Dark Tyrian Blue", "#12354e"],
		["Dull Violet Black", "#1e0e3f"],
		["Deep Indigo", "#051230"],
		["Deep Slate Green", "#112f2c"],
		["Grayish Lavender - A", "#b5b1d8"],
		["Grayish Lavender - B", "#c0a9b3"],
		["Laelia Pink", "#ca92a8"],
		["Lilac", "#b984af"],
		["Eupatorium Purple", "#bf5892"],
		["Light Mauve", "#9a72aa"],
		["Aconite Violet", "#a36aa5"],
		["Dull Blue Violet", "#80719e"],
		["Dark Soft Violet", "#66629c"],
		["Blue Violet", "#6450a1"],
		["Purple Drab", "#84565b"],
		["Deep Violet / Plumbeous", "#70727c"],
		["Veronia Purple", "#8c4c62"],
		["Dark Slate Purple", "#704357"],
		["Taupe Brown", "#7a4456"],
		["Violet Carmine", "#713b4c"],
		["Violet", "#4f4086"],
		["Red Violet", "#59256a"],
		["Cotinga Purple", "#501345"],
		["Dusky Madder Violet", "#4e1d4c"],
		["White", "#ffffff"],
		["Neutral Gray", "#b6bfc1"],
		["Mineral Gray", "#a2b0ad"],
		["Warm Gray", "#a1a39a"],
		["Slate Color", "#34454c"],
		["Black", "#111314"]
	],
	"k": [
		[65, 117],
		[61, 129],
		[13, 39],
		[50, 150],
		[106, 128],
		[7, 131],
		[63, 88],
		[66, 133],
		[36, 140],
		[66, 73],
		[41, 155],
		[50, 119],
		[13, 145],
		[9, 40],
		[100, 133],
		[33, 111],
		[12, 99],
		[3, 152],
		[85, 92],
		[115, 135],
		[7, 99],
		[54, 126],
		[45, 138],
		[83, 145],
		[18, 110],
		[47, 82],
		[1, 157],
		[84, 131],
		[75, 113],
		[29, 155],
		[17, 39],
		[49, 92],
		[13, 157],
		[8, 154],
		[4, 28],
		[68, 87],
		[27, 150],
		[105, 126],
		[22, 123],
		[14, 70],
		[73, 115],
		[59, 149],
		[1, 139],
		[101, 120],
		[42, 55],
		[63, 158],
		[18, 134],
		[24, 123],
		[111, 121],
		[41, 152],
		[28, 121],
		[38, 158],
		[61, 152],
		[100, 112],
		[10, 153],
		[134, 149],
		[147, 157],
		[32, 99],
		[8, 71],
		[39, 129],
		[91, 151],
		[54, 158],
		[37, 117],
		[139, 141],
		[68, 115],
		[58, 79],
		[120, 129],
		[4, 54],
		[156, 158],
		[13, 107],
		[29, 49],
		[38, 111],
		[82, 96],
		[87, 119],
		[111, 127],
		[39, 156],
		[12, 128],
		[44, 116],
		[84, 119],
		[38, 138],
		[47, 156],
		[32, 152],
		[52, 127],
		[42, 132],
		[14, 122],
		[13, 99],
		[1, 70],
		[42, 121],
		[61, 127],
		[8, 139],
		[37, 67],
		[5, 100],
		[71, 112],
		[41, 125],
		[32, 130],
		[59, 76],
		[1, 18],
		[84, 127],
		[39, 117],
		[72, 140],
		[2, 126],
		[41, 67],
		[66, 152],
		[28, 38],
		[2, 97],
		[122, 130],
		[56, 74],
		[8, 27],
		[39, 108],
		[31, 86],
		[39, 90],
		[7, 158],
		[42, 86],
		[60, 122],
		[40, 64],
		[2, 142],
		[22, 158],
		[59, 86],
		[112, 129],
		[2, 29],
		[
			31,
			49,
			107
		],
		[
			22,
			46,
			100
		],
		[
			5,
			55,
			147
		],
		[
			35,
			59,
			93
		],
		[
			3,
			117,
			127
		],
		[
			41,
			59,
			126
		],
		[
			45,
			98,
			141
		],
		[
			1,
			116,
			138
		],
		[
			56,
			69,
			113
		],
		[
			13,
			28,
			149
		],
		[
			13,
			65,
			118
		],
		[
			38,
			47,
			71
		],
		[
			33,
			71,
			99
		],
		[
			8,
			138,
			150
		],
		[
			38,
			106,
			113
		],
		[
			21,
			103,
			150
		],
		[
			18,
			45,
			98
		],
		[
			47,
			55,
			116
		],
		[
			113,
			131,
			154
		],
		[
			47,
			122,
			157
		],
		[
			63,
			90,
			129
		],
		[
			26,
			68,
			113
		],
		[
			121,
			136,
			156
		],
		[
			24,
			63,
			158
		],
		[
			31,
			70,
			130
		],
		[
			69,
			81,
			105
		],
		[
			9,
			33,
			87
		],
		[
			58,
			60,
			117
		],
		[
			58,
			63,
			132
		],
		[
			42,
			70,
			88
		],
		[
			38,
			61,
			128
		],
		[
			18,
			32,
			112
		],
		[
			8,
			60,
			70
		],
		[
			22,
			54,
			121
		],
		[
			15,
			100,
			131
		],
		[
			58,
			114,
			149
		],
		[
			34,
			58,
			120
		],
		[
			55,
			66,
			92
		],
		[
			69,
			115,
			133
		],
		[
			68,
			82,
			124
		],
		[
			31,
			44,
			123
		],
		[
			10,
			96,
			136
		],
		[
			56,
			87,
			122
		],
		[
			17,
			60,
			149
		],
		[
			2,
			9,
			37
		],
		[
			7,
			40,
			132
		],
		[
			53,
			111,
			128
		],
		[
			55,
			128,
			145
		],
		[
			1,
			39,
			156
		],
		[
			24,
			60,
			150
		],
		[
			35,
			61,
			88
		],
		[
			66,
			122,
			150
		],
		[
			55,
			84,
			87
		],
		[
			1,
			134,
			147
		],
		[
			44,
			52,
			142
		],
		[
			0,
			42,
			115
		],
		[
			35,
			72,
			133
		],
		[
			41,
			112,
			119
		],
		[
			17,
			47,
			126
		],
		[
			45,
			138,
			154
		],
		[
			28,
			149,
			151
		],
		[
			13,
			86,
			131
		],
		[
			144,
			145,
			150
		],
		[
			9,
			41,
			74
		],
		[
			4,
			18,
			39
		],
		[
			32,
			49,
			121
		],
		[
			123,
			134,
			139
		],
		[
			96,
			113,
			114
		],
		[
			55,
			109,
			116
		],
		[
			41,
			65,
			158
		],
		[
			4,
			59,
			121
		],
		[
			46,
			86,
			144
		],
		[
			7,
			40,
			101
		],
		[
			15,
			42,
			120
		],
		[
			9,
			39,
			154
		],
		[
			70,
			111,
			142
		],
		[
			8,
			141,
			154
		],
		[
			19,
			56,
			102
		],
		[
			20,
			80,
			126
		],
		[
			28,
			52,
			97
		],
		[
			7,
			76,
			114
		],
		[
			87,
			114,
			157
		],
		[
			39,
			48,
			107
		],
		[
			24,
			66,
			112
		],
		[
			35,
			48,
			149
		],
		[
			1,
			47,
			66
		],
		[
			78,
			88,
			158
		],
		[
			38,
			119,
			122
		],
		[
			41,
			61,
			113
		],
		[
			45,
			55,
			107
		],
		[
			62,
			93,
			131
		],
		[
			29,
			77,
			113
		],
		[
			48,
			56,
			111
		],
		[
			41,
			78,
			149
		],
		[
			46,
			121,
			137
		],
		[
			15,
			102,
			158
		],
		[
			35,
			49,
			105
		],
		[
			123,
			133,
			144
		],
		[
			15,
			97,
			125
		],
		[
			25,
			49,
			139
		],
		[
			28,
			154,
			158
		],
		[
			59,
			61,
			67
		],
		[
			4,
			49,
			87
		],
		[
			9,
			124,
			147
		],
		[
			22,
			125,
			146
		],
		[
			37,
			46,
			149
		],
		[
			0,
			112,
			117
		],
		[
			28,
			39,
			154
		],
		[
			47,
			109,
			154
		],
		[
			7,
			87,
			114
		],
		[
			2,
			32,
			120
		],
		[
			22,
			44,
			131
		],
		[
			28,
			72,
			127
		],
		[
			45,
			82,
			111
		],
		[
			41,
			61,
			134
		],
		[
			69,
			126,
			143
		],
		[
			28,
			84,
			113
		],
		[
			49,
			151,
			156
		],
		[
			4,
			57,
			88
		],
		[
			6,
			54,
			117
		],
		[
			17,
			39,
			50,
			124
		],
		[
			8,
			19,
			105,
			158
		],
		[
			13,
			41,
			79,
			157
		],
		[
			4,
			14,
			95,
			122
		],
		[
			28,
			104,
			129,
			157
		],
		[
			1,
			27,
			38,
			45
		],
		[
			13,
			56,
			100,
			126
		],
		[
			8,
			69,
			133,
			146
		],
		[
			32,
			53,
			58,
			124
		],
		[
			57,
			64,
			99,
			110
		],
		[
			30,
			54,
			105,
			157
		],
		[
			12,
			13,
			68,
			119
		],
		[
			55,
			62,
			151,
			157
		],
		[
			1,
			38,
			76,
			135
		],
		[
			13,
			57,
			115,
			158
		],
		[
			48,
			63,
			103,
			158
		],
		[
			16,
			60,
			121,
			139
		],
		[
			35,
			44,
			76,
			122
		],
		[
			55,
			119,
			123,
			156
		],
		[
			10,
			48,
			88,
			99
		],
		[
			30,
			39,
			115,
			156
		],
		[
			12,
			41,
			71,
			106
		],
		[
			19,
			44,
			87,
			157
		],
		[
			1,
			17,
			89,
			117
		],
		[
			10,
			56,
			93,
			130
		],
		[
			16,
			41,
			96,
			100
		],
		[
			46,
			61,
			100,
			121
		],
		[
			4,
			13,
			109,
			110
		],
		[
			13,
			35,
			139,
			158
		],
		[
			12,
			38,
			79,
			106
		],
		[
			25,
			114,
			119,
			132
		],
		[
			39,
			63,
			87,
			113
		],
		[
			0,
			34,
			78,
			154
		],
		[
			64,
			73,
			120,
			138
		],
		[
			18,
			53,
			84,
			147
		],
		[
			8,
			42,
			90,
			158
		],
		[
			9,
			24,
			76,
			130
		],
		[
			46,
			58,
			106,
			125
		],
		[
			13,
			48,
			53,
			129
		],
		[
			12,
			107,
			135,
			147
		],
		[
			39,
			100,
			114,
			122
		],
		[
			12,
			51,
			114,
			136
		],
		[
			20,
			35,
			97,
			116
		],
		[
			11,
			56,
			99,
			125
		],
		[
			4,
			19,
			64,
			87
		],
		[
			19,
			60,
			118,
			127
		],
		[
			8,
			57,
			111,
			115
		],
		[
			61,
			83,
			147,
			158
		],
		[
			55,
			91,
			127,
			130
		],
		[
			37,
			39,
			107,
			114
		],
		[
			91,
			99,
			114,
			115
		],
		[
			39,
			44,
			50,
			53
		],
		[
			13,
			87,
			94,
			102
		],
		[
			38,
			46,
			106,
			113
		],
		[
			46,
			54,
			121,
			130
		],
		[
			38,
			49,
			82,
			157
		],
		[
			19,
			61,
			79,
			127
		],
		[
			13,
			55,
			64,
			158
		],
		[
			23,
			48,
			104,
			122
		],
		[
			7,
			46,
			87,
			115
		],
		[
			16,
			41,
			96,
			139
		],
		[
			46,
			53,
			110,
			122
		],
		[
			40,
			64,
			109,
			154
		],
		[
			32,
			46,
			73,
			100
		],
		[
			44,
			56,
			70,
			87
		],
		[
			55,
			100,
			103,
			110
		],
		[
			22,
			133,
			139,
			151
		],
		[
			3,
			21,
			65,
			114
		],
		[
			47,
			62,
			127,
			128
		],
		[
			38,
			44,
			76,
			109
		],
		[
			29,
			46,
			89,
			91
		],
		[
			19,
			61,
			94,
			123
		],
		[
			22,
			54,
			105,
			158
		],
		[
			8,
			32,
			126,
			152
		],
		[
			7,
			38,
			47,
			137
		],
		[
			33,
			103,
			149,
			150
		],
		[
			43,
			53,
			55,
			87
		],
		[
			80,
			108,
			125,
			132
		],
		[
			13,
			56,
			61,
			106
		],
		[
			5,
			38,
			104,
			112
		],
		[
			4,
			38,
			109,
			113
		],
		[
			16,
			27,
			137,
			142
		],
		[
			45,
			70,
			84,
			158
		],
		[
			29,
			120,
			139,
			154
		],
		[
			12,
			40,
			59,
			132
		],
		[
			38,
			64,
			90,
			92
		],
		[
			8,
			13,
			53,
			134
		],
		[
			27,
			62,
			86,
			101
		],
		[
			46,
			134,
			151,
			157
		],
		[
			52,
			110,
			113,
			119
		],
		[
			23,
			130,
			138,
			149
		],
		[
			5,
			21,
			109,
			125
		],
		[
			19,
			55,
			114,
			121
		],
		[
			42,
			76,
			90,
			122
		],
		[
			33,
			61,
			149,
			157
		],
		[
			8,
			32,
			39,
			108
		],
		[
			37,
			135,
			148,
			158
		],
		[
			28,
			60,
			125,
			134
		],
		[
			49,
			65,
			112,
			127
		],
		[
			64,
			99,
			154,
			158
		],
		[
			7,
			106,
			109,
			112
		],
		[
			1,
			46,
			77,
			109
		],
		[
			19,
			41,
			81,
			128
		],
		[
			45,
			126,
			139,
			158
		],
		[
			32,
			110,
			116,
			142
		],
		[
			24,
			87,
			91,
			95
		],
		[
			93,
			99,
			123,
			136
		],
		[
			52,
			106,
			109,
			151
		]
	]
};
//#endregion
export { rgbToHsv as _, WAIRO as a, toOklch as b, formatOf as c, gradientCss as d, gradientFromHexes as f, parseSolid as g, parseGradient as h, WAGRAD as i, formatSolid as l, isGradient as m, UIGRADIENTS as n, contrastGrade as o, hsvToRgb as p, CLASSIC as r, contrastRatio as s, WADA as t, fromOklch as u, sampleGradient as v, parseColor as x, toHex as y };
