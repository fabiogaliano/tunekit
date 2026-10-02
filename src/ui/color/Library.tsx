import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { CLASSIC, WAGRAD, WAIRO } from "../../color/data/japanese.ts";
import { UIGRADIENTS } from "../../color/data/uigradients.ts";
import { WADA } from "../../color/data/wada.ts";
import { gradientCss, gradientFromHexes, parseSolid, toOklch } from "../../color/model.ts";
import { SavedColors, useSavedColors } from "../../color/saved.ts";
import { Dot } from "./ColorEditor.tsx";

const CHEVRON = <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>;

type SectionProps = {
  title: string;
  jp?: string;
  count?: number;
  defaultOpen?: boolean;
  /** Short sections skip the scroll box so chip badges can overflow. */
  free?: boolean;
  children: () => ComponentChildren;
};

/** Collapsible; the body renders on first open so a closed picker stays cheap. */
export function Section({ title, jp, count, defaultOpen = false, free, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [built, setBuilt] = useState(defaultOpen);
  return (
    <div class="up-cp-sect">
      <button
        type="button"
        class={`up-cp-sect-head ${open ? "up-cp-sect-open" : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setBuilt(true);
        }}
      >
        {title}
        {jp && <span class="up-cp-sect-jp">{jp}</span>}
        {count !== undefined && <span class="up-cp-sect-n">{count}</span>}
        {CHEVRON}
      </button>
      {built && (
        <div class={`up-cp-sect-body ${free ? "up-cp-sect-free" : ""}`} hidden={!open}>
          {children()}
        </div>
      )}
    </div>
  );
}

type ChipProps = { background: string; title: string; label?: string; onPick: () => void; onRemove?: () => void };

function Chip({ background, title, label, onPick, onRemove }: ChipProps) {
  return (
    <div
      class="up-cp-chip"
      role="button"
      tabIndex={0}
      title={title}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      onContextMenu={
        onRemove &&
        ((e) => {
          e.preventDefault();
          onRemove();
        })
      }
    >
      <b style={{ background }} />
      {label && <span class="up-cp-chip-label">{label}</span>}
      {onRemove && (
        <button
          type="button"
          class="up-cp-chip-x"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- sections

type Pick = { onColor: (hex: string) => void; onGradient?: (css: string) => void };

export function SavedSection({ kind, current, onPick }: { kind: "solid" | "gradient"; current: string; onPick: (value: string) => void }) {
  const items = useSavedColors().filter((i) => i.kind === kind);
  return (
    <Section title="Saved" defaultOpen free>
      {() => (
        <div class={`up-cp-chips ${kind === "gradient" ? "up-cp-chips-wide" : ""}`}>
          {items.map((item) => (
            <Chip
              key={item.value}
              background={item.value}
              title={item.value}
              onPick={() => onPick(item.value)}
              onRemove={() => SavedColors.remove(item.value)}
            />
          ))}
          <button
            type="button"
            class="up-cp-chip up-cp-chip-add"
            title={kind === "solid" ? "Save current color" : "Save current gradient"}
            onClick={() => SavedColors.add({ kind, value: current })}
          >
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      )}
    </Section>
  );
}

// Each traditional color joins the classic hue it is closest to (OKLCH hue),
// lightest first, so a column reads as tints and shades of the classic swatch.
const NEUTRAL_CHROMA = 0.025;
const BY_HUE = (() => {
  const hues = CLASSIC.map(([, hex]) => toOklch(parseSolid(hex)!)[2]);
  const columns: [number, string][][] = CLASSIC.map(() => []);
  const neutrals: [number, string][] = [];
  for (const [, , hex] of WAIRO) {
    const [l, c, h] = toOklch(parseSolid(hex)!);
    if (c < NEUTRAL_CHROMA) {
      neutrals.push([l, hex]);
      continue;
    }
    const dist = (a: number) => Math.min(Math.abs(a - h), 360 - Math.abs(a - h));
    const k = hues.reduce((best, hue, i) => (dist(hue) < dist(hues[best]!) ? i : best), 0);
    columns[k]!.push([l, hex]);
  }
  const byLightness = (a: [number, string], b: [number, string]) => b[0] - a[0];
  columns.forEach((col) => col.sort(byLightness));
  neutrals.sort(byLightness);
  const rows = Math.max(...columns.map((c) => c.length));
  const grid: (string | null)[] = [];
  for (let r = 0; r < rows; r++) for (const col of columns) grid.push(col[r]?.[1] ?? null);
  return { grid, neutrals: neutrals.map(([, hex]) => hex) };
})();

export function TraditionalSection({ selected, onColor, defaultOpen }: { selected: string; onColor: (hex: string) => void; defaultOpen?: boolean }) {
  return (
    <Section title="Traditional colors" jp="日本の伝統色" count={WAIRO.length} defaultOpen={defaultOpen}>
      {() => (
        <>
          <div class="up-cp-dots">
            {BY_HUE.grid.map((hex, i) => (hex ? <Dot key={hex} hex={hex} title={hex} selected={selected} onPick={onColor} /> : <span key={`gap-${i}`} />))}
          </div>
          <div class="up-cp-dots-label">Neutrals</div>
          <div class="up-cp-dots">
            {BY_HUE.neutrals.map((hex) => (
              <Dot key={hex} hex={hex} title={hex} selected={selected} onPick={onColor} />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

const WAGRAD_CSS = () => WAGRAD.map(([name, kanji, hexes]) => [name, kanji, gradientCss(gradientFromHexes(hexes))] as const);

export function JapaneseGradientsSection({ onGradient, defaultOpen }: { onGradient: (css: string) => void; defaultOpen?: boolean }) {
  return (
    <Section title="Japanese gradients" jp="和" count={WAGRAD.length} defaultOpen={defaultOpen}>
      {() => (
        <div class="up-cp-chips up-cp-chips-wide">
          {WAGRAD_CSS().map(([name, kanji, css]) => (
            <Chip key={name + kanji} background={css} title={`${name} ${kanji}`} label={kanji} onPick={() => onGradient(css)} />
          ))}
        </div>
      )}
    </Section>
  );
}

export function WadaSection({ onColor, onGradient }: Pick) {
  return (
    <Section title="Wada combinations" jp="配色事典" count={WADA.k.length}>
      {() => (
        <div class="up-cp-combos">
          {WADA.k.map((indexes, n) => (
            <div key={n} class="up-cp-combo">
              <span class="up-cp-combo-no">{n + 1}</span>
              <div class="up-cp-combo-strip">
                {indexes.map((i) => {
                  const [name, hex] = WADA.c[i]!;
                  return <i key={i} style={{ background: hex }} title={`${name} · ${hex}`} onClick={() => onColor(hex)} />;
                })}
              </div>
              {onGradient && (
                <button
                  type="button"
                  title="Use as gradient"
                  onClick={() => onGradient(gradientCss(gradientFromHexes(indexes.map((i) => WADA.c[i]![1]))))}
                >
                  ⇢
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function UiGradientsSection({ onGradient }: { onGradient: (css: string) => void }) {
  return (
    <Section title="uiGradients" count={UIGRADIENTS.length}>
      {() => <UiGradientsBody onGradient={onGradient} />}
    </Section>
  );
}

function UiGradientsBody({ onGradient }: { onGradient: (css: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  return (
    <>
      <input
        class="up-cp-search"
        placeholder={`Search ${UIGRADIENTS.length} gradients…`}
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div class="up-cp-chips up-cp-chips-wide">
        {UIGRADIENTS.filter(([name]) => name.toLowerCase().includes(q)).map(([name, colors]) => {
          const css = gradientCss(gradientFromHexes(colors));
          return <Chip key={name} background={css} title={name} onPick={() => onGradient(css)} />;
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- curated collections

type Curated = typeof import("../../color/data/curated.ts").CURATED;
// Loaded the first time a Library tab opens, so the ~50 KB of palettes stay out of a page that never browses them.
let curated: Promise<Curated> | null = null;
const loadCurated = () => (curated ??= import("../../color/data/curated.ts").then((m) => m.CURATED));

// Gradient-only collections show as gradient chips; the rest as combination strips like Wada's.
const GRADIENT_ONLY = new Set(["webgradients"]);
const SEARCH_FROM = 40;

export function CuratedSections({ onColor, onGradient }: Pick) {
  const [list, setList] = useState<Curated | null>(null);
  useEffect(() => {
    let live = true;
    void loadCurated().then((c) => live && setList(c));
    return () => {
      live = false;
    };
  }, []);
  if (!list) return null;
  return (
    <>
      {list
        .filter((c) => onGradient || !GRADIENT_ONLY.has(c.id))
        .map((c) => (
          <Section key={c.id} title={c.title} count={c.palettes.length}>
            {() => <CuratedBody collection={c} onColor={onColor} onGradient={onGradient} />}
          </Section>
        ))}
    </>
  );
}

function CuratedBody({ collection, onColor, onGradient }: Pick & { collection: Curated[number] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = collection.palettes.filter(([name]) => name.toLowerCase().includes(q));
  return (
    <>
      {collection.palettes.length > SEARCH_FROM && (
        <input
          class="up-cp-search"
          placeholder={`Search ${collection.palettes.length}…`}
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      {GRADIENT_ONLY.has(collection.id) && onGradient ? (
        <div class="up-cp-chips up-cp-chips-wide">
          {shown.map(([name, colors]) => {
            const css = gradientCss(gradientFromHexes(colors));
            return <Chip key={name} background={css} title={name} onPick={() => onGradient(css)} />;
          })}
        </div>
      ) : (
        <div class="up-cp-combos">
          {shown.map(([name, colors]) => (
            <div key={name} class="up-cp-combo">
              <span class="up-cp-combo-name" title={name}>{name}</span>
              <div class="up-cp-combo-strip">
                {colors.map((hex, i) => (
                  <i key={i} style={{ background: hex }} title={hex} onClick={() => onColor(hex)} />
                ))}
              </div>
              {onGradient && (
                <button type="button" title="Use as gradient" onClick={() => onGradient(gradientCss(gradientFromHexes(colors)))}>
                  ⇢
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div class="up-cp-credit">
        {collection.credit} · <a href={collection.source.split(",")[0]} target="_blank" rel="noreferrer">source</a>
      </div>
    </>
  );
}
