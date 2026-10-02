import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { formatToggleShortcut } from "../shortcuts.ts";
import type { ShortcutConfig } from "../types.ts";
import { optionKeyIndex } from "../vendor/dialkit/control-keyboard.ts";

// ---------------------------------------------------------------------------
// Toggle (segmented On/Off)
// ---------------------------------------------------------------------------

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  shortcut?: ShortcutConfig;
  shortcutActive?: boolean;
};

export function Toggle({ label, checked, onChange, shortcut, shortcutActive }: ToggleProps) {
  return (
    <div class="up-labeled-row">
      <span class="up-labeled-row-label">
        {label}
        {shortcut && (
          <span class={`dialkit-shortcut-pill${shortcutActive ? " dialkit-shortcut-pill-active" : ""}`}>
            {formatToggleShortcut(shortcut)}
          </span>
        )}
      </span>
      <SegmentedControl
        options={[
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ]}
        value={checked ? "on" : "off"}
        onChange={(v) => onChange(v === "on")}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented Control (shared by Toggle, TransitionControl mode picker)
// ---------------------------------------------------------------------------

type SegOption = { value: string; label: string };

type SegmentedControlProps = {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
};

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const btn = btnRefs.current.get(value);
    const container = containerRef.current;
    if (btn && container) {
      const cr = container.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      setPillStyle({ left: br.left - cr.left, width: br.width });
    }
  }, [value]);

  // Roving focus: one tab stop, arrows move and select (radio-group pattern).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const index = options.findIndex((o) => o.value === value);
    const next = optionKeyIndex(e.key, index, options.length, true);
    if (next === undefined) return;
    e.preventDefault();
    const opt = options[next]!;
    onChange(opt.value);
    btnRefs.current.get(opt.value)?.focus({ preventScroll: true });
  };

  return (
    <div ref={containerRef} class="up-seg" role="radiogroup" onKeyDown={onKeyDown}>
      {pillStyle && (
        <div
          class="up-seg-pill"
          style={{ left: `${pillStyle.left}px`, width: `${pillStyle.width}px` }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => {
            if (el) btnRefs.current.set(opt.value, el);
          }}
          class={`up-seg-btn ${value === opt.value ? "up-seg-btn-active" : ""}`}
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action button
// ---------------------------------------------------------------------------

type ActionProps = {
  label: string;
  onClick: () => void;
};

export function Action({ label, onClick }: ActionProps) {
  return (
    <button class="up-action" onClick={onClick}>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Text input
// ---------------------------------------------------------------------------

type TextInputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function TextInput({ label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div class="up-text-row">
      <span class="up-text-label">{label}</span>
      <input
        type="text"
        class="up-text-input"
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        spellcheck={false}
      />
    </div>
  );
}
