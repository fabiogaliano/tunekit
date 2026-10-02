import type {
  ControlConfig,
  ControlInput,
  ControlMeta,
  PaneConfig,
  PaneValue,
  SelectOption,
  TransitionMode,
} from "./types.ts";
import { isGradient, parseGradient } from "./color/model.ts";
import { parseColor } from "./vendor/dialkit/color.ts";
import { normalizePadValue } from "./vendor/dialkit/dial-pad.ts";

type ExplicitConfig = Record<string, ControlConfig>;

/** Same inference dialkit applies to a bare number. */
function inferRange(value: number): { min: number; max: number; step: number } {
  if (value >= 0 && value <= 1) return { min: 0, max: 1, step: 0.01 };
  if (value >= 0 && value <= 10) return { min: 0, max: value * 3 || 10, step: 0.1 };
  if (value >= 0 && value <= 100) return { min: 0, max: value * 3 || 100, step: 1 };
  if (value >= 0) return { min: 0, max: value * 3 || 1000, step: 10 };
  return { min: value * 3, max: -value * 3, step: 1 };
}

function toControl(input: ControlInput): ControlConfig {
  if (Array.isArray(input)) {
    const [value, min, max, step] = input as readonly number[];
    return { type: "slider", value: value!, min: min!, max: max!, step };
  }
  if (typeof input === "number") return { type: "slider", value: input, ...inferRange(input) };
  if (typeof input === "boolean") return { type: "toggle", value: input };
  if (typeof input === "string") {
    if (isGradient(input) && parseGradient(input)) return { type: "color", value: input, gradient: true };
    return parseColor(input) && input !== "transparent"
      ? { type: "color", value: input }
      : { type: "text", value: input };
  }
  if (typeof input === "object" && input !== null && "type" in input && typeof input.type === "string") {
    const control = input as ControlConfig;
    return control.type === "folder"
      ? { ...control, children: normalizeConfig(control.children) as PaneConfig }
      : control;
  }
  const { _collapsed, ...children } = input as PaneConfig & { _collapsed?: boolean };
  return {
    type: "folder",
    open: _collapsed === true ? false : true,
    children: normalizeConfig(children as PaneConfig) as PaneConfig,
  };
}

/** Expand shorthand entries into explicit `{ type }` controls (idempotent). */
export function normalizeConfig(config: PaneConfig): ExplicitConfig {
  const out: ExplicitConfig = {};
  for (const [key, input] of Object.entries(config)) {
    if (input === undefined) continue;
    out[key] = toControl(input);
  }
  return out;
}

export function parseConfig(
  config: PaneConfig,
  prefix: string,
): ControlMeta[] {
  const controls: ControlMeta[] = [];

  for (const [key, entry] of Object.entries(normalizeConfig(config))) {
    const path = prefix ? `${prefix}.${key}` : key;
    const label = formatLabel(key);
    const meta = controlToMeta(entry, path, label);
    if (meta) controls.push(meta);
  }
  return controls;
}

export function flattenValues(
  config: PaneConfig,
  prefix: string,
): Record<string, PaneValue> {
  const values: Record<string, PaneValue> = {};

  for (const [key, entry] of Object.entries(normalizeConfig(config))) {
    const path = prefix ? `${prefix}.${key}` : key;

    switch (entry.type) {
      case "slider":
        values[path] = entry.value;
        break;
      case "toggle":
        values[path] = entry.value;
        break;
      case "action":
        values[path] = entry;
        break;
      case "slot":
        break;
      case "select": {
        const first = entry.options[0];
        const firstValue =
          typeof first === "string" ? first : (first?.value ?? "");
        values[path] = entry.value ?? firstValue;
        break;
      }
      case "color":
        values[path] = entry.value ?? "#000000";
        break;
      case "text":
        values[path] = entry.value ?? "";
        break;
      case "spring":
        values[path] = entry;
        break;
      case "easing":
        values[path] = entry;
        break;
      case "image": {
        const first = entry.options?.[0];
        values[path] = entry.value ?? (typeof first === "string" ? first : (first?.value ?? ""));
        break;
      }
      case "pad":
        values[path] = normalizePadValue(undefined, entry);
        break;
      case "folder":
        Object.assign(values, flattenValues(entry.children, path));
        break;
    }
  }
  return values;
}

function controlToMeta(
  entry: ControlConfig,
  path: string,
  label: string,
): ControlMeta | null {
  switch (entry.type) {
    case "slider":
      return {
        type: "slider",
        path,
        label,
        min: entry.min,
        max: entry.max,
        step: entry.step ?? inferStep(entry.min, entry.max),
      };
    case "toggle":
      return { type: "toggle", path, label };
    case "action":
      return { type: "action", path, label: entry.label ?? label };
    case "select":
      return { type: "select", path, label, options: entry.options };
    case "color":
      return { type: "color", path, label, gradient: entry.gradient, contrast: entry.contrast };
    case "text":
      return { type: "text", path, label, placeholder: entry.placeholder };
    case "slot":
      return { type: "slot", path, label: entry.label ?? "" };
    case "image":
      return { type: "image", path, label, options: entry.options };
    case "pad":
      return { type: "pad", path, label, pad: { x: entry.x, y: entry.y, labels: entry.labels } };
    case "spring":
      return { type: "transition", path, label };
    case "easing":
      return { type: "transition", path, label };
    case "folder":
      return {
        type: "folder",
        path,
        label,
        defaultOpen: entry.open ?? true,
        children: parseConfig(entry.children, path),
      };
  }
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function inferStep(min: number, max: number): number {
  const range = max - min;
  if (range <= 1) return 0.01;
  if (range <= 10) return 0.1;
  if (range <= 100) return 1;
  return 10;
}

export function normalizeSelectOptions(
  options: readonly SelectOption[],
): { value: string; label: string }[] {
  return options.map((opt) =>
    typeof opt === "string"
      ? { value: opt, label: opt.replace(/\b\w/g, (c) => c.toUpperCase()) }
      : opt,
  );
}

// The mode is derived from the value's shape rather than stored beside it, so
// programmatic updates and presets can never leave the editor in a stale mode.
export function transitionModeOf(value: PaneValue | undefined): TransitionMode {
  if (typeof value !== "object" || value === null || !("type" in value)) return "simple";
  if (value.type === "easing") return "easing";
  if (value.type !== "spring") return "simple";
  const hasPhysics =
    value.stiffness !== undefined ||
    value.damping !== undefined ||
    value.mass !== undefined;
  const hasTime =
    value.visualDuration !== undefined || value.bounce !== undefined;
  return hasPhysics && !hasTime ? "advanced" : "simple";
}

/** Keep values from `prev` that still exist in `defaults` with the same type. */
export function reconcileValues(
  prev: Record<string, PaneValue>,
  defaults: Record<string, PaneValue>,
): Record<string, PaneValue> {
  const next: Record<string, PaneValue> = {};
  for (const [path, defaultValue] of Object.entries(defaults)) {
    const old = prev[path];
    next[path] =
      old !== undefined && typeof old === typeof defaultValue ? old : defaultValue;
  }
  return next;
}
