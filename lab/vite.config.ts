import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { tunekit } from "../dist/vite.mjs";

export default defineConfig({
  plugins: [react(), tunekit()],
  resolve: {
    // Consume the built package exactly as an app would: the UI is Preact
    // compiled into dist, which the lab's React JSX transform must not touch.
    alias: {
      tunekit: fileURLToPath(new URL("../dist/index.mjs", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
});
