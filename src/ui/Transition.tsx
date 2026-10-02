import { useCallback, useRef, useState } from "preact/hooks";
import {
  physicsToTime,
  springProgress,
  timeToPhysics,
  type SpringPhysics,
} from "../anim.ts";
import { transitionModeOf } from "../config.ts";
import { formatEase, parseEase } from "../vendor/dialkit/easing-geometry.ts";
import { EasingEditor } from "./Vendor.tsx";
import type { EasingConfig, SpringConfig, TransitionMode } from "../types.ts";
import { SegmentedControl } from "./Controls.tsx";
import { Folder } from "./Folder.tsx";
import { Slider } from "./Slider.tsx";

// ---------------------------------------------------------------------------
// Spring Visualization
// ---------------------------------------------------------------------------

const DEFAULT_TIME = { visualDuration: 0.3, bounce: 0.2 };
const DEFAULT_PHYSICS = { stiffness: 400, damping: 17, mass: 1 };
const DEFAULT_EASE = [0.25, 0.1, 0.25, 1] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, step: number) => Math.round(v / step) * step;

function springPhysics(spring: SpringConfig, isSimple: boolean): SpringPhysics {
  return isSimple
    ? timeToPhysics(
        spring.visualDuration ?? DEFAULT_TIME.visualDuration,
        spring.bounce ?? DEFAULT_TIME.bounce,
      )
    : {
        stiffness: spring.stiffness ?? DEFAULT_PHYSICS.stiffness,
        damping: spring.damping ?? DEFAULT_PHYSICS.damping,
        mass: spring.mass ?? DEFAULT_PHYSICS.mass,
      };
}

/** Rough perceived duration of any transition value, used when switching modes. */
function durationOf(value: SpringConfig | EasingConfig): number {
  if (value.type === "easing") return value.duration;
  const mode = transitionModeOf(value);
  if (mode === "simple") return value.visualDuration ?? DEFAULT_TIME.visualDuration;
  return physicsToTime(springPhysics(value, false)).visualDuration;
}

function convert(
  value: SpringConfig | EasingConfig,
  to: TransitionMode,
): SpringConfig | EasingConfig {
  const duration = durationOf(value);
  if (to === "easing") {
    return { type: "easing", duration: clamp(round(duration, 0.05), 0.1, 2), ease: DEFAULT_EASE };
  }
  const time =
    value.type === "spring" && transitionModeOf(value) === "advanced"
      ? physicsToTime(springPhysics(value, false))
      : {
          visualDuration: duration,
          bounce: value.type === "spring" ? (value.bounce ?? DEFAULT_TIME.bounce) : DEFAULT_TIME.bounce,
        };
  if (to === "simple") {
    return {
      type: "spring",
      visualDuration: clamp(round(time.visualDuration, 0.05), 0.1, 1),
      bounce: clamp(round(time.bounce, 0.05), 0, 1),
    };
  }
  const p = timeToPhysics(time.visualDuration, time.bounce);
  return {
    type: "spring",
    stiffness: clamp(round(p.stiffness, 10), 1, 1000),
    damping: clamp(round(p.damping, 1), 1, 100),
    mass: 1,
  };
}

function SpringViz({
  spring,
  isSimple,
}: {
  spring: SpringConfig;
  isSimple: boolean;
}) {
  const W = 256;
  const H = 140;

  const physics = springPhysics(spring, isSimple);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * 2;
    pts.push([t, springProgress(t, physics)]);
  }
  const vals = pts.map(([, v]) => v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const range = hi - lo || 1;

  const d = pts
    .map(([t, v], i) => {
      const x = (t / 2) * W;
      const y = H - (((v - lo) / range) * H * 0.6 + H * 0.2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Quarter grid behind the curve, as in dialkit's SpringVisualization.
  const grid = [1, 2, 3].flatMap((i) => [
    <line key={`v${i}`} x1={(W / 4) * i} y1={0} x2={(W / 4) * i} y2={H} />,
    <line key={`h${i}`} x1={0} y1={(H / 4) * i} x2={W} y2={(H / 4) * i} />,
  ]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="up-viz up-spring-viz">
      <g class="up-viz-grid">{grid}</g>
      <line class="up-viz-target" x1={0} y1={H / 2} x2={W} y2={H / 2} />
      <path class="up-viz-curve" d={d} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Transition Control (Spring + Easing unified)
// ---------------------------------------------------------------------------

type TransitionControlProps = {
  label: string;
  value: SpringConfig | EasingConfig;
  onChange: (v: SpringConfig | EasingConfig) => void;
};

export function TransitionControl({
  label,
  value,
  onChange,
}: TransitionControlProps) {
  const mode = transitionModeOf(value);
  const isEasing = mode === "easing";
  const isSimple = mode === "simple";

  const spring: SpringConfig =
    value.type === "spring" ? value : { type: "spring", ...DEFAULT_TIME };
  const easing: EasingConfig =
    value.type === "easing"
      ? value
      : { type: "easing", duration: 0.3, ease: DEFAULT_EASE };

  // Remember the last value per mode so flipping modes back and forth is lossless.
  const cache = useRef<Partial<Record<TransitionMode, SpringConfig | EasingConfig>>>({});
  cache.current[mode] = value;

  const handleModeChange = useCallback(
    (newMode: string) => {
      const target = newMode as TransitionMode;
      if (target === mode) return;
      onChange(cache.current[target] ?? convert(value, target));
    },
    [mode, value, onChange],
  );

  const updateSpring = useCallback(
    (key: string, val: number) => {
      if (isSimple) {
        const { stiffness: _s, damping: _d, mass: _m, ...rest } = spring;
        onChange({ ...rest, [key]: val } as SpringConfig);
      } else {
        const { visualDuration: _v, bounce: _b, ...rest } = spring;
        onChange({ ...rest, [key]: val } as SpringConfig);
      }
    },
    [spring, isSimple, onChange],
  );

  return (
    <Folder title={label} defaultOpen>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {isEasing ? (
          <EasingEditor easing={easing} onChange={(ease) => onChange({ ...easing, ease })} />
        ) : (
          <SpringViz spring={spring} isSimple={isSimple} />
        )}

        <div class="up-labeled-row">
          <span class="up-labeled-row-label">Type</span>
          <SegmentedControl
            options={[
              { value: "easing", label: "Easing" },
              { value: "simple", label: "Time" },
              { value: "advanced", label: "Physics" },
            ]}
            value={mode}
            onChange={handleModeChange}
          />
        </div>

        {isEasing ? (
          <>
            <EaseInput ease={easing.ease} onChange={(ease) => onChange({ ...easing, ease })} />
            <Slider label="Duration" value={easing.duration} onChange={(v) => onChange({ ...easing, duration: v })} min={0.1} max={2} step={0.05} />
          </>
        ) : isSimple ? (
          <>
            <Slider label="Duration" value={spring.visualDuration ?? 0.3} onChange={(v) => updateSpring("visualDuration", v)} min={0.1} max={1} step={0.05} />
            <Slider label="Bounce" value={spring.bounce ?? 0.2} onChange={(v) => updateSpring("bounce", v)} min={0} max={1} step={0.05} />
          </>
        ) : (
          <>
            <Slider label="Stiffness" value={spring.stiffness ?? 400} onChange={(v) => updateSpring("stiffness", v)} min={1} max={1000} step={10} />
            <Slider label="Damping" value={spring.damping ?? 17} onChange={(v) => updateSpring("damping", v)} min={1} max={100} step={1} />
            <Slider label="Mass" value={spring.mass ?? 1} onChange={(v) => updateSpring("mass", v)} min={0.1} max={10} step={0.1} />
          </>
        )}
      </div>
    </Folder>
  );
}

/** Editable "x1, y1, x2, y2" field; commits on blur/Enter, ignores invalid input. */
function EaseInput({
  ease,
  onChange,
}: {
  ease: EasingConfig["ease"];
  onChange: (ease: [number, number, number, number]) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  return (
    <div class="up-labeled-row">
      <span class="up-labeled-row-label">Ease</span>
      <input
        type="text"
        class="up-text-input up-ease-input"
        aria-label="Bézier coordinates"
        spellcheck={false}
        value={draft ?? formatEase([...ease])}
        onFocus={() => {
          cancelled.current = false;
          setDraft(formatEase([...ease]));
        }}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
        onBlur={() => {
          const parsed = draft === null || cancelled.current ? null : parseEase(draft);
          if (parsed) onChange(parsed);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
