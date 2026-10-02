# tunekit lab

A three.js scene with 60+ dials, driven by tunekit and dialkit from one schema.

```bash
cd lab && bun install && bun run dev
```

`dev` rebuilds `../dist` first. Re-run `bun run build:pane` (or `bun run dev` in the repo root for watch mode) after changing `src/`.

| Route | What |
|---|---|
| `#/compare` | Split screen: tunekit on the left, dialkit on the right, same scene and controls |
| `#/tunekit` | Full-screen demo on tunekit (tabs, `PaneSlot` live stats) |
| `#/dialkit` | Full-screen demo on dialkit (stacked sections, versions, copy) |
| `#/matrix` | Feature matrix |

- `src/schema.ts`: every control, written once in tunekit format.
- `src/adapters.ts`: translates that schema to dialkit's config format.
- `src/bindings.tsx`: one hook per library. Each returns `SceneParams` plus action signals (pulse, randomize, reset camera).
- `src/scene/`: the R3F scene. `animate.ts` plays the panel's spring/easing values, so transition dials affect the hover and pulse motion.

Analysis and bug list: `../docs/tmp/dialkit-comparison.md`.
