import { A as ShortcutConfig, C as PersistOptions, D as ResolvedValues, E as PresetWriter, F as TextConfig, I as ToggleConfig, L as TransitionValue, M as SliderTuple, N as SlotConfig, O as SelectConfig, P as SpringConfig, S as PanelState, T as PresetFile, _ as PadConfig, a as ActionConfig, b as PaneValue, c as ControlInput, d as Corner, f as EasingConfig, g as PadAxis, h as ImageOption, i as PaneStore, j as SliderConfig, k as SelectOption, l as ControlMeta, m as ImageConfig, n as initPane, o as ColorConfig, p as FolderConfig, r as PaneLayout, s as ControlConfig, t as InitPaneOptions, u as ControlType, v as PadValue, w as Preset, x as PanelOptions, y as PaneConfig } from "./mount-DLIBAnFT.mjs";
import * as react from "react";
import { ReactNode, ReactPortal } from "react";

//#region src/react/usePane.d.ts
type UsePaneOptions = {
  /** Stable panel id; defaults to one derived from `name` + React's useId. */id?: string;
  onAction?: (path: string) => void;
  persist?: PersistOptions; /** Presets kept as files, e.g. `Object.values(import.meta.glob("./presets/*.json", { eager: true, import: "default" }))`. */
  presets?: PresetFile[]; /** Keyboard/scroll shortcuts by dot-path, e.g. `{ "blur.radius": { key: "b" } }`. */
  shortcuts?: Record<string, ShortcutConfig>;
};
type PaneController<T extends PaneConfig> = {
  /** The id registered with PaneStore, for programmatic access. */id: string;
  values: ResolvedValues<T>;
  getValues: () => ResolvedValues<T>;
  setValue: (path: string, value: PaneValue) => void; /** Nested partial in the same shape as `values`. */
  setValues: (values: Record<string, unknown>) => void;
  resetValues: () => void;
};
declare function usePane<const T extends PaneConfig>(name: string, config: T, options?: UsePaneOptions): ResolvedValues<T>;
declare function usePaneController<const T extends PaneConfig>(name: string, config: T, options?: UsePaneOptions): PaneController<T>;
//#endregion
//#region src/react/PaneRoot.d.ts
type PaneRootProps = {
  children?: ReactNode; /** Initial layout with several panels: one tab each, or all stacked on one page. */
  layout?: PaneLayout; /** Render in production builds too. Off by default, so a forgotten root never ships. */
  productionEnabled?: boolean;
};
declare function PaneRoot(props: PaneRootProps): ReactPortal | null;
//#endregion
//#region src/react/PaneSlot.d.ts
type PaneSlotProps = {
  panel: string;
  path: string;
  children?: ReactNode;
};
declare function PaneSlot({
  panel,
  path,
  children
}: PaneSlotProps): react.ReactPortal | null;
//#endregion
//#region src/react/useActiveTab.d.ts
declare function useActiveTab(): string | null;
//#endregion
export { type ActionConfig, type ColorConfig, type ControlConfig, type ControlInput, type ControlMeta, type ControlType, type Corner, type EasingConfig, type FolderConfig, type ImageConfig, type ImageOption, type InitPaneOptions, type PadAxis, type PadConfig, type PadValue, type PaneConfig, type PaneController, type PaneLayout, PaneRoot, PaneSlot, PaneStore, type PaneValue, type PanelOptions, type PanelState, type PersistOptions, type Preset, type PresetFile, type PresetWriter, type ResolvedValues, type SelectConfig, type SelectOption, type ShortcutConfig, type SliderConfig, type SliderTuple, type SlotConfig, type SpringConfig, type TextConfig, type ToggleConfig, type TransitionValue, type UsePaneOptions, initPane, useActiveTab, usePane, usePaneController };