import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import {
  formatOf,
  formatSolid,
  gradientCss,
  gradientFromHexes,
  isGradient,
  parseGradient,
  parseSolid,
  toHex,
  type ColorFormat,
  type Gradient,
  type Hsva,
} from "../../color/model.ts";
import { getDropdownPosition, observeDropdownPosition } from "../../vendor/dialkit/dropdown-position.ts";
import { containWheel } from "../containWheel.ts";
import { ColorEditor, nextFormat } from "./ColorEditor.tsx";
import { GradientEditor } from "./GradientEditor.tsx";
import {
  CuratedSections,
  JapaneseGradientsSection,
  SavedSection,
  TraditionalSection,
  UiGradientsSection,
  WadaSection,
} from "./Library.tsx";

type Tab = "solid" | "gradient" | "library";

type ColorControlProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  portalContainer: HTMLElement | null;
  /** Allow the Gradient tab; the value may then be a CSS gradient string. */
  gradient?: boolean;
  /** Background for the contrast badge, tried before white and black. */
  contrast?: string;
};

const POPOVER_WIDTH = 288;
const FALLBACK: Hsva = { h: 0, s: 0, v: 0, a: 1 };

const TAB_ICONS: Record<Tab, preact.JSX.Element> = {
  solid: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" /></svg>,
  gradient: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" opacity=".6" />
      <rect x="4" y="13" width="7" height="7" rx="2" opacity=".6" />
      <rect x="13" y="13" width="7" height="7" rx="2" opacity=".35" />
    </svg>
  ),
};

