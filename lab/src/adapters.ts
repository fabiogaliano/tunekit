import type { DialConfig } from "dialkit";
import type { PaneConfig, SelectOption } from "tunekit";

// tunekit's published ControlConfig/PaneConfig are circular type aliases, so
// TypeScript collapses entries to `unknown`; restate the shapes we translate.
type Entry =
  | { type: "slider"; value: number; min: number; max: number; step?: number }
  | { type: "toggle"; value: boolean }
  | { type: "select"; value?: string; options: SelectOption[] }
  | { type: "color"; value?: string; gradient?: boolean }
  | { type: "text"; value?: string; placeholder?: string }
  | { type: "folder"; open?: boolean; children: PaneConfig }
  | { type: "slot"; label?: string }
  | { type: "action"; label?: string }
  | { type: "spring"; visualDuration?: number; bounce?: number; stiffness?: number; damping?: number; mass?: number }
  | { type: "easing"; duration: number; ease: readonly [number, number, number, number] }
  | { type: "image"; value?: string; options?: readonly SelectOption[] }
  | { type: "pad" };

const isExplicit = (v: unknown): v is Entry =>
  typeof v === "object" && v !== null && !Array.isArray(v) && "type" in v;

/** Translate a tunekit config into the equivalent dialkit config. */
export function toDialkit(config: PaneConfig): DialConfig {
  const out: DialConfig = {};
  for (const [key, raw] of Object.entries(config)) {
    if (!isExplicit(raw)) {
      // Shorthand is native to dialkit; only nested folders need recursing.
      out[key] = typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? (toDialkit(raw as PaneConfig) as DialConfig[string])
        : (raw as DialConfig[string]);
      continue;
    }
    const entry = raw;
    switch (entry.type) {
      case "slider":
        out[key] = entry.step === undefined
          ? [entry.value, entry.min, entry.max]
          : [entry.value, entry.min, entry.max, entry.step];
        break;
      case "toggle":
        out[key] = entry.value;
        break;
      case "select":
        out[key] = { type: "select", options: entry.options, default: entry.value };
        break;
      case "color":
        // dialkit colors can't hold a gradient; a text field keeps it editable there.
        out[key] = entry.gradient ? { type: "text", default: entry.value } : { type: "color", default: entry.value };
        break;
      case "text":
        out[key] = { type: "text", default: entry.value, placeholder: entry.placeholder };
        break;
      case "image":
        out[key] = { type: "image", options: entry.options as (string | { value: string; label: string })[], default: entry.value };
        break;
      case "folder":
        out[key] = { ...toDialkit(entry.children), ...(entry.open === false ? { _collapsed: true } : {}) };
        break;
      case "slot":
        // dialkit has no equivalent of arbitrary embedded React content.
        break;
      default:
        // action / spring / easing share the same shape in both libraries.
        out[key] = entry as unknown as DialConfig[string];
    }
  }
  return out;
}

/** dot-path → value map into a nested object (dialkit setValues / scene params). */
export function nest(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let node = out;
    for (const part of parts.slice(0, -1)) {
      node = (node[part] ??= {}) as Record<string, unknown>;
    }
    node[parts[parts.length - 1]!] = value;
  }
  return out;
}

export function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isLeaf =
      value === null || typeof value !== "object" || Array.isArray(value) || "type" in value;
    if (isLeaf) out[path] = value;
    else Object.assign(out, flatten(value as Record<string, unknown>, path));
  }
  return out;
}
