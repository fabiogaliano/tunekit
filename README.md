# uipane

Floating dev panel library — drag, corner-snap, edge-dock collapse, polished controls. Shadow DOM isolated.

## Install

```bash
pnpm add uipane
```

## Usage

```tsx
import { usePane, PaneRoot } from "uipane";

function App() {
  const values = usePane("My Panel", {
    opacity: { type: "slider", value: 0.5, min: 0, max: 1, step: 0.01 },
    enabled: { type: "toggle", value: true },
    mode: { type: "select", options: ["fast", "slow"], value: "fast" },
    timing: {
      type: "folder",
      open: false,
      children: {
        delay: { type: "slider", value: 100, min: 0, max: 1000, step: 10 },
      },
    },
    reset: { type: "action", label: "Reset All" },
  }, {
    onAction: (path) => {
      if (path === "reset") console.log("reset!");
    },
  });

  // values.opacity: number
  // values.enabled: boolean
  // values.mode: string
  // values.timing.delay: number
  // (actions are excluded from return type)

  return (
    <>
      <PaneRoot />
      <div style={{ opacity: values.opacity }}>
        {values.enabled ? "ON" : "OFF"} — {values.mode}
      </div>
    </>
  );
}
```

## Controls

Explicit `{ type }` configs, or dialkit-style shorthand: `[value, min, max, step?]` or a bare number → slider, boolean → toggle, color string → color (hex/rgb/hsl/oklch), CSS gradient string → color with the Gradient tab, other string → text, plain object → folder (`_collapsed: true` starts it closed).

| Control | Config | Resolved type |
|---------|--------|---------------|
| Slider | `{ type: "slider", value, min, max, step? }` | `number` |
| Toggle | `{ type: "toggle", value }` | `boolean` |
| Action | `{ type: "action", label? }` | excluded |
| Select | `{ type: "select", options, value? }` | `string` |
| Color | `{ type: "color", value?, gradient?, contrast? }` | `string` (CSS color, or a CSS gradient with `gradient: true`) |
| Text | `{ type: "text", value?, placeholder? }` | `string` |
| Spring | `{ type: "spring", stiffness?, damping?, mass?, visualDuration?, bounce? }` | `TransitionValue` |
| Easing | `{ type: "easing", duration, ease: [n,n,n,n] }` | `TransitionValue` |
| Image | `{ type: "image", options?, value? }` | `string` (URL / data URL) |
| Pad | `{ type: "pad", x?: [v,min,max,step?], y?, labels? }` | `{ x, y }` |
| Slot | `{ type: "slot", label? }` + `<PaneSlot panel path>` | excluded |
| Folder | `{ type: "folder", open?, children: {...} }` | recursive |

**Color picker.** Tabs for Solid, Gradient (with `gradient: true`) and Library.
- Solid: color area, hue/alpha, eyedropper (Chromium), classic hues, and a WCAG contrast badge against `contrast`, white or black (click to switch).
- Number fields scrub: press and drag (the cursor locks in place; Shift ×10, Alt ×0.1), or click to type. The format button cycles HEX → OKLCH → RGB and sets the output format.
- Gradient: linear/radial/conic, angle, blend space (sRGB/OKLab/OKLCH); click the bar to add a stop, drag to move, drag it off or press Delete to remove.
- Saved colors and gradients are shared by every picker and kept in localStorage (`+` saves, × or right-click removes).
- Library: traditional Japanese colors (日本の伝統色) and 和 gradients, Sanzo Wada's *Dictionary of Color Combinations* (348), and uiGradients (382, searchable).

## Options

```ts
usePane("Card", config, {
  id: "card",                       // stable id (default: name + useId)
  persist: true,                    // values + presets in localStorage ("uipane:Card")
  shortcuts: { radius: { key: "r", interaction: "drag" } }, // hold R and drag
  onAction: (path) => {},
});

const pane = usePaneController("Card", config); // { id, values, setValue, setValues, resetValues, getValues }
```

Shortcuts: hold the key and scroll (default), `drag`, or `move` to scrub a slider; press it to flip a toggle. `mode: "fine" | "coarse"` uses 1% / 10% of the range.

Keyboard: sliders take arrows / Shift+arrows / PageUp/Down / Home/End, Enter edits the value; selects open with ↓/Enter and preview as you arrow through; ←/→ step a closed select.

## Shell behavior

- **Drag** header → free drag, corner-snap on release
- **Edge-dock** → drag 35%+ off-screen → collapses to an edge handle
- **Handle** → click it (or Enter) to open; drag it along any edge to re-dock, or release it mid-screen to open there
- **Resize** → handles on edges opposite to docked corner
- **Tabs / single page** → multiple `usePane()` calls share one panel, either as tabs or stacked as collapsible sections; the header button toggles between them. Set the initial layout with `<PaneRoot layout="stack" />` (or `initPane({ layout })`); the user's choice is remembered
- **Presets** → save/load/delete named presets
- **Copy** → copies values as AI prompt to clipboard
- **Persist** → corner, size, layout and collapse state saved in localStorage; the size is fitted to the viewport on resize
- **Production** → `<PaneRoot />` renders nothing in production builds (`NODE_ENV` / Vite `MODE`) unless you pass `productionEnabled`. Hooks keep returning their defaults.

## Coding agents

`skills/uipane/SKILL.md` teaches a coding agent to add controls bound to real values and to apply values copied from the panel back into source. It ships in the package, so it is at `node_modules/uipane/skills/uipane/SKILL.md` once installed.

- **Claude Code:** copy the folder into the project (`.claude/skills/uipane/`) or into `~/.claude/skills/` for every project.
- **Other agents** (Cursor, Codex…): reference the file from `AGENTS.md`, or paste it into the agent's rules.

The panel's Copy button produces a prompt the skill knows how to apply. It lists only the values that changed, and the file that calls `usePane`.

### Live bridge (Vite)

```ts
// vite.config.ts
import { uipane } from "uipane/vite";

export default defineConfig({ plugins: [react(), uipane()] });
```

In dev, the panel's values are mirrored to `.uipane/values.json`: per panel, the source file, changed values and all values. The folder ignores itself in git. Agents read that file instead of the clipboard. Writing `{ "Card": { "radius": 30 } }` to `.uipane/set.json` pushes values into the open panel; the file is consumed. Option: `uipane({ dir: ".uipane" })`.

## Programmatic access

```ts
import { PaneStore } from "uipane";

PaneStore.updateValue(panelId, "opacity", 0.8);
PaneStore.triggerAction(panelId, "reset");
PaneStore.savePreset(panelId, "My Preset");
```

## Non-React usage

```ts
import { initPane, PaneStore } from "uipane";

const cleanup = initPane(); // mounts shadow DOM panel
PaneStore.registerPanel("my-panel", "Controls", { ... });
```

## Architecture

- **Shadow DOM** — fully isolated, never breaks host app styles
- **Preact** — renders inside shadow root (bundled, ~22KB gzip)
- **React adapter** — `usePane()` hook via `useSyncExternalStore`
- **Framework-agnostic core** — `PaneStore` works without React

## Credits

The XY pad, image picker, easing curve editor, keyboard helpers and shortcut handling are vendored from [dialkit](https://github.com/joshpuckett/dialkit) (MIT) in `src/vendor/dialkit`. Color data: Sanzo Wada's *A Dictionary of Color Combinations* via [mattdesl/dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations) (MIT) and [uiGradients](https://github.com/ghosh/uiGradients) (MIT).
