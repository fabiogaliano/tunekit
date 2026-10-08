import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/core.ts", "src/vite.ts", "src/palettes.ts"],
    format: ["esm"],
    dts: true,
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  },
});
