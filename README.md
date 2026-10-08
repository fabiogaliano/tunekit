# tunekit

A floating dev panel for tuning React UIs by eye. Declare controls next to the component, get live values back, then copy what you dialed in straight into code.

tunekit started as a port of [dialkit](https://github.com/joshpuckett/dialkit) by [Josh Puckett](https://github.com/joshpuckett). The slider feel, presets, copy-for-AI flow and transition editors come from dialkit. tunekit adds a Shadow DOM panel you can drag, dock and resize, plus a few new controls. If you want a framework-agnostic option, try dialkit first.

```bash
pnpm add tunekit   # or bun add / npm i
```

## Quick start

```tsx
import { PaneRoot, usePane } from "tunekit";

function Card() {
  const v = usePane("Card", {
    radius: [12, 0, 48],          // slider: [value, min, max, step?]
    shadow: true,                 // toggle
    accent: "#6d5dfc",            // color picker
    motion: { type: "spring", visualDuration: 0.4, bounce: 0.2 },
  });

  return <div style={{ borderRadius: v.radius, background: v.accent }} />;
}

export function App() {
  return (
    <>
      <PaneRoot /> {/* mount once; renders nothing in production */}
      <Card />
    </>
  );
}
```

Each `usePane` call adds a panel. Several panels share one window as tabs or stacked sections.

## Controls

Shorthand: a number or `[value, min, max, step?]` makes a slider, a boolean makes a toggle, a color or CSS gradient string makes a color picker, any other string makes a text field, and a plain object makes a folder (`_collapsed: true` starts it closed).

| Control | Config | Value |
|---|---|---|
| Slider | `{ type: "slider", value, min, max, step? }` | `number` |
| Toggle | `{ type: "toggle", value }` | `boolean` |
| Select | `{ type: "select", options, value? }` | `string` |
| Color | `{ type: "color", value?, gradient?, contrast? }` | CSS color or gradient |
| Text | `{ type: "text", value?, placeholder? }` | `string` |
| Spring | `{ type: "spring", stiffness?, damping?, mass?, visualDuration?, bounce? }` | `TransitionValue` |
| Easing | `{ type: "easing", duration, ease: [x1, y1, x2, y2] }` | `TransitionValue` |
| Pad | `{ type: "pad", x?: [v, min, max], y?, labels? }` | `{ x, y }` |
| Image | `{ type: "image", options?, value? }` | URL / data URL |
| Action | `{ type: "action", label? }` | — (handle with `onAction`) |
| Slot | `{ type: "slot" }` + `<PaneSlot panel path>` | — (renders your React) |
| Folder | `{ type: "folder", open?, children }` | nested |

The color picker has Solid, Gradient and Library tabs: OKLCH/RGB/HEX fields you can scrub, an eyedropper, a WCAG contrast badge, saved swatches, and libraries of traditional Japanese colors, Sanzo Wada's *Dictionary of Color Combinations*, uiGradients, and curated palettes made with care: The Met and MoMA, artists, Mexican muralists, Wes Anderson, Studio Ghibli, national parks, the Pacific Northwest, chromotome, WebGradients and editor themes (Catppuccin, Rosé Pine, Nord, Solarized, Gruvbox, Dracula). The curated set loads the first time the Library opens.

The same libraries are importable, for picking from them in code (a "random palette" button, say):

```ts
import { collections, japaneseGradients, wadaCombinations, uiGradients, japaneseColors, paletteGradient, paletteColors } from "tunekit/palettes";

const p = wadaCombinations[Math.floor(Math.random() * wadaCombinations.length)]; // { name, colors }
PaneStore.updateValue("my-panel", "palette", paletteGradient(p.colors)); // the CSS the picker writes
paletteColors(value); // a color control's value back as its colours, in order
collections; // every Library collection: { id, title, credit, source, palettes }
```

## Options

```ts
usePane("Card", config, {
  persist: true,                                         // keep values + presets in localStorage
  presets: [{ name: "Soft", values: { radius: 24 } }],    // presets from files, see below
  shortcuts: { radius: { key: "r", interaction: "drag" } }, // hold R and drag to scrub
  onAction: (path) => {},
});

// Read and write values from code
const pane = usePaneController("Card", config); // { values, setValue, setValues, resetValues, ... }
```

`<PaneRoot layout="stack" />` starts with stacked sections instead of tabs. `productionEnabled` keeps the panel in production builds.

## The panel

- Drag the header to move it. It snaps to the nearest corner or the middle of the top or bottom edge.
- Drag it mostly off-screen to dock it as a handle on the edge. Click the handle to open it again.
- Resize from the free edges. Position, size and layout persist.
- Save and load presets, or **Copy** to get a prompt listing the values you changed.
- Sliders and selects work from the keyboard.
- The panel renders in a Shadow DOM, so app styles never leak in or out.

## Coding agents

The package ships a skill at `node_modules/tunekit/skills/tunekit/SKILL.md`. It teaches an agent to add controls bound to real values and to apply copied values back to source. Copy it to `.claude/skills/tunekit/` for Claude Code, or reference it from `AGENTS.md`.

For a live link without the clipboard, add the Vite plugin:

```ts
// vite.config.ts
import { tunekit } from "tunekit/vite";

export default defineConfig({ plugins: [react(), tunekit()] });
```

In dev, panel values are mirrored to `.tunekit/values.json`. Writing `{ "Card": { "radius": 30 } }` to `.tunekit/set.json` pushes values into the open panel.

### Presets as files

With the plugin running, **+** saves the preset to `presets/<name>.json` next to the component instead of localStorage, and edits made while that preset is selected are written back to it. Load them with the `presets` option:

```tsx
const presets = Object.values(import.meta.glob("./presets/*.json", { eager: true, import: "default" }));
const v = usePane("Card", config, { presets });
```

File presets show up in the same dropdown, can't be deleted from the panel (delete the file), and also load in production builds.

## Without React

```ts
import { initPane, PaneStore } from "tunekit";

const cleanup = initPane();
PaneStore.registerPanel("my-panel", "Controls", { opacity: [0.5, 0, 1] });
PaneStore.updateValue("my-panel", "opacity", 0.8);
```

## Mount into your own element

Pass `host` to render the pane inside an element you own (a sidebar, a tab) instead of floating over the page. It fills the element's width and flows with it; there is no drag, dock, resize or saved position, and the element's own scroller scrolls it. The header, preset row and **Copy** stay. Popovers still open beside the pane.

```ts
import { initPane, PaneStore } from "tunekit/core"; // no React import

PaneStore.registerPanel("card", "Card", { radius: [12, 0, 48], accent: "#6d5dfc" });
const stop = PaneStore.subscribe("card", () => render(PaneStore.getValues("card"))); // flat values by dot-path
const unmount = initPane({ host: document.querySelector("#tune")! });

// later
unmount();
stop();
PaneStore.unregisterPanel("card");
```

Each hosted `initPane` is its own mount with its own `unmount`; it doesn't share the floating pane's reference count, so both can be open at once (they show the same panels). Keyboard shortcuts are handled by whichever pane mounted first, so a press never applies twice. The host must not set `transform`, `filter` or `contain` on an ancestor of the pane, which would trap the fixed-position popovers. `test/host.html` is a working page: `pnpm build && pnpm exec vp dev test`, then open `/host.html`.

## Thanks

- **[dialkit](https://github.com/joshpuckett/dialkit)** by Josh Puckett. tunekit is built on its ideas, and the XY pad, image picker, easing editor, keyboard helpers and shortcut handling are vendored from it (MIT, see `src/vendor/dialkit`). Thank you, Josh.
- **[A Dictionary of Color Combinations](https://github.com/mattdesl/dictionary-of-colour-combinations)**: Sanzo Wada's palettes, digitized by Matt DesLauriers (MIT).
- **[uiGradients](https://github.com/ghosh/uiGradients)** by Indrashish Ghosh (MIT).
- Curated palettes (fetched by `scripts/palettes.ts`): [MetBrewer](https://github.com/BlakeRMills/MetBrewer) (CC0) and [MoMAColors](https://github.com/BlakeRMills/MoMAColors) (MIT) by Blake Robert Mills, [lisa](https://github.com/tyluRp/lisa) by Tyler Littlefield (MIT), [MexBrewer](https://github.com/paezha/MexBrewer) by Antonio Páez (MIT), [wesanderson](https://github.com/karthik/wesanderson) by Karthik Ram (MIT), [ghibli](https://github.com/ewenme/ghibli) by Ewen Henderson (MIT), [NatParksPalettes](https://github.com/kevinsblake/NatParksPalettes) by Kevin S. Blake (MIT), [PNWColors](https://github.com/jakelawlor/PNWColors) by Jake Lawlor (CC0), [chromotome](https://github.com/kgolid/chromotome) by Kjetil Midtgarden Golid (MIT), [WebGradients](https://github.com/itmeo/webgradients) by itmeo (MIT), and the [Catppuccin](https://github.com/catppuccin/palette), [Rosé Pine](https://github.com/rose-pine/palette), [Nord](https://github.com/nordtheme/nord), [Solarized](https://github.com/altercation/solarized), [Gruvbox](https://github.com/morhetz/gruvbox) and [Dracula](https://github.com/dracula/dracula-theme) palettes (MIT).

## License

MIT
