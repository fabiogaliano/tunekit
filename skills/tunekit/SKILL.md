---
name: tunekit
description: Add live tuning controls (sliders, toggles, colors and gradients, springs, easings, pads) to a React UI with tunekit, bind them to real values, and apply values the user copies from the panel back into source. Use when the user wants to tweak, tune, dial in or compare visual or motion values by eye, or pastes a "Update the usePane configuration…" block.
---

# tunekit

tunekit is a floating dev panel for React. You declare controls next to the component being tuned, the hook returns live values, and the user adjusts them in the panel instead of editing constants and reloading. The panel renders in a Shadow DOM, so it never inherits or leaks app styles.

## Workflow

1. Inspect the project: framework (React 18+), package manager, and where the values being tuned live (inline styles, CSS variables, Tailwind classes, motion props, three.js params…).
2. Install with the project's package manager: `bun add tunekit` / `pnpm add tunekit` / `npm i tunekit`.
3. Mount **one** `<PaneRoot />` near the app root. In Next.js App Router, tunekit code goes in a `"use client"` component.
4. In the component being tuned, call `usePane(name, config)`. Start each control at the value the code uses today, with a range that brackets sensible alternatives.
5. Bind the returned values to the real styles/props. Don't create parallel demo elements.
6. Group related controls in folders (a plain nested object). Add an `action` to replay one-shot animations.
7. Let the user tune. When they paste copied values (see below), write them back as the new defaults, or into the production code if they ask for that.
8. Run the project's typecheck/build.

Keep the set small and useful: 3–10 controls a component, named the way the user talks about the design ("radius", "shadow blur", "enter spring"), not the CSS property.

More than ~10 controls, or groups the user names separately ("the letters", "the colours")? Make one panel per group, not one panel with folders. With two or more panels the user gets the tabs/single-sheet toggle. Give every panel the same `source`. Presets are per panel, so if a profile should span all groups, save/load/delete it by name in each.

## API

```tsx
import { PaneRoot, usePane } from "tunekit";

function Card() {
  const v = usePane("Card", {
    radius: [16, 0, 48],               // [default, min, max, step?] → number
    padding: 24,                        // bare number → slider with an inferred range
    elevated: true,                     // boolean → toggle
    accent: "#7c5cff",                  // color string → color picker
    background: { type: "color", gradient: true, value: "linear-gradient(135deg, #0f2540, #8b81c3)" },
    title: "Hello",                     // other string → text
    layout: { type: "select", options: ["stack", "grid"], value: "stack" },
    enter: { type: "spring", visualDuration: 0.35, bounce: 0.2 },
    hover: { type: "easing", duration: 0.2, ease: [0.2, 0, 0, 1] },
    offset: { type: "pad", x: [0, -50, 50], y: [0, -50, 50] },
    shadow: { _collapsed: true, blur: [12, 0, 40], opacity: [0.15, 0, 1, 0.01] }, // folder
    replay: { type: "action" },
  }, {
    onAction: (path) => path === "replay" && replay(),
    persist: true,                      // keep values + versions across reloads
  });

  return <div style={{ borderRadius: v.radius, padding: v.padding, background: v.background }} />;
}

// once, near the root
<PaneRoot />
```

Returned values keep the config's nesting (`v.shadow.blur`). Types are inferred; for a config defined elsewhere, write `const config = { ... } satisfies PaneConfig`.

| Control | Returns |
|---|---|
| slider, number, tuple | `number` |
| toggle, boolean | `boolean` |
| color | CSS color string; a CSS gradient string with `gradient: true` |
| text, select, image | `string` |
| pad | `{ x, y }` |
| spring / easing | the `{ type: "spring", … }` / `{ type: "easing", duration, ease }` config. Map it to the animation library's transition |
| action, slot | not returned |

