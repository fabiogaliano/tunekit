// React adapter
export { usePane, usePaneController } from "./react/usePane.ts";
export type { UsePaneOptions, PaneController } from "./react/usePane.ts";
export { PaneRoot } from "./react/PaneRoot.ts";
export { PaneSlot } from "./react/PaneSlot.tsx";
export { useActiveTab } from "./react/useActiveTab.ts";

// Core store (for programmatic access)
export { PaneStore } from "./store.ts";

// Core mount (for non-React usage)
export { initPane, type InitPaneOptions } from "./mount.ts";
export type { PaneLayout } from "./ui/App.tsx";

// Types
export type {
  SliderConfig,
  ToggleConfig,
  ActionConfig,
  SlotConfig,
  SelectConfig,
  SelectOption,
  ColorConfig,
  TextConfig,
  SpringConfig,
  EasingConfig,
  FolderConfig,
  ControlConfig,
  PaneConfig,
  ResolvedValues,
  TransitionValue,
  PaneValue,
  PanelState,
  Preset,
  Corner,
  ControlMeta,
  ControlType,
  ControlInput,
  SliderTuple,
  ImageConfig,
  ImageOption,
  PadConfig,
  PadAxis,
  PadValue,
  ShortcutConfig,
  PersistOptions,
  PanelOptions,
} from "./types.ts";
