//#region src/types.d.ts
type SliderConfig = {
  type: "slider";
  value: number;
  min: number;
  max: number;
  step?: number;
};
type ToggleConfig = {
  type: "toggle";
  value: boolean;
};
type ActionConfig = {
  type: "action";
  label?: string;
};
type SlotConfig = {
  type: "slot";
  label?: string;
};
type SelectOption = string | {
  value: string;
  label: string;
};
type SelectConfig = {
  type: "select";
  value?: string;
  options: readonly SelectOption[];
};
type ColorConfig = {
  type: "color"; /** Any CSS color; with `gradient`, also a CSS gradient string. */
  value?: string; /** Adds the Gradient tab; the value may then be a `linear/radial/conic-gradient(...)`. */
  gradient?: boolean; /** Background for the contrast badge (it also offers white and black). */
  contrast?: string;
};
type TextConfig = {
  type: "text";
  value?: string;
  placeholder?: string;
};
type SpringConfig = {
  type: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
  visualDuration?: number;
  bounce?: number;
};
type EasingConfig = {
  type: "easing";
  duration: number;
  ease: readonly [number, number, number, number];
};
type TransitionValue = SpringConfig | EasingConfig;
type ImageOption = string | {
  value: string;
  label: string;
};
type ImageConfig = {
  type: "image";
  value?: string;
  options?: readonly ImageOption[];
};
/** [default, min, max, step?] — the same notation as the slider shorthand. */
type PadAxis = readonly [number, number, number, number?];
type PadValue = {
  x: number;
  y: number;
};
type PadConfig = {
  type: "pad"; /** Defaults to [0, -1, 1, 0.01]. */
  x?: PadAxis; /** Positive Y points up. Defaults to [0, -1, 1, 0.01]. */
  y?: PadAxis;
  labels?: {
    x?: string;
    y?: string;
  };
};
type FolderConfig<C extends PaneConfig = PaneConfig> = {
  type: "folder";
  open?: boolean;
  children: C;
};
type ControlConfig = SliderConfig | ToggleConfig | ActionConfig | SlotConfig | SelectConfig | ColorConfig | TextConfig | SpringConfig | EasingConfig | ImageConfig | PadConfig | FolderConfig;
/** `[default, min, max, step?]` shorthand for a slider. */
type SliderTuple = readonly [number, number, number, number?];
/**
 * Anything a config key may hold. Besides explicit `{ type }` controls:
 * a number or tuple → slider, boolean → toggle, string → color (if it parses
 * as a color or CSS gradient) or text, and a plain object → folder
 * (`_collapsed: true` starts it closed).
 */