Other pieces:
- `usePaneController(name, config, options)` returns `{ values, setValue, setValues, resetValues }` for updating values from code.
- Options: `id` (stable id shared across mounts), `persist`, `presets` (file presets, below), `shortcuts` (e.g. `{ "shadow.blur": { key: "b" } }`: hold B and scroll to scrub), `onAction`.
- `<PaneRoot layout="stack" />` shows every panel on one page instead of tabs.
- Color controls take `contrast: "#0a0a0a"` to show a WCAG badge against that background.
- `tunekit/palettes` exports the picker's libraries: `collections` (every one, as `{ id, title, credit, source, palettes: { name, colors }[] }`) and the built-in four by name, plus `paletteGradient(colors)` and `paletteColors(value)`. Use them when one pick should drive several colours, or for a random-palette action.

## Presets as files

When the project uses the `tunekit/vite` plugin, presets saved with the panel's **+** are written to `presets/<slug>.json` beside the component that calls `usePane`, as `{ "name", "values" }` with dot-path keys. Edits made while a file preset is selected are written back to it. Wire them in so they load (dev and production):

```tsx
const presets = Object.values(import.meta.glob<PresetFile>("./presets/*.json", { eager: true, import: "default" }));
usePane("Card", config, { presets });
```

To add or change a preset by hand, edit those JSON files directly.

## Custom controls (slots)

When the built-in controls don't fit the job, build one with a slot rather than bending the value into sliders. Examples: a bezier or curve editor for a custom easing, a palette editor, a drag handle over a layout preview, a mini chart, or a "copy CSS" button.

```tsx
const v = usePane("Card", { stops: { type: "slot", label: "Gradient stops" } });

<PaneSlot panel="Card" path="stops">
  <StopsEditor value={stops} onChange={setStops} />
</PaneSlot>
```

The slot renders inside the panel's Shadow DOM, isolated from the app on purpose: the app's CSS (Tailwind classes, global styles) doesn't apply, so the panel's look can't break. Style slot content with inline styles and tunekit's tokens: `var(--up-surface)`, `--up-surface-hover`, `--up-border`, `--up-text-1` … `--up-text-4`, `--up-radius`, `--up-row-h`. React state and events work as normal. A slot holds no value, so keep its state in the component, or in `usePaneController` via `setValue`.

`<PaneRoot>{children}</PaneRoot>` puts content at the top of the panel the same way.

## Applying tuned values

**Copy.** The panel's Copy button puts this on the clipboard:

````
Update the usePane configuration for "Card" in src/components/Card.tsx with these values:

```json
{ "radius": 22, "shadow.blur": 18, "accent": "#ef4444" }
```

Apply these values as the new defaults in the usePane call. Keys are dot-paths into the config; controls not listed are unchanged.
````

Only changed values are listed. The file is where `usePane` is called. If the config is imported from another module, follow the import.

**Live bridge (Vite).** With `tunekit()` from `tunekit/vite` in the Vite config, the dev server keeps `.tunekit/values.json` up to date while the page is open. The folder ignores itself in git.

```json
{
  "updatedAt": "…",
  "page": "http://localhost:5173/",
  "panels": {
    "Card": { "source": "src/components/Card.tsx", "changed": { "radius": 22 }, "values": { "radius": 22, "padding": 24 } }
  }
}
```

- When the user says "apply my panel values", read `changed` from that file instead of asking them to copy.
- To show the user something, write `.tunekit/set.json` as `{ "Card": { "radius": 30, "shadow.blur": 8 } }`. The open panel applies it at once and the file is deleted. It's a preview: source code doesn't change until you edit it.
- If `values.json` is missing or stale, ask the user to open the page with the dev server running.

Writing values back: keys are dot-paths into the config (`shadow.blur` → `shadow: { blur: … }`). For each key:
- Tuple or number → replace the default (first element), keeping min/max/step. If the value falls outside the range, widen the range.
- `{ type, value }` → replace `value`.
- Spring/easing values are objects. Copy the fields that changed.
- Keep the user's shorthand style; don't expand `[16, 0, 48]` into `{ type: "slider", … }`.

If the user says the values are final ("ship it", "bake these in"), write them into the production code and offer to remove the `usePane` call and `<PaneRoot />`.

## Production

`<PaneRoot />` renders nothing in production builds unless it gets `productionEnabled`, and without a root the hooks return their defaults. Shipping a tuned component is still cleaner with the values baked in and the `usePane` call removed. Offer that when the user is done tuning.
