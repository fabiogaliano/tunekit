// Run with `pnpm build && pnpm exec vp dev test`, then open /host.html.
// Imports the built React-free entry, the way a non-React host consumes it.
import { initPane, PaneStore } from "../dist/core.mjs";

const id = "host-demo";
PaneStore.registerPanel(id, "Card", {
  radius: [12, 0, 80],
  shape: { type: "select", options: ["square", "wide", "tall"], value: "square" },
  fill: "#6d5dfc",
});

const swatch = document.getElementById("swatch")!;
const out = document.getElementById("values")!;
const sizes: Record<string, [number, number]> = {
  square: [160, 160],
  wide: [240, 120],
  tall: [120, 240],
};

function apply(): void {
  const v = PaneStore.getValues(id);
  const [w, h] = sizes[v.shape as string] ?? sizes.square!;
  Object.assign(swatch.style, {
    borderRadius: `${v.radius}px`,
    background: String(v.fill),
    width: `${w}px`,
    height: `${h}px`,
  });
  out.textContent = JSON.stringify(v, null, 2);
}

PaneStore.subscribe(id, apply);
apply();
initPane({ host: document.getElementById("tune")! });
