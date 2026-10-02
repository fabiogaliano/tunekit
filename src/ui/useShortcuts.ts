import { useEffect, useRef, useState } from "preact/hooks";
import {
  applySliderDelta,
  DRAG_SENSITIVITY,
  getActiveModifier,
  getEffectiveStep,
  isInputFocused,
  resolveHeldTarget,
  resolveScrollOnlyTargets,
  resolveShortcutTarget,
} from "../shortcuts.ts";
import { PaneStore } from "../store.ts";

export type ActiveShortcut = { panelId: string; path: string } | null;

/** Window-level shortcut handling (dialkit's ShortcutListener, as a hook). */
export function useShortcuts(): ActiveShortcut {
  const [active, setActive] = useState<ActiveShortcut>(null);
  const keys = useRef(new Set<string>());
  const dragging = useRef(false);
  const lastX = useRef<number | null>(null);
  const acc = useRef(0);

  useEffect(() => {
    const resetPointer = () => {
      dragging.current = false;
      lastX.current = null;
      acc.current = 0;
    };

    const scrubBy = (dx: number, interaction: "drag" | "move") => {
      const target = resolveHeldTarget(keys.current, interaction);
      if (!target) return false;
      acc.current += dx;
      const steps = Math.trunc(acc.current / DRAG_SENSITIVITY);
      if (steps !== 0) {
        acc.current -= steps * DRAG_SENSITIVITY;
        applySliderDelta(target, getEffectiveStep(target.control, target.shortcut), steps);
      }
      return true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const key = e.key.toLowerCase();

      if (key.startsWith("arrow") && keys.current.size > 0) {
        const target =
          resolveHeldTarget(keys.current, "scroll") ??
          resolveHeldTarget(keys.current, "drag") ??
          resolveHeldTarget(keys.current, "move");
        if (target) {
          e.preventDefault();
          const dir = key === "arrowright" || key === "arrowup" ? 1 : -1;
          applySliderDelta(target, getEffectiveStep(target.control, target.shortcut), dir);
          return;
        }
      }

      const held = keys.current.has(key);
      keys.current.add(key);
      const target = resolveShortcutTarget(key, getActiveModifier(e));
      if (target) {
        setActive({ panelId: target.panelId, path: target.path });
        if (!held && target.control.type === "toggle") {
          const v = PaneStore.getValue(target.panelId, target.path) as boolean;
          PaneStore.updateValue(target.panelId, target.path, !v);
        }
      }
      if (!held) resetPointer();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      resetPointer();
      let next: ActiveShortcut = null;
      for (const k of keys.current) {
        const t = resolveShortcutTarget(k, getActiveModifier(e));
        if (t) {
          next = { panelId: t.panelId, path: t.path };
          break;
        }
      }
      setActive(next);
    };

    const onWheel = (e: WheelEvent) => {
      if (isInputFocused()) return;
      const modifier = getActiveModifier(e);
      for (const key of keys.current) {
        const t = resolveShortcutTarget(key, modifier);
        if (!t || t.control.type !== "slider" || (t.shortcut.interaction ?? "scroll") !== "scroll") continue;
        e.preventDefault();
        applySliderDelta(t, getEffectiveStep(t.control, t.shortcut), e.deltaY > 0 ? -1 : 1);
        return;
      }
      const [t] = resolveScrollOnlyTargets();
      if (t) {
        e.preventDefault();
        applySliderDelta(t, getEffectiveStep(t.control, t.shortcut), e.deltaY > 0 ? -1 : 1);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isInputFocused() || keys.current.size === 0) return;
      if (resolveHeldTarget(keys.current, "drag")) {
        dragging.current = true;
        lastX.current = e.clientX;
        acc.current = 0;
        e.preventDefault();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isInputFocused() || keys.current.size === 0) return;
      const interaction = dragging.current ? "drag" : "move";
      if (lastX.current === null) {
        lastX.current = e.clientX;
        return;
      }
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      if (!scrubBy(dx, interaction)) acc.current = 0;
    };

    const onBlur = () => {
      keys.current.clear();
      resetPointer();
      setActive(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", resetPointer);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", resetPointer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return active;
}
