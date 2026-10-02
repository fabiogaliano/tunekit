// ---------------------------------------------------------------------------
// Config types — what the user declares
// ---------------------------------------------------------------------------

export type SliderConfig = {
  type: "slider";
  value: number;
  min: number;
  max: number;
  step?: number;
};

export type ToggleConfig = {
  type: "toggle";
  value: boolean;
};

export type ActionConfig = {
  type: "action";
  label?: string;
};

export type SlotConfig = {
  type: "slot";
  label?: string;
};

export type SelectOption = string | { value: string; label: string };

export type SelectConfig = {
  type: "select";
  value?: string;
  // readonly so `usePane`'s const type parameter can infer inline option arrays.
  options: readonly SelectOption[];
};

export type ColorConfig = {
  type: "color";
  /** Any CSS color; with `gradient`, also a CSS gradient string. */
  value?: string;
  /** Adds the Gradient tab; the value may then be a `linear/radial/conic-gradient(...)`. */
  gradient?: boolean;
  /** Background for the contrast badge (it also offers white and black). */
  contrast?: string;
};

export type TextConfig = {
  type: "text";
  value?: string;
  placeholder?: string;
};

export type SpringConfig = {
  type: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  visualDuration?: number;
  bounce?: number;
};

export type EasingConfig = {
  type: "easing";
  duration: number;
  ease: readonly [number, number, number, number];
};

export type TransitionValue = SpringConfig | EasingConfig;

export type ImageOption = string | { value: string; label: string };

export type ImageConfig = {
  type: "image";
  value?: string;
  options?: readonly ImageOption[];
};

/** [default, min, max, step?] — the same notation as the slider shorthand. */
export type PadAxis = readonly [number, number, number, number?];

export type PadValue = { x: number; y: number };

export type PadConfig = {
  type: "pad";
  /** Defaults to [0, -1, 1, 0.01]. */
  x?: PadAxis;
  /** Positive Y points up. Defaults to [0, -1, 1, 0.01]. */
  y?: PadAxis;
  labels?: { x?: string; y?: string };
};

export type FolderConfig<C extends PaneConfig = PaneConfig> = {
  type: "folder";
  open?: boolean;
  children: C;
};

export type ControlConfig =
  | SliderConfig
  | ToggleConfig
  | ActionConfig
  | SlotConfig
  | SelectConfig
  | ColorConfig
  | TextConfig
  | SpringConfig
  | EasingConfig
  | ImageConfig
  | PadConfig
  | FolderConfig;

/** `[default, min, max, step?]` shorthand for a slider. */
export type SliderTuple = readonly [number, number, number, number?];

/**
 * Anything a config key may hold. Besides explicit `{ type }` controls:
 * a number or tuple → slider, boolean → toggle, string → color (if it parses
 * as a color or CSS gradient) or text, and a plain object → folder
 * (`_collapsed: true` starts it closed).
 */
export type ControlInput =
  | ControlConfig
  | SliderTuple
  | number
  | boolean
  | string
  | PaneConfig;

// An interface (not a Record alias) breaks the FolderConfig ↔ PaneConfig cycle;
// as a type alias TypeScript collapses ControlConfig to `any`.
export interface PaneConfig {
  // Objects carrying `type` must be a real control, so a typo such as
  // { type: "slidr" } is an error rather than a folder.
  type?: never;
  [key: string]: ControlInput | undefined;
}

// ---------------------------------------------------------------------------
// Resolved value types — what usePane() returns
// ---------------------------------------------------------------------------

type ResolveControl<T> = T extends number
  ? number
  : T extends boolean
  ? boolean
  : T extends string
  ? string
  : T extends SliderTuple
  ? number
  : T extends SliderConfig
  ? number
  : T extends ImageConfig
  ? string
  : T extends PadConfig
  ? PadValue
  : T extends ToggleConfig
    ? boolean
    : T extends SelectConfig
      ? string
      : T extends ColorConfig
        ? string
        : T extends TextConfig
          ? string
          : T extends SpringConfig
            ? TransitionValue
            : T extends EasingConfig
              ? TransitionValue
              : T extends FolderConfig<infer C>
                ? ResolvedValues<C>
                : T extends PaneConfig
                  ? ResolvedValues<T>
                  : never;

