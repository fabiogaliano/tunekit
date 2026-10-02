import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/vite.ts"],
    format: ["esm"],
    dts: true,
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  },
});
