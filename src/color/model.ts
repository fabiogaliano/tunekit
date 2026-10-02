import {
  clamp,
  colorToRgb,
  fitGamut,
  formatColor,
  parseColor,
  rgbToColor,
} from "../vendor/dialkit/color.ts";

export type Rgb = [number, number, number];
/** Picker state. HSV keeps the hue when saturation or value hits zero, which RGB can't. */
export type Hsva = { h: number; s: number; v: number; a: number };
export type ColorFormat = "hex" | "oklch" | "rgb";

export function hsvToRgb({ h, s, v }: Hsva): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

export function rgbToHsv([r, g, b]: Rgb, a = 1, prevH = 0): Hsva {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = prevH;
  if (d > 1e-6) {
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max, a };
}

const byte = (n: number) => Math.round(clamp(n) * 255);
const hex2 = (n: number) => byte(n).toString(16).padStart(2, "0");

export function toHex(c: Hsva, withAlpha = true): string {
  return "#" + hsvToRgb(c).map(hex2).join("") + (withAlpha && c.a < 1 ? hex2(c.a) : "");
}

export function parseSolid(value: string, prevH?: number): Hsva | null {
  const parsed = parseColor(value);
  if (!parsed) return null;
  const rgb = colorToRgb(fitGamut(parsed)).map((n) => clamp(n)) as Rgb;
  return rgbToHsv(rgb, parsed.a, prevH);
}

export function formatOf(value: string): ColorFormat {
  const v = value.trim().toLowerCase();
  return v.startsWith("oklch(") ? "oklch" : v.startsWith("rgb") ? "rgb" : "hex";
}

export function formatSolid(c: Hsva, format: ColorFormat): string {
  if (format === "hex") return toHex(c);
  const rgb = hsvToRgb(c);
  if (format === "oklch") return formatColor(rgbToColor(rgb, c.a), "oklch");
  const alpha = c.a < 1 ? ` / ${Number(c.a.toFixed(3))}` : "";
  return `rgb(${rgb.map(byte).join(" ")}${alpha})`;
}

export function toOklch(c: Hsva): [number, number, number] {
  const o = rgbToColor(hsvToRgb(c));
  return [o.l, o.c, o.h];
}

/** Out-of-gamut input keeps lightness and hue and loses chroma, as designers expect. */
export function fromOklch(l: number, ch: number, h: number, prev: Hsva): Hsva {
  const rgb = colorToRgb(fitGamut({ l, c: ch, h, a: 1 })).map((n) => clamp(n)) as Rgb;
  return rgbToHsv(rgb, prev.a, prev.h);
}

// ---------------------------------------------------------------- contrast

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

/** WCAG 2 contrast ratio, compositing a translucent foreground over the background first. */
export function contrastRatio(fg: Hsva, bg: Hsva): number {
  const b = hsvToRgb(bg);
  const f = hsvToRgb(fg).map((c, i) => c * fg.a + b[i]! * (1 - fg.a)) as Rgb;
  const [hi, lo] = [luminance(f), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

export function contrastGrade(ratio: number): string {
  return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail";
}

// ---------------------------------------------------------------- gradients

export type GradientType = "linear" | "radial" | "conic";
export type Interpolation = "srgb" | "oklab" | "oklch";
export type GradientStop = { pos: number; color: Hsva };
export type Gradient = {
  type: GradientType;
  angle: number;
  interp: Interpolation;
  stops: GradientStop[];
};

export const isGradient = (value: string) => /^\s*(linear|radial|conic)-gradient\(/i.test(value);

export function gradientCss(g: Gradient, asBar = false): string {
  const stops = [...g.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${toHex(s.color)} ${Math.round(s.pos * 1000) / 10}%`)
    .join(", ");
  const interp = g.interp === "srgb" ? "" : ` in ${g.interp}`;
  const angle = Math.round(g.angle);
  if (asBar) return `linear-gradient(90deg${interp}, ${stops})`;
  if (g.type === "radial") return `radial-gradient(circle${interp}, ${stops})`;
  if (g.type === "conic") return `conic-gradient(from ${angle}deg${interp}, ${stops})`;
  return `linear-gradient(${angle}deg${interp}, ${stops})`;
}

const SIDES: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };

/** Split on commas that aren't inside parentheses (stop colors like `rgb(1, 2, 3)`). */
function splitTop(body: string): string[] {
  const out: string[] = [];
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
export function parseGradient(value: string): Gradient | null {
  const m = value.trim().match(/^(linear|radial|conic)-gradient\(([\s\S]*)\)$/i);
  if (!m) return null;
  const type = m[1]!.toLowerCase() as GradientType;
  const parts = splitTop(m[2]!);
  const g: Gradient = { type, angle: type === "linear" ? 180 : 0, interp: "srgb", stops: [] };

  const stopOf = (part: string) => {
    const sm = part.match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/);
    const color = sm && parseSolid(sm[1]!);
    return color ? { color, pos: sm![2] === undefined ? null : clamp(parseFloat(sm![2]) / 100) } : null;
  };
  if (!stopOf(parts[0]!)) {
    const header = parts.shift()!.toLowerCase();
    const interp = header.match(/\bin\s+(srgb|oklab|oklch)\b/);
    if (interp) g.interp = interp[1] as Interpolation;
    const deg = header.match(/(-?[\d.]+)deg/);
    if (deg) g.angle = ((parseFloat(deg[1]!) % 360) + 360) % 360;
    const side = header.match(/\bto\s+(top|right|bottom|left)\b/);
    if (side) g.angle = SIDES[side[1]!]!;
  }
  const raw = parts.map(stopOf);
  if (raw.length < 2 || raw.some((s) => !s)) return null;
  g.stops = raw.map((s, i) => ({ color: s!.color, pos: s!.pos ?? i / (raw.length - 1) }));
  return g;
}

export function gradientFromHexes(hexes: readonly string[]): Gradient {
  return {
    type: "linear",
    angle: 135,
    interp: "oklab",
    stops: hexes.map((h, i) => ({ pos: i / Math.max(1, hexes.length - 1), color: parseSolid(h)! })),
  };
}

/** Colour at `pos`, so a stop added mid-bar doesn't change how the gradient looks. */
export function sampleGradient(g: Gradient, pos: number): Hsva {
  const st = [...g.stops].sort((a, b) => a.pos - b.pos);
  if (pos <= st[0]!.pos) return { ...st[0]!.color };
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1]!;
    const b = st[i]!;
    if (pos <= b.pos) {
      const t = (pos - a.pos) / (b.pos - a.pos || 1);
      const A = hsvToRgb(a.color);
      const B = hsvToRgb(b.color);
      return rgbToHsv(A.map((c, k) => c + (B[k]! - c) * t) as Rgb, a.color.a + (b.color.a - a.color.a) * t);
    }
  }
  return { ...st[st.length - 1]!.color };
}
