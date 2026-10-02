import { useRef } from "preact/hooks";
import {
  gradientCss,
  sampleGradient,
  toHex,
  type ColorFormat,
  type Gradient,
  type Interpolation,
  type GradientType,
} from "../../color/model.ts";
import { ColorEditor } from "./ColorEditor.tsx";
import { ScrubField } from "./ScrubField.tsx";

/** How far below the bar a dragged stop must go to be removed. */
const REMOVE_DISTANCE = 28;

type GradientEditorProps = {
  gradient: Gradient;
  selected: number;
  onChange: (g: Gradient, selected: number) => void;
  format: ColorFormat;
  onFormat: () => void;
};

export function GradientEditor({ gradient: g, selected, onChange, format, onFormat }: GradientEditorProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const sel = Math.min(selected, g.stops.length - 1);
  const update = (patch: Partial<Gradient>, nextSel = sel) => onChange({ ...g, ...patch }, nextSel);

  const removeStop = (i: number) => {
    if (g.stops.length <= 2) return;
    update({ stops: g.stops.filter((_, k) => k !== i) }, Math.max(0, i - 1));
  };

  const posAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const onBarDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).classList.contains("up-cp-stop")) return;
    const pos = posAt(e.clientX);
    update({ stops: [...g.stops, { pos, color: sampleGradient(g, pos) }] }, g.stops.length);
  };

  const onStopDown = (i: number) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    (el.closest(".up-cp-gradient") as HTMLElement | null)?.focus({ preventScroll: true });
    let stops = g.stops;
    let removing = false;
    onChange(g, i);
    const move = (ev: PointerEvent) => {
      const bar = barRef.current!.getBoundingClientRect();
      removing = g.stops.length > 2 && ev.clientY - bar.bottom > REMOVE_DISTANCE;
      el.classList.toggle("up-cp-stop-removing", removing);
      stops = stops.map((s, k) => (k === i ? { ...s, pos: posAt(ev.clientX) } : s));
      onChange({ ...g, stops }, i);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      if (removing) onChange({ ...g, stops: stops.filter((_, k) => k !== i) }, Math.max(0, i - 1));
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  const stop = g.stops[sel]!;

  return (
    <div
      class="up-cp-gradient"
      tabIndex={-1}
      onKeyDown={(e) => {
        if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          removeStop(sel);
        }
      }}
    >
      <div class="up-cp-gbar-wrap">
        <div ref={barRef} class="up-cp-gbar" onPointerDown={onBarDown} title="Click to add a stop">
          <b style={{ background: gradientCss(g, true) }} />
          {g.stops.map((s, i) => (
            <i
              key={i}
              class={`up-cp-stop ${i === sel ? "up-cp-stop-on" : ""}`}
              style={{ left: `${s.pos * 100}%`, background: toHex(s.color) }}
              onPointerDown={onStopDown(i)}
            />
          ))}
        </div>
      </div>

      <div class="up-cp-row up-cp-between">
        <Segmented<GradientType>
          value={g.type}
          options={[["linear", "Linear"], ["radial", "Radial"], ["conic", "Conic"]]}
          onChange={(type) => update({ type })}
        />
        <ScrubField
          label="∠"
          value={g.angle}
          onChange={(angle) => update({ angle })}
          min={0}
          max={360}
          step={1}
          wrap
          suffix="°"
          class={`up-cp-field-angle ${g.type === "radial" ? "up-cp-hidden" : ""}`}
        />
      </div>
      <div class="up-cp-row up-cp-between">
        <Segmented<Interpolation>
          value={g.interp}
          options={[["srgb", "sRGB"], ["oklab", "OKLab"], ["oklch", "OKLCH"]]}
          onChange={(interp) => update({ interp })}
        />
        <span class="up-cp-hint">blend</span>
      </div>

      <ColorEditor
        color={stop.color}
        onChange={(color) => update({ stops: g.stops.map((s, k) => (k === sel ? { ...s, color } : s)) })}
        format={format}
        onFormat={onFormat}
      />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div class="up-cp-seg" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} class={v === value ? "up-cp-seg-on" : ""} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}