export function ColorControl({ label, value, onChange, portalContainer, gradient, contrast }: ColorControlProps) {
  const allowGradient = !!gradient || isGradient(value);
  const rowRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [solid, setSolid] = useState<Hsva>(() => (isGradient(value) ? null : parseSolid(value)) ?? FALLBACK);
  const [grad, setGrad] = useState<Gradient>(() => parseGradient(value) ?? gradientFromHexes(["#0F2540", "#8B81C3", "#FEDFE1"]));
  const [sel, setSel] = useState(0);
  const [format, setFormat] = useState<ColorFormat>(() => formatOf(value));
  const [tab, setTab] = useState<Tab>(() => (isGradient(value) ? "gradient" : "solid"));
  const [draft, setDraft] = useState<string | null>(null);
  // Values we emitted come back as props; only foreign changes should reset local state.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (isGradient(value)) {
      const g = parseGradient(value);
      if (g) setGrad(g);
    } else {
      const c = parseSolid(value, solid.h);
      if (c) setSolid(c);
      setFormat(formatOf(value));
    }
  }, [value]);

  const emit = (next: string) => {
    lastEmitted.current = next;
    onChange(next);
  };
  const emitSolid = (c: Hsva, f = format) => {
    setSolid(c);
    emit(formatSolid(c, f));
  };
  const emitGradient = (g: Gradient, nextSel = sel) => {
    setGrad(g);
    setSel(nextSel);
    emit(gradientCss(g));
  };

  const pickColor = (hex: string) => {
    emitSolid({ ...(parseSolid(hex, solid.h) ?? FALLBACK), a: 1 });
    setTab("solid");
  };
  const pickGradient = (css: string) => {
    const g = parseGradient(css);
    if (!g) return;
    emitGradient(g, 0);
    setTab("gradient");
  };
  const pickSaved = (v: string) => (isGradient(v) ? pickGradient(v) : pickColor(v));

  const switchTab = (next: Tab) => {
    setTab(next);
    // Leaving a gradient keeps the stop being edited, not whatever solid was last set.
    if (next === "solid" && isGradient(value)) emitSolid({ ...grad.stops[Math.min(sel, grad.stops.length - 1)]!.color });
    if (next === "gradient" && !isGradient(value)) emitGradient(grad);
  };
  const cycleFormat = () => {
    const f = nextFormat(format);
    setFormat(f);
    if (!isGradient(value)) emitSolid(solid, f);
  };

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) swatchRef.current?.focus({ preventScroll: true });
  }, []);

  // Position beside the panel, tracking the row as the panel scrolls or moves.
  useLayoutEffect(() => {
    if (!open || !portalContainer) return;
    const row = rowRef.current!;
    const update = () => {
      const pop = popRef.current;
      if (!pop) return;
      const p = getDropdownPosition(row, portalContainer, {
        dropdownHeight: pop.scrollHeight + 2,
        width: POPOVER_WIDTH,
        maxHeight: 640,
        preferSide: true,
        fixed: true,
        gap: 8,
      });
      Object.assign(pop.style, {
        left: `${p.left}px`,
        top: `${p.top}px`,
        width: `${p.width}px`,
        maxHeight: `${p.maxHeight}px`,
        transformOrigin: p.above ? "bottom" : "top",
      });
    };
    const stop = observeDropdownPosition(row, update, () => popRef.current);
    const outside = (e: PointerEvent) => {
      const path = e.composedPath();
      if (!path.includes(popRef.current!) && !path.includes(row)) close();
    };
    // Focus often stays on the page while picking (swatches aren't focusable), so listen globally.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, portalContainer, close]);

  const isGrad = isGradient(value);
  const solidHex = toHex({ ...solid, a: 1 });
  const contrastWith = [...new Set([contrast, "#ffffff", "#000000"].filter((c): c is string => !!c))];
  const tabs: Tab[] = allowGradient ? ["solid", "gradient", "library"] : ["solid", "library"];

  return (
    <div ref={rowRef} class="dialkit-color-control" data-open={open ? "true" : undefined}>
      <span class="dialkit-color-label">{label}</span>
      <div class="dialkit-color-inputs">
        <input
          class="dialkit-color-value"
          spellcheck={false}
          aria-label={`${label} color value`}
          value={draft ?? value}
          title={value}
          onFocus={() => setDraft(value)}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={() => {
            const text = draft?.trim() ?? "";
            setDraft(null);
            if (!text || text === value) return;
            if (isGradient(text) ? allowGradient && parseGradient(text) : parseSolid(text)) {
              lastEmitted.current = "";
              onChange(text);
            }
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(value);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          ref={swatchRef}
          type="button"
          class="dialkit-color-swatch up-cp-swatch"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Pick ${label.toLowerCase()} color`}
          // A plain color can't be layered over the checkerboard; wrap it as an image layer.
          style={{ "--up-swatch": isGrad ? value : `linear-gradient(${value}, ${value})` }}
          onClick={() => setOpen(!open)}
        />
      </div>

      {open &&
        portalContainer &&
        createPortal(
          <div
            ref={popRef}
            class="up-cp-pop"
            onWheel={containWheel}
            role="dialog"
            aria-label={`${label} color picker`}
            style={{ position: "fixed" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close(true);
              }
              e.stopPropagation();
            }}
          >
            <div class="up-cp-tabs" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  class={`up-cp-tab ${tab === t ? "up-cp-tab-on" : ""}`}
                  onClick={() => switchTab(t)}
                >
                  {TAB_ICONS[t]}
                  {t[0]!.toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "solid" && (
              <>
                <ColorEditor
                  color={solid}
                  onChange={(c) => emitSolid(c)}
                  format={format}
                  onFormat={cycleFormat}
                  classic
                  contrastWith={contrastWith}
                />
                <SavedSection kind="solid" current={formatSolid(solid, format)} onPick={pickSaved} />
                <TraditionalSection selected={isGrad ? "" : solidHex} onColor={pickColor} defaultOpen />
              </>
            )}

            {tab === "gradient" && (
              <>
                <GradientEditor gradient={grad} selected={sel} onChange={emitGradient} format={format} onFormat={() => setFormat(nextFormat(format))} />
                <SavedSection kind="gradient" current={gradientCss(grad)} onPick={pickSaved} />
                <JapaneseGradientsSection onGradient={pickGradient} />
              </>
            )}

            {tab === "library" && (
              <>
                {allowGradient && <JapaneseGradientsSection onGradient={pickGradient} defaultOpen />}
                <TraditionalSection selected={isGrad ? "" : solidHex} onColor={pickColor} defaultOpen={!allowGradient} />
                <WadaSection onColor={pickColor} onGradient={allowGradient ? pickGradient : undefined} />
                {allowGradient && <UiGradientsSection onGradient={pickGradient} />}
                <CuratedSections onColor={pickColor} onGradient={allowGradient ? pickGradient : undefined} />
              </>
            )}
          </div>,
          portalContainer,
        )}
    </div>
  );
}
