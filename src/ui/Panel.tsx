import { PaneStore } from "../store.ts";
import type {
  ControlMeta,
  EasingConfig,
  PadValue,
  PaneValue,
  PanelState,
  SpringConfig,
} from "../types.ts";
import { Action, TextInput, Toggle } from "./Controls.tsx";
import { Folder } from "./Folder.tsx";
import { Select } from "./Select.tsx";
import { Slider } from "./Slider.tsx";
import { Slot } from "./Slot.tsx";
import { TransitionControl } from "./Transition.tsx";
import { ColorControl } from "./color/ColorControl.tsx";
import { DialPad, ImageControl } from "./Vendor.tsx";

type PanelProps = {
  panel: PanelState;
  values: Record<string, PaneValue>;
  portalContainer: HTMLElement | null;
  /** Path whose shortcut key is currently held, to highlight it. */
  activeShortcutPath: string | null;
};

export function Panel({ panel, values, portalContainer, activeShortcutPath }: PanelProps) {
  const renderControl = (control: ControlMeta) => {
    const value = values[control.path];
    const set = (v: PaneValue) => PaneStore.updateValue(panel.id, control.path, v);
    const shortcutActive = activeShortcutPath === control.path;

    switch (control.type) {
      case "slider":
        return (
          <Slider
            key={control.path}
            label={control.label}
            value={value as number}
            onChange={(v) => PaneStore.updateValue(panel.id, control.path, v)}
            min={control.min ?? 0}
            max={control.max ?? 100}
            step={control.step ?? 1}
            shortcut={control.shortcut}
            shortcutActive={shortcutActive}
          />
        );

      case "toggle":
        return (
          <Toggle
            key={control.path}
            label={control.label}
            checked={value as boolean}
            onChange={(v) => PaneStore.updateValue(panel.id, control.path, v)}
            shortcut={control.shortcut}
            shortcutActive={shortcutActive}
          />
        );

      case "action":
        return (
          <Action
            key={control.path}
            label={control.label}
            onClick={() => PaneStore.triggerAction(panel.id, control.path)}
          />
        );

      case "slot":
        return (
          <Slot
            key={control.path}
            panelId={panel.id}
            path={control.path}
            label={control.label}
          />
        );

      case "select":
        return (
          <Select
            key={control.path}
            label={control.label}
            value={value as string}
            options={control.options ?? []}
            onChange={(v) => PaneStore.updateValue(panel.id, control.path, v)}
            portalContainer={portalContainer}
          />
        );

      case "text":
        return (
          <TextInput
            key={control.path}
            label={control.label}
            value={value as string}
            onChange={(v) => PaneStore.updateValue(panel.id, control.path, v)}
            placeholder={control.placeholder}
          />
        );

      case "color":
        return (
          <ColorControl
            key={control.path}
            label={control.label}
            value={value as string}
            onChange={set}
            portalContainer={portalContainer}
            gradient={control.gradient}
            contrast={control.contrast}
          />
        );

      case "image":
        return (
          <ImageControl
            key={control.path}
            label={control.label}
            value={value as string}
            options={control.options}
            onChange={set}
          />
        );

      case "pad":
        return (
          <DialPad
            key={control.path}
            label={control.label}
            value={value as PadValue}
            x={control.pad?.x}
            y={control.pad?.y}
            labels={control.pad?.labels}
            onChange={set}
          />
        );

      case "transition":
        return (
          <TransitionControl
            key={control.path}
            label={control.label}
            value={value as SpringConfig | EasingConfig}
            onChange={(v) => PaneStore.updateValue(panel.id, control.path, v)}
          />
        );

      case "folder":
        return (
          <Folder
            key={control.path}
            title={control.label}
            defaultOpen={control.defaultOpen}
          >
            {control.children?.map(renderControl)}
          </Folder>
        );

      default:
        return null;
    }
  };

  return (
    <div class="up-panel-section">{panel.controls.map(renderControl)}</div>
  );
}