type ControlInput = ControlConfig | SliderTuple | number | boolean | string | PaneConfig;
interface PaneConfig {
  type?: never;
  [key: string]: ControlInput | undefined;
}
type ResolveControl<T> = T extends number ? number : T extends boolean ? boolean : T extends string ? string : T extends SliderTuple ? number : T extends SliderConfig ? number : T extends ImageConfig ? string : T extends PadConfig ? PadValue : T extends ToggleConfig ? boolean : T extends SelectConfig ? string : T extends ColorConfig ? string : T extends TextConfig ? string : T extends SpringConfig ? TransitionValue : T extends EasingConfig ? TransitionValue : T extends FolderConfig<infer C> ? ResolvedValues<C> : T extends PaneConfig ? ResolvedValues<T> : never;
type ResolvedValues<T extends PaneConfig> = { [K in keyof T as K extends "_collapsed" ? never : T[K] extends ActionConfig | SlotConfig ? never : K]: ResolveControl<T[K]> };
type ControlType = "slider" | "toggle" | "action" | "slot" | "select" | "color" | "text" | "spring" | "easing" | "transition" | "image" | "pad" | "folder";
type ControlMeta = {
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
type ShortcutConfig = {
  key?: string;
  modifier?: "alt" | "shift" | "meta"; /** fine = 1% of range, normal = step, coarse = 10% of range. */
  mode?: "fine" | "normal" | "coarse";
  interaction?: "scroll" | "drag" | "move" | "scroll-only";
};
/** Keep values (and presets) across reloads. `true` stores under `tunekit:<name>`. */
type PersistOptions = boolean | {
  key?: string;
  storage?: "localStorage" | "sessionStorage";
  presets?: boolean;
};
/** A preset kept as a file in the repo, e.g. `presets/soft.json` next to the component. */
type PresetFile = {
  name: string;
  values: Record<string, PaneValue>;
};
/** Receives file presets to write back to disk. The tunekit Vite plugin installs one in dev. */
type PresetWriter = (write: {
  panelName: string; /** Module that declared the panel; files land in a `presets/` folder beside it. */
  source: string | undefined;
  slug: string;
  preset: PresetFile;
}) => void;
type PanelOptions = {
  persist?: PersistOptions; /** Presets loaded from files. Listed before local ones and never stored in localStorage. */
  presets?: PresetFile[];
  shortcuts?: Record<string, ShortcutConfig>; /** Module that declared the panel, so Copy and the agent bridge can point at it. */
  source?: string;
};
type PaneValue = number | boolean | string | SpringConfig | EasingConfig | ActionConfig | PadValue;
type PanelState = {
  id: string;
  name: string;
  controls: ControlMeta[];
  values: Record<string, PaneValue>;
  shortcuts: Record<string, ShortcutConfig>;
  source?: string;
};
type Preset = {
  id: string;
  name: string;
  values: Record<string, PaneValue>; /** Backed by a file in the repo rather than localStorage. */
  file?: boolean;
};
/** Where the expanded panel rests. The centers are snap targets only; docking always uses a true corner. */
type Corner = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
type TransitionMode = "easing" | "simple" | "advanced";
//#endregion
//#region src/store.d.ts
type Listener = () => void;
type ActionListener = (action: string) => void;
declare class PaneStoreClass {
  private panels;
  private listeners;
  private globalListeners;
  private snapshots;
  private actionListeners;
  private presets;
  private activePreset;
  private baseValues;
  private slotNodes;
  private slotListeners;
  private activeTabName;
  private activeTabListeners;
  private defaults;
  private persistTargets;
  private presetWriter;
  private pendingWrites;
  private savedThisSession;
  /** With a writer installed, new presets become files and edits to an active file preset are written back. */
  setPresetWriter(writer: PresetWriter | null): void;
  canWritePresets(): boolean;
  setActiveTab(name: string): void;
  getActiveTab(): string | null;
  subscribeActiveTab(listener: Listener): () => void;
  registerPanel(id: string, name: string, config: PaneConfig, options?: PanelOptions): void;
  updatePanel(id: string, name: string, config: PaneConfig, options?: PanelOptions): void;
  unregisterPanel(id: string): void;
  /**
   * File presets already in memory keep their values: the session is the source of
   * truth, and a file reloading from our own write-back must not undo newer edits.
   */
  private mergeFilePresets;
  private writeFilePreset;
  private scheduleFileWrite;
  updateValue(panelId: string, path: string, value: PaneValue): void;
  /** Write several dot-paths at once with a single notification. */
  updateValues(panelId: string, updates: Record<string, PaneValue>): void;
  /** Restore the config defaults in the active version. */
  resetValues(panelId: string): void;
  getValue(panelId: string, path: string): PaneValue | undefined;
  getValues(panelId: string): Record<string, PaneValue>;
  getDefaults(panelId: string): Record<string, PaneValue>;
  /** Values without action/slot placeholders, which carry config rather than state. */
  getTunableValues(panelId: string): Record<string, PaneValue>;
  /** Values that differ from the config defaults: what a tuning session actually decided. */
  getChangedValues(panelId: string): Record<string, PaneValue>;
  getPanels(): PanelState[];
  getPanel(id: string): PanelState | undefined;
  subscribe(panelId: string, listener: Listener): () => void;
  subscribeGlobal(listener: Listener): () => void;
  setSlotNode(panelId: string, path: string, node: HTMLDivElement | null): void;
  getSlotNode(panelId: string, path: string): HTMLDivElement | null;
  subscribeSlot(panelId: string, path: string, listener: Listener): () => void;
  subscribeActions(panelId: string, listener: ActionListener): () => void;
  triggerAction(panelId: string, path: string): void;
  savePreset(panelId: string, name: string): string;
  loadPreset(panelId: string, presetId: string): void;
  deletePreset(panelId: string, presetId: string): void;
  clearActivePreset(panelId: string): void;
  getPresets(panelId: string): Preset[];
  getActivePresetId(panelId: string): string | null;
  getTransitionMode(panelId: string, path: string): TransitionMode;
  private persistTarget;
  private storage;
  private loadPersisted;
  private persist;
  private notify;
  private notifyGlobal;
}
declare const PaneStore: PaneStoreClass;
//#endregion
//#region src/ui/App.d.ts
type PaneLayout = "tabs" | "stack";
//#endregion
//#region src/mount.d.ts
type InitPaneOptions = {
  /** Initial layout when the user hasn't picked one yet. The first caller wins. */layout?: PaneLayout;
  /**
   * Render the pane inside this element instead of floating over the page:
   * it fills the element's width, with no drag, dock, resize or saved position.
   * Each hosted call is its own mount (not shared with the floating pane or
   * other hosts) and is torn down by the function it returns.
   */
  host?: HTMLElement;
};
declare function initPane(options?: InitPaneOptions): () => void;
//#endregion
export { ShortcutConfig as A, PersistOptions as C, ResolvedValues as D, PresetWriter as E, TextConfig as F, ToggleConfig as I, TransitionValue as L, SliderTuple as M, SlotConfig as N, SelectConfig as O, SpringConfig as P, PanelState as S, PresetFile as T, PadConfig as _, ActionConfig as a, PaneValue as b, ControlInput as c, Corner as d, EasingConfig as f, PadAxis as g, ImageOption as h, PaneStore as i, SliderConfig as j, SelectOption as k, ControlMeta as l, ImageConfig as m, initPane as n, ColorConfig as o, FolderConfig as p, PaneLayout as r, ControlConfig as s, InitPaneOptions as t, ControlType as u, PadValue as v, Preset as w, PanelOptions as x, PaneConfig as y };