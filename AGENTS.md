# uipane — agent notes

- Do not add or extend tests unless explicitly asked. Verify changes with `bun run typecheck` and by exercising them in the lab (`lab/`, `cd lab && bun run dev`).
- The panel UI is Preact rendered inside a Shadow DOM (`src/ui`, `src/styles.ts`); the React adapter lives in `src/react`. Overlays (dropdowns, menus) portal into the shadow root's `.up-portal`, never `document.body`.
- `dist/` is committed so the package installs from GitHub; rebuild it (`bun run build`) when `src/` changes.
