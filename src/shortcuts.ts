// Ported from dialkit's shortcut-utils.ts + ShortcutListener.tsx (MIT, see
// vendor/dialkit/LICENSE), rewired to PaneStore.
import { PaneStore } from "./store.ts";
import type { ControlMeta, ShortcutConfig } from "./types.ts";
import { roundValue } from "./vendor/dialkit/numeric.ts";
import { activeElement } from "./vendor/dialkit/shadow.ts";

export const DRAG_SENSITIVITY = 4;

export type ShortcutTarget = {
  panelId: string;
  path: string;
  control: ControlMeta;
  shortcut: ShortcutConfig;
};

export function getEffectiveStep(control: ControlMeta, shortcut: ShortcutConfig): number {
  const range = (control.max ?? 1) - (control.min ?? 0);
  const mode = shortcut.mode ?? "normal";
  return mode === "fine" ? range * 0.01 : mode === "coarse" ? range * 0.1 : (control.step ?? 1);
}

export function applySliderDelta(target: ShortcutTarget, step: number, direction: number): void {
  const { panelId, path, control } = target;
  const current = PaneStore.getValue(panelId, path) as number;
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const next = Math.max(min, Math.min(max, current + direction * step));
  PaneStore.updateValue(panelId, path, roundValue(next, step, min, max));
}

/** Shortcuts pause while typing or while a control itself has focus. */
export function isInputFocused(): boolean {
  const el = activeElement();
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return !!el.closest(
    'select, button, [role="slider"], [role="radio"], [role="listbox"], [role="menu"], [role="menuitem"], [role="button"]',
  );
}

export function getActiveModifier(e: KeyboardEvent | WheelEvent | MouseEvent) {
  if (e.altKey) return "alt" as const;
  if (e.shiftKey) return "shift" as const;
  if (e.metaKey) return "meta" as const;
  return undefined;
}

function findControl(controls: ControlMeta[], path: string): ControlMeta | null {
  for (const c of controls) {
    if (c.path === path) return c;
    const found = c.children && findControl(c.children, path);
    if (found) return found;
  }
  return null;
}

function* allTargets(): Generator<ShortcutTarget> {
  for (const panel of PaneStore.getPanels()) {
    for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
      const control = findControl(panel.controls, path);
      if (control) yield { panelId: panel.id, path, control, shortcut };
    }
  }
}

export function resolveShortcutTarget(
  key: string,
  modifier: "alt" | "shift" | "meta" | undefined,
): ShortcutTarget | null {
  for (const t of allTargets()) {
    if (t.shortcut.key?.toLowerCase() === key.toLowerCase() && t.shortcut.modifier === modifier) return t;
  }
  return null;
}

export function resolveHeldTarget(keys: Set<string>, interaction: string): ShortcutTarget | null {
  for (const key of keys) {
    for (const t of allTargets()) {
      if (t.shortcut.key?.toLowerCase() !== key) continue;
      if ((t.shortcut.interaction ?? "scroll") !== interaction) continue;
      if (t.control.type === "slider") return t;
    }
  }
  return null;
}

export function resolveScrollOnlyTargets(): ShortcutTarget[] {
  return [...allTargets()].filter(
    (t) => t.shortcut.interaction === "scroll-only" && t.control.type === "slider",
  );
}

const MODIFIER_GLYPH = { alt: "⌥", shift: "⇧", meta: "⌘" } as const;

export function formatSliderShortcut(sc: ShortcutConfig): string {
  const action = sc.interaction === "drag" ? "Drag" : sc.interaction === "move" ? "Move" : "Scroll";
  if (!sc.key) return action;
  return `${sc.modifier ? MODIFIER_GLYPH[sc.modifier] : ""}${sc.key.toUpperCase()}+${action}`;
}

export function formatToggleShortcut(sc: ShortcutConfig): string {
  if (!sc.key) return "Press";
  return `${sc.modifier ? MODIFIER_GLYPH[sc.modifier] : ""}${sc.key.toUpperCase()}`;
}