export type ResolvedValues<T extends PaneConfig> = {
  [K in keyof T as K extends "_collapsed"
    ? never
    : T[K] extends ActionConfig | SlotConfig
      ? never
      : K]: ResolveControl<T[K]>;
};

// ---------------------------------------------------------------------------
// Internal control metadata (produced by config parser)
// ---------------------------------------------------------------------------

export type ControlType =
  | "slider"
  | "toggle"
  | "action"
  | "slot"
  | "select"
  | "color"
  | "text"
  | "spring"
  | "easing"
  | "transition"
  | "image"
  | "pad"
  | "folder";

export type ControlMeta = {
  type: ControlType;
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  children?: ControlMeta[];
  defaultOpen?: boolean;
  options?: readonly SelectOption[];
  placeholder?: string;
  gradient?: boolean;
  contrast?: string;
  pad?: Omit<PadConfig, "type">;
  shortcut?: ShortcutConfig;
};

/**
 * Hold `key` (with `modifier`) and scroll / drag / move to scrub a slider, or
 * press it to flip a toggle. `scroll-only` scrubs on any wheel with no key.
 */
export type ShortcutConfig = {
  key?: string;
  modifier?: "alt" | "shift" | "meta";
  /** fine = 1% of range, normal = step, coarse = 10% of range. */
  mode?: "fine" | "normal" | "coarse";
  interaction?: "scroll" | "drag" | "move" | "scroll-only";
};

/** Keep values (and presets) across reloads. `true` stores under `tunekit:<name>`. */
export type PersistOptions =
  | boolean
  | {
      key?: string;
      storage?: "localStorage" | "sessionStorage";
      presets?: boolean;
    };

/** A preset kept as a file in the repo, e.g. `presets/soft.json` next to the component. */
export type PresetFile = {
  name: string;
  values: Record<string, PaneValue>;
};

/** Receives file presets to write back to disk. The tunekit Vite plugin installs one in dev. */
export type PresetWriter = (write: {
  panelName: string;
  /** Module that declared the panel; files land in a `presets/` folder beside it. */
  source: string | undefined;
  slug: string;
  preset: PresetFile;
}) => void;

export type PanelOptions = {
  persist?: PersistOptions;
  /** Presets loaded from files. Listed before local ones and never stored in localStorage. */
  presets?: PresetFile[];
  shortcuts?: Record<string, ShortcutConfig>;
  /** Module that declared the panel, so Copy and the agent bridge can point at it. */
  source?: string;
};

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export type PaneValue =
  | number
  | boolean
  | string
  | SpringConfig
  | EasingConfig
  | ActionConfig
  | PadValue;

export type PanelState = {
  id: string;
  name: string;
  controls: ControlMeta[];
  values: Record<string, PaneValue>;
  shortcuts: Record<string, ShortcutConfig>;
  source?: string;
};

export type Preset = {
  id: string;
  name: string;
  values: Record<string, PaneValue>;
  /** Backed by a file in the repo rather than localStorage. */
  file?: boolean;
};

// ---------------------------------------------------------------------------
// Shell types
// ---------------------------------------------------------------------------

/** Where the expanded panel rests. The centers are snap targets only; docking always uses a true corner. */
export type Corner =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CollapseOrientation = "horizontal" | "vertical";
/** Magnet points along an edge: either corner end, or the middle. */
export type DockAnchor = "start" | "center" | "end";

export type CollapsedState = {
  corner: Corner;
  orientation: CollapseOrientation;
  /** Where along its edge the handle sits; absent = the corner's end. */
  anchor?: DockAnchor;
};

export type WidgetDimensions = {
  width: number;
  height: number;
  position: { x: number; y: number };
  isFullWidth: boolean;
  isFullHeight: boolean;
};

export type WidgetState = {
  corner: Corner;
  dimensions: WidgetDimensions;
  lastDimensions: WidgetDimensions;
  collapsed: CollapsedState | null;
};

export type TransitionMode = "easing" | "simple" | "advanced";
