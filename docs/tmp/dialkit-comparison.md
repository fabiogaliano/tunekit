# uipane vs dialkit — analysis (2026-10-01)

Compared against dialkit 2.0.2 (npm) / repo HEAD `0301abd`. Live lab: `lab/` (`cd lab && bun run dev`).

## Lineage

uipane is a port of an earlier dialkit: same slider constants (3px click threshold, 32px dead zone, 8px stretch,
decile snap, 800ms hover-to-edit), same "Version N" presets + copy-for-AI prompt, same easing / time / physics
transition modes and editor ranges. What uipane changed: Preact UI bundled inside a Shadow DOM, a new shell
(drag + corner snap + edge-dock collapse + resize + tabs + persisted geometry), and the `slot` control.

## Feature delta

| | uipane 0.1.0 | dialkit 2.0.2 |
|---|---|---|
| Frameworks | React (UI is Preact, bundled ~26KB gz) | React, Solid, Vue, Svelte, vanilla |
| Isolation | Shadow DOM | Global CSS, manual `import "dialkit/styles.css"` (pulls Google Fonts) |
| Config | explicit `{type}` only | shorthand: `[v,min,max,step]`, bool, color string, nested object = folder |
| Controls only in uipane | `slot` + `<PaneSlot>` (embed React) | — |
| Controls only in dialkit | — | XY pad, image picker/upload, timeline dock |
| Transition editor | static curves | draggable bezier handles, per-mode value cache, closed-form spring curve |
| Multi-panel | tabs in one shell | stacked sections in one root |
| Shell | drag, corner snap, edge-dock, resize, persisted geometry | drag, collapse to icon, `position` prop, inline mode, theme light/dark/system |
| Presets / copy | ✓ (was never rendered; fixed), in memory only | ✓, opt-in `persist` of values + presets |
| Keyboard / a11y | none (sliders not focusable) | roving focus, arrows, Home/End, PageUp/Down, hotkey scrub shortcuts |
| Programmatic | `PaneStore` by panel id, but `usePane` never exposes the id | `useDialKitController` → `setValue(s)`, `resetValues`, `setOpen` |
| Prod gating | none | hidden in production unless `productionEnabled` |

## uipane bugs

**Status: all 12 fixed** (uncommitted). Keyboard support for sliders/selects is still missing; that is a feature gap rather than one of these bugs.

Verified in the lab (Playwright) unless marked *code*.

1. **Clicking a slider value to edit it changes the value.** `Slider.tsx` stops `mousedown` on the value span, but
   the track's `pointerdown`/`pointerup` already ran, so the click is treated as a track click. Repro: Scale 1.2 →
   hover value, click → becomes 2.7; Escape does not revert.
2. **Panel goes off-screen on window resize.** No `resize` listener; `calculatePosition` only runs on render. A
   bottom-right panel at 1600×900 stays at x=1268 after shrinking to 1000×500. After reload, the persisted 560px
   height isn't clamped, so y = −72 and the header (the only drag handle) is unreachable.
3. **Public types are broken.** `FolderConfig<C extends PaneConfig = PaneConfig>` ↔ `PaneConfig` is circular
   (TS2456), so `ControlConfig` collapses to `any`. Consequences in a consumer:
   - no validation (`{ type: "slidr" }` compiles);
   - inline `select` / `easing` / `spring` values resolve to `never` (the README's `values.mode` is `never`);
   - entries iterated from a `PaneConfig` are `unknown`.

   `tsc --noEmit` on the repo reports 28 errors; vitest doesn't typecheck, so CI is green. Fix: make `PaneConfig` an
   interface (`interface PaneConfig { [key: string]: ControlConfig }`) and accept readonly arrays/tuples
   (`readonly SelectOption[]`, `readonly [n,n,n,n]`) since `usePane` uses a `const` type parameter.
4. **Presets and Copy are unreachable.** `PresetBar` is imported in `App.tsx` but never rendered, although the README
   advertises both. Two latent bugs will surface once it's wired in:
   - its `position: fixed` dropdown sits inside the transformed `.up-shell`, so it is positioned relative to the
     shell, not the viewport;
   - its outside-click handler checks `e.target` on `document`, which is retargeted to the shadow host, so every
     mousedown in the dropdown closes it before `click` fires. Use `e.composedPath()`.
5. **Hook after early returns** (*code*). `App.tsx:358` `useEffect` runs after `return null` / the collapsed
   return, which breaks the Rules of Hooks. As a side effect, `useActiveTab()` stays `null` until the panel is
   expanded.
6. **Spring preview diverges** (*code + numeric check*). `Transition.tsx` uses explicit Euler with a fixed
   dt = 0.02. With in-range Physics values (stiffness 1000, mass 0.1) the curve blows up to |x| ≈ 1e24 and renders
   as garbage. Dialkit fixed this with a closed-form `springProgress`.
7. **Transition mode isn't part of the value** (*code*). The mode lives in `PaneStore.transitionModes`, separate from
   `values`. So `updateValue(id, path, easingValue)` on a spring control, or loading a preset saved in another
   mode, leaves the editor showing the wrong mode. Dialkit stores it as `${path}.__mode` inside values.
8. **`updatePanel` leaves `baseValues` stale** (*code*). After a config change adds keys, `clearActivePreset()`
   restores a base that lacks them. `unregisterPanel` also never clears `presets` / `activePreset` /
   `transitionModes`.
9. **`activeTab` is an index** (*code*). When a tab's component unmounts, the selection silently shifts to
   another panel.
10. **`initPane` has no ref-count** (*code*). With two `<PaneRoot>`s, unmounting either one removes the host for
    both.
11. **Select overlay** (*code*). Always portals to `document.body`; `portalContainer` is dead. The position is
    computed once on open, so the menu detaches when the panel content scrolls (already tracked in
    `docs/select-overlay-refactor.md`).
12. **Mode-switch conversions drop data** (*code*). Easing → Time ignores the easing duration because the fallback
    spring always has `visualDuration`. Time → Physics resets to 200/25/1 instead of converting.

## Dialkit rough edges

These came up during the comparison and don't affect uipane:

- `DialRoot` returns before its hooks when `!productionEnabled`.
- Action configs leak into resolved values and Copy output.
- The React bundle inlines its own `DialStore`, so importing from `dialkit/store` gives a second singleton.
- The stylesheet `@import`s Google Fonts.
