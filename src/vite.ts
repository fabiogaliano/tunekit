import { existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export type TunekitVitePluginOptions = {
  /** Folder for the bridge files, relative to the Vite root. Default `.tunekit`. */
  dir?: string;
};

// Structural subset of Vite's types, so this entry doesn't need vite installed to type-check.
type Middleware = (
  req: { method?: string; on(event: string, fn: (chunk?: unknown) => void): void },
  res: { statusCode: number; end(body?: string): void },
  next: () => void,
) => void;
type DevServer = {
  config: { root: string };
  middlewares: { use(path: string, fn: Middleware): void };
  ws: { send(payload: { type: "custom"; event: string; data?: unknown }): void };
  httpServer: { once(event: "close", fn: () => void): void } | null;
};

const ENDPOINT = "/__tunekit/values";
const PRESETS_ENDPOINT = "/__tunekit/presets";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CLIENT_ID = "/@tunekit/client";
const RESOLVED_CLIENT_ID = "\0tunekit-client";

// Runs in the page during dev. Imports "tunekit" so it shares the app's PaneStore.
const CLIENT = `
import { PaneStore } from "tunekit";

const watched = new Map();
let timer = 0;

function snapshot() {
  const panels = {};
  for (const p of PaneStore.getPanels()) {
    const key = p.name in panels ? p.name + " (" + p.id + ")" : p.name;
    panels[key] = {
      source: p.source ?? null,
      changed: PaneStore.getChangedValues(p.id),
      values: PaneStore.getTunableValues(p.id),
    };
  }
  return { updatedAt: new Date().toISOString(), page: location.href, panels };
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch(${JSON.stringify(ENDPOINT)}, { method: "POST", body: JSON.stringify(snapshot()) }).catch(() => {});
  }, 300);
}

function rewatch() {
  const ids = new Set(PaneStore.getPanels().map((p) => p.id));
  for (const [id, off] of watched) if (!ids.has(id)) { off(); watched.delete(id); }
  for (const id of ids) if (!watched.has(id)) watched.set(id, PaneStore.subscribe(id, schedule));
  schedule();
}

PaneStore.subscribeGlobal(rewatch);
rewatch();

PaneStore.setPresetWriter((write) => {
  if (!write.source) {
    console.warn("[tunekit] can't save preset for " + write.panelName + ": unknown source module");
    return;
  }
  fetch(${JSON.stringify(PRESETS_ENDPOINT)}, { method: "POST", body: JSON.stringify(write) })
    .then((res) => res.ok || res.text().then((t) => console.warn("[tunekit] preset not saved:", t)))
    .catch(() => {});
});

if (import.meta.hot) {
  import.meta.hot.on("tunekit:set", (data) => {
    for (const [name, values] of Object.entries(data ?? {})) {
      const panel = PaneStore.getPanels().find((p) => p.name === name || p.id === name);
      if (panel && values && typeof values === "object") PaneStore.updateValues(panel.id, values);
    }
  });
}
`;

/**
 * Dev-only bridge between the panel and coding agents:
 * - presets saved in the panel are written to `presets/<name>.json` beside the
 *   module that called `usePane`; load them back with the `presets` option;
 * - the page's panel values are mirrored to `.tunekit/values.json`;
 * - writing `{ "<panel>": { "<path>": value } }` to `.tunekit/set.json` pushes
 *   those values into the open panel (the file is consumed and deleted).
 */
export function tunekit(options: TunekitVitePluginOptions = {}) {
  let dir = "";

  return {
    name: "tunekit",
    apply: "serve" as const,

    configureServer(server: DevServer) {
      dir = resolve(server.config.root, options.dir ?? ".tunekit");
      mkdirSync(dir, { recursive: true });
      // The folder ignores itself, so projects don't need a .gitignore entry.
      const ignore = resolve(dir, ".gitignore");
      if (!existsSync(ignore)) writeFileSync(ignore, "*\n");

      server.middlewares.use(ENDPOINT, (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => (body += String(chunk)));
        req.on("end", () => {
          try {
            writeFileSync(resolve(dir, "values.json"), JSON.stringify(JSON.parse(body), null, 2) + "\n");
            res.statusCode = 204;
          } catch {
            res.statusCode = 400;
          }
          res.end();
        });
      });

      server.middlewares.use(PRESETS_ENDPOINT, (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => (body += String(chunk)));
        req.on("end", () => {
          try {
            const { source, slug, preset } = JSON.parse(body) as {
              source: string;
              slug: string;
              preset: { name: string; values: Record<string, unknown> };
            };
            const root = server.config.root;
            const module = resolve(root, source);
            const rel = relative(root, module);
            // The page picks the path; keep writes inside the project.
            if (!SLUG.test(slug) || rel.startsWith("..") || isAbsolute(rel) || rel.split(/[\\/]/).includes("node_modules")) {
              throw new Error("refusing to write outside the project");
            }
            const presetsDir = resolve(dirname(module), "presets");
            mkdirSync(presetsDir, { recursive: true });
            writeFileSync(
              resolve(presetsDir, slug + ".json"),
              JSON.stringify({ name: preset.name, values: preset.values }, null, 2) + "\n",
            );
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 400;
            res.end(String(error));
          }
        });
      });

      const setFile = resolve(dir, "set.json");
      const applySet = () => {
        if (!existsSync(setFile)) return;
        try {
          const data = JSON.parse(readFileSync(setFile, "utf8"));
          server.ws.send({ type: "custom", event: "tunekit:set", data });
          rmSync(setFile);
        } catch {
          // Mid-write or invalid JSON: the next change event retries.
        }
      };
      const watcher = watch(dir, (_event, file) => {
        if (file === "set.json") applySet();
      });
      server.httpServer?.once("close", () => watcher.close());
    },

    resolveId(id: string) {
      return id === CLIENT_ID ? RESOLVED_CLIENT_ID : undefined;
    },

    load(id: string) {
      return id === RESOLVED_CLIENT_ID ? CLIENT : undefined;
    },

    transformIndexHtml() {
      return [{ tag: "script", attrs: { type: "module", src: CLIENT_ID }, injectTo: "head" as const }];
    },
  };
}

export default tunekit;
