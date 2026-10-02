import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { normalizeSelectOptions } from "../config.ts";
import type { SelectOption } from "../types.ts";

type SelectProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (v: string) => void;
  portalContainer: HTMLElement | null;
};

type MenuPos = { top: number; left: number; width: number; above: boolean };

const WHEEL_THROTTLE_MS = 90;
let nextId = 0;

/**
 * A select built for comparing options, not just picking one:
 * - open: hovering or arrowing through options previews them live; click or
 *   Enter commits, Esc / leaving the menu / clicking outside reverts;
 * - closed: ‹ › buttons, ←/→ while focused or hovered, and horizontal wheel
 *   step through options and commit immediately.
 */
export function Select({ label, value, options, onChange, portalContainer }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const lastWheel = useRef(0);
  // Value to restore when a preview is abandoned.
  const committed = useRef(value);
  const idRef = useRef(`up-select-${++nextId}`);

  const normalized = normalizeSelectOptions(options);
  const index = normalized.findIndex((o) => o.value === value);
  const selected = normalized[index];

  if (!isOpen) committed.current = value;

  const step = useCallback(
    (dir: number) => {
      if (!normalized.length) return;
      const from = index < 0 ? 0 : index;
      const next = normalized[(from + dir + normalized.length) % normalized.length]!;
      onChange(next.value);
    },
    [normalized, index, onChange],
  );

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = 8 + normalized.length * 34;
    const spaceBelow = window.innerHeight - rect.bottom - 4;
    const above = spaceBelow < menuHeight && rect.top > menuHeight;
    setPos({ top: above ? rect.top - 4 : rect.bottom + 4, left: rect.left, width: rect.width, above });
  }, [normalized.length]);

  const open = useCallback(() => {
    committed.current = value;
    setHighlight(index);
    setIsOpen(true);
  }, [value, index]);

  const close = useCallback(
    (commit: string | null) => {
      setIsOpen(false);
      const target = commit ?? committed.current;
      if (target !== value) onChange(target);
      committed.current = target;
    },
    [value, onChange],
  );

  const preview = useCallback(
    (i: number) => {
      setHighlight(i);
      const opt = normalized[i];
      if (opt && opt.value !== value) onChange(opt.value);
    },
    [normalized, value, onChange],
  );

  useEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    updatePos();
    const scroller = triggerRef.current?.closest(".up-content");
    scroller?.addEventListener("scroll", updatePos, { passive: true });
    window.addEventListener("resize", updatePos);
    return () => {
      scroller?.removeEventListener("scroll", updatePos);
      window.removeEventListener("resize", updatePos);
    };
  }, [isOpen, updatePos]);

  // ←/→ cycle while the pointer rests on the row, even if focus is elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hovered.current || isOpen || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = (e.composedPath()[0] as HTMLElement | undefined)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, step]);

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    if (!isOpen) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    const count = normalized.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const from = highlight < 0 ? index : highlight;
      preview((from + (e.key === "ArrowDown" ? 1 : -1) + count) % count);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      preview(e.key === "Home" ? 0 : count - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      close(normalized[highlight]?.value ?? null);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close(null);
    }
  };

  // Sideways swipes only: vertical wheel must keep scrolling the panel.
  const onWheel = (e: WheelEvent) => {
    if (isOpen || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 2) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel.current < WHEEL_THROTTLE_MS) return;
    lastWheel.current = now;
    step(e.deltaX > 0 ? 1 : -1);
  };

  // A count rather than dots, so it stays short however many options there are.
  const showPosition = normalized.length > 1 && index >= 0;
  const menuId = `${idRef.current}-menu`;

  return (
    <div>
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-activedescendant={isOpen && highlight >= 0 ? `${idRef.current}-${highlight}` : undefined}
        class={`up-select-trigger ${isOpen ? "up-select-trigger-open" : ""}`}
        onMouseEnter={() => (hovered.current = true)}
        onMouseLeave={() => (hovered.current = false)}
        onMouseDown={(e) => {
          if ((e.target as Element).closest(".up-select-step")) return;
          // Native mouse focus (no preventDefault) keeps :focus-visible off for pointer users.
          if (isOpen) close(null);
          else open();
        }}
        onKeyDown={onTriggerKeyDown}
        onWheel={onWheel}
      >
        <span class="up-select-label">{label}</span>
        <div class="up-select-right">
          <span class="up-select-current">
            <span class="up-select-value">{selected?.label ?? value}</span>
            {showPosition && (
              <span class="up-select-pos" aria-hidden="true">
                · {index + 1}
              </span>
            )}
          </span>
          <span class="up-select-steps">
            <button
              type="button"
              class="up-select-step"
              tabIndex={-1}
              aria-label={`Previous ${label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => step(-1)}
            >
              <svg viewBox="0 0 24 24"><path d="M14.5 6L8.5 12L14.5 18" /></svg>
            </button>
            <button
              type="button"
              class="up-select-step"
              tabIndex={-1}
              aria-label={`Next ${label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => step(1)}
            >
              <svg viewBox="0 0 24 24"><path d="M9.5 6L15.5 12L9.5 18" /></svg>
            </button>
          </span>
        </div>
      </div>

      {isOpen &&
        pos &&
        portalContainer &&
        createPortal(
          <>
            <div
              class="up-overlay-backdrop"
              onMouseDown={(e) => {
                e.preventDefault();
                close(null);
              }}
            />
            <div
              id={menuId}
              role="listbox"
              aria-label={label}
              class="up-select-dropdown"
              onMouseDown={(e) => e.preventDefault()}
              onMouseLeave={() => {
                setHighlight(normalized.findIndex((o) => o.value === committed.current));
                if (value !== committed.current) onChange(committed.current);
              }}
              style={{
                left: `${pos.left}px`,
                width: `${pos.width}px`,
                ...(pos.above
                  ? { bottom: `${window.innerHeight - pos.top}px` }
                  : { top: `${pos.top}px` }),
              }}
            >
              {normalized.map((opt, i) => (
                <div
                  key={opt.value}
                  id={`${idRef.current}-${i}`}
                  role="option"
                  aria-selected={opt.value === committed.current}
                  class={[
                    "up-select-option",
                    opt.value === committed.current ? "up-select-option-selected" : "",
                    i === highlight ? "up-select-option-highlight" : "",
                  ].join(" ")}
                  onMouseEnter={() => preview(i)}
                  onClick={() => close(opt.value)}
                >
                  <span>{opt.label}</span>
                  {opt.value === committed.current && <span class="up-select-check" />}
                </div>
              ))}
            </div>
          </>,
          portalContainer,
        )}
    </div>
  );
}
