import { useState } from "preact/hooks";
import {
  contrastGrade,
  contrastRatio,
  formatOf,
  fromOklch,
  hsvToRgb,
  parseSolid,
  rgbToHsv,
  toHex,
  toOklch,
  type ColorFormat,
  type Hsva,
  type Rgb,
} from "../../color/model.ts";
import { CLASSIC } from "../../color/data/japanese.ts";
import { HexField, ScrubField } from "./ScrubField.tsx";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pointer-captured drag that reports the position within the element as 0–1. */
export function dragXY(onMove: (x: number, y: number) => void) {
  return (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const report = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      onMove(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height));
    };
    report(e);
    const up = () => {
      el.removeEventListener("pointermove", report);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", report);
    el.addEventListener("pointerup", up);
  };
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

const FORMATS: ColorFormat[] = ["hex", "oklch", "rgb"];
export const nextFormat = (f: ColorFormat) => FORMATS[(FORMATS.indexOf(f) + 1) % FORMATS.length]!;

type ColorEditorProps = {
  color: Hsva;
  onChange: (c: Hsva) => void;
  format: ColorFormat;
  onFormat: () => void;
  /** Row of classic hues under the sliders (solid tab only). */
  classic?: boolean;
  /** Backgrounds the contrast badge cycles through; omitted → no badge. */
  contrastWith?: string[];
};

export function ColorEditor({ color, onChange, format, onFormat, classic, contrastWith }: ColorEditorProps) {
  const set = (patch: Partial<Hsva>) => onChange({ ...color, ...patch });
  const rgb = hsvToRgb(color);
  const opaque = toHex({ ...color, a: 1 });
  const pure = toHex({ h: color.h, s: 1, v: 1, a: 1 });
  const EyeDropper = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;

  const [l, c, h] = toOklch(color);
  const setOk = (nl: number, nc: number, nh: number) => onChange(fromOklch(nl, nc, nh, color));
  const alphaField = (
    <ScrubField label="A" value={color.a * 100} onChange={(v) => set({ a: v / 100 })} min={0} max={100} step={0.5} suffix="%" class="up-cp-field-alpha" />
  );

  return (
    <div class="up-cp-editor">
      <div
        class="up-cp-area"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})` }}
        onPointerDown={dragXY((x, y) => set({ s: x, v: 1 - y }))}
      >
        <i class="up-cp-thumb" style={{ left: `${color.s * 100}%`, top: `${(1 - color.v) * 100}%`, background: opaque }} />
      </div>

      <div class="up-cp-row">
        {EyeDropper && (
          <button
            type="button"
            class="up-cp-icon-btn"
            title="Pick from screen"
            onClick={async () => {
              try {
                const { sRGBHex } = await new EyeDropper().open();
                const picked = parseSolid(sRGBHex, color.h);
                if (picked) onChange({ ...picked, a: color.a });
              } catch {
                /* dismissed */
              }
            }}
          >
            <svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5M11 8l5 5M4 20l1-4 9.5-9.5 3 3L8 19z" /></svg>
          </button>
        )}
        <div class="up-cp-sliders">
          <div class="up-cp-slider up-cp-hue" onPointerDown={dragXY((x) => set({ h: x * 359.9 }))}>
            <i class="up-cp-thumb" style={{ left: `${(color.h / 360) * 100}%`, background: pure }} />
          </div>
          <div class="up-cp-slider up-cp-alpha" onPointerDown={dragXY((x) => set({ a: Math.round(x * 100) / 100 }))}>
            <b style={{ background: `linear-gradient(to right, transparent, ${opaque})` }} />
            <i class="up-cp-thumb" style={{ left: `${color.a * 100}%` }} />
          </div>
        </div>
        <div class="up-cp-preview">
          <b style={{ background: toHex(color) }} />
        </div>
      </div>

      {classic && (
        <div class="up-cp-dots">
          {CLASSIC.map(([name, hex]) => (
            <Dot key={hex} hex={hex} title={`${name} · ${hex}`} selected={opaque} onPick={(v) => onChange({ ...parseSolid(v, color.h)!, a: color.a })} />
          ))}
        </div>
      )}

      <div class="up-cp-fields">
        <button type="button" class="up-cp-format" title={`Format: ${format.toUpperCase()} (click to switch)`} onClick={onFormat}>
          {format.toUpperCase()}
          <svg viewBox="0 0 24 24"><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>
        </button>
        {format === "hex" && (
          <HexField
            value={toHex(color, false)}
            onCommit={(hex) => {
              const parsed = parseSolid(hex, color.h);
              if (parsed) onChange({ ...parsed, a: color.a });
              return !!parsed;
            }}
          />
        )}
        {format === "oklch" && (
          <>
            <ScrubField label="L" value={l * 100} onChange={(v) => setOk(v / 100, c, h)} min={0} max={100} step={0.25} />
            <ScrubField label="C" value={c} onChange={(v) => setOk(l, v, h)} min={0} max={0.37} step={0.001} digits={3} class="up-cp-field-wide" />
            <ScrubField label="H" value={h} onChange={(v) => setOk(l, c, v)} min={0} max={360} step={0.5} wrap />
          </>
        )}
        {format === "rgb" &&
          [0, 1, 2].map((i) => (
            <ScrubField
              key={i}
              label={"RGB"[i]!}
              value={rgb[i]! * 255}
              onChange={(v) => {
                const next = [...rgb] as Rgb;
                next[i] = v / 255;
                onChange(rgbToHsv(next, color.a, color.h));
              }}
              min={0}
              max={255}
              step={0.5}
            />
          ))}
        {alphaField}
      </div>

      {contrastWith && contrastWith.length > 0 && <ContrastBadge color={color} backgrounds={contrastWith} />}
    </div>
  );
}

export function Dot({ hex, title, selected, onPick, onPreview }: { hex: string; title: string; selected: string; onPick: (hex: string) => void; onPreview?: (hex: string) => void }) {
  const on = hex.toLowerCase() === selected.toLowerCase();
  const light = toOklch(parseSolid(hex)!)[0] > 0.9;
  return (
    <button
      type="button"
      class={`up-cp-dot ${on ? "up-cp-dot-on" : ""} ${light ? "up-cp-dot-light" : ""}`}
      style={{ "--c": hex }}
      title={title}
      onClick={() => onPick(hex)}
      onMouseEnter={onPreview && (() => onPreview(hex))}
    />
  );
}

function ContrastBadge({ color, backgrounds }: { color: Hsva; backgrounds: string[] }) {
  const [index, setIndex] = useState(0);
  const bg = backgrounds[index % backgrounds.length]!;
  const bgColor = parseSolid(bg);
  if (!bgColor) return null;
  const ratio = contrastRatio(color, bgColor);
  const grade = contrastGrade(ratio);
  return (
    <button
      type="button"
      class="up-cp-contrast"
      title={`Contrast against ${bg} (WCAG 2). Click to switch background.`}
      onClick={() => setIndex((i) => i + 1)}
    >
      <span class="up-cp-contrast-sample" style={{ background: bg, color: toHex(color) }}>Aa</span>
      <span class="up-cp-contrast-ratio">{ratio.toFixed(2)}:1</span>
      <span class={`up-cp-contrast-grade ${grade === "Fail" ? "up-cp-contrast-fail" : ""}`}>{grade}</span>
      <span class="up-cp-contrast-bg">vs {formatOf(bg) === "hex" ? bg.toUpperCase() : bg}</span>
    </button>
  );
}
