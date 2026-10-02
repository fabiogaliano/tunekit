import { createPortal } from "preact/compat";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { PaneStore } from "../store.ts";
import type { Preset as PresetType } from "../types.ts";

type PresetBarProps = {
  panelId: string;
  presets: PresetType[];
  activePresetId: string | null;
  portalContainer: HTMLElement | null;
};

export function PresetBar({ panelId, presets, activePresetId, portalContainer }: PresetBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const hasPresets = presets.length > 0;
  const active = presets.find((p) => p.id === activePresetId);

  const open = useCallback(() => {
    if (!hasPresets) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setIsOpen(true);
  }, [hasPresets]);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      // At document level e.target is retargeted to the shadow host, so look
      // at the composed path to see where the press actually landed.
      const path = e.composedPath();
      if (
        (triggerRef.current && path.includes(triggerRef.current)) ||
        (dropdownRef.current && path.includes(dropdownRef.current))
      ) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);

  const handleSelect = useCallback(
    (presetId: string | null) => {
      if (presetId) PaneStore.loadPreset(panelId, presetId);
      else PaneStore.clearActivePreset(panelId);
      close();
    },
    [panelId, close],
  );

  const handleAdd = useCallback(() => {
    const nextNum = presets.length + 2;
    PaneStore.savePreset(panelId, `Version ${nextNum}`);
  }, [panelId, presets.length]);

  const handleCopy = useCallback(() => {
    const panel = PaneStore.getPanel(panelId);
    const changed = PaneStore.getChangedValues(panelId);
    // Only what was tuned: unchanged values are noise the agent would re-apply as no-ops.
    const hasChanges = Object.keys(changed).length > 0;
    const json = JSON.stringify(hasChanges ? changed : PaneStore.getTunableValues(panelId), null, 2);
    const where = panel?.source ? ` in ${panel.source}` : "";
    const text = hasChanges
      ? `Update the usePane configuration for "${panel?.name ?? panelId}"${where} with these values:\n\n\`\`\`json\n${json}\n\`\`\`\n\nApply these values as the new defaults in the usePane call. Keys are dot-paths into the config; controls not listed are unchanged.`
      : `The usePane configuration for "${panel?.name ?? panelId}"${where} is at its defaults:\n\n\`\`\`json\n${json}\n\`\`\``;
    navigator.clipboard.writeText(text).catch(() => {});
  }, [panelId]);

  return (
    <div class="up-preset-bar">
      <button
        ref={triggerRef}
        class="up-preset-trigger"
        onClick={() => (isOpen ? close() : open())}
      >
        <span>{active ? active.name : "Default"}</span>
        {hasPresets && (
          <svg
            class={`up-select-chevron ${isOpen ? "up-select-chevron-open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 9.5L12 15.5L18 9.5" />
          </svg>
        )}
      </button>

      <button class="up-preset-add" onClick={handleAdd} title="Save preset">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button class="up-copy-btn" onClick={handleCopy} title="Copy for AI">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6C8 4.34 9.34 3 11 3h2c1.66 0 3 1.34 3 3v1H8V6Z" />
          <path d="M16 5h1c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V8c0-1.66 1.34-3 3-3h1" />
        </svg>
      </button>

      {isOpen && portalContainer && createPortal(
        <div
          ref={dropdownRef}
          class="up-preset-dropdown"
          style={{ top: `${pos.top}px`, left: `${pos.left}px`, minWidth: `${pos.width}px` }}
        >
          <div
            class={`up-preset-item ${!activePresetId ? "up-preset-item-active" : ""}`}
            onClick={() => handleSelect(null)}
          >
            <span>Default</span>
          </div>
          {presets.map((preset) => (
            <div
              key={preset.id}
              class={`up-preset-item ${preset.id === activePresetId ? "up-preset-item-active" : ""}`}
              onClick={() => handleSelect(preset.id)}
            >
              <span>{preset.name}</span>
              {!preset.file && (
              <button
                class="up-preset-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  PaneStore.deletePreset(panelId, preset.id);
                }}
                title="Delete"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              )}
            </div>
          ))}
        </div>,
        portalContainer,
      )}
    </div>
  );
}
