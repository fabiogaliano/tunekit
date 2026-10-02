import { existsSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from "node:fs";
import { resolve } from "node:path";
//#region src/vite.ts
const ENDPOINT = "/__uipane/values";
const CLIENT_ID = "/@uipane/client";
const RESOLVED_CLIENT_ID = "\0uipane-client";
const CLIENT = `
import { PaneStore } from "uipane";

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

if (import.meta.hot) {
  import.meta.hot.on("uipane:set", (data) => {
    for (const [name, values] of Object.entries(data ?? {})) {
      const panel = PaneStore.getPanels().find((p) => p.name === name || p.id === name);
      if (panel && values && typeof values === "object") PaneStore.updateValues(panel.id, values);
    }
  });
}
`;
/**
* Dev-only bridge between the panel and coding agents:
* - the page's panel values are mirrored to `.uipane/values.json`;
* - writing `{ "<panel>": { "<path>": value } }` to `.uipane/set.json` pushes
*   those values into the open panel (the file is consumed and deleted).
*/
function uipane(options = {}) {
	let dir = "";
	return {
		name: "uipane",
		apply: "serve",
		configureServer(server) {
			dir = resolve(server.config.root, options.dir ?? ".uipane");
			mkdirSync(dir, { recursive: true });
			const ignore = resolve(dir, ".gitignore");
			if (!existsSync(ignore)) writeFileSync(ignore, "*\n");
			server.middlewares.use(ENDPOINT, (req, res, next) => {
				if (req.method !== "POST") return next();
				let body = "";
				req.on("data", (chunk) => body += String(chunk));
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
			const setFile = resolve(dir, "set.json");
			const applySet = () => {
				if (!existsSync(setFile)) return;
				try {
					const data = JSON.parse(readFileSync(setFile, "utf8"));
					server.ws.send({
						type: "custom",
						event: "uipane:set",
						data
					});
					rmSync(setFile);
				} catch {}
			};
			const watcher = watch(dir, (_event, file) => {
				if (file === "set.json") applySet();
			});
			server.httpServer?.once("close", () => watcher.close());
		},
		resolveId(id) {
			return id === CLIENT_ID ? RESOLVED_CLIENT_ID : void 0;
		},
		load(id) {
			return id === RESOLVED_CLIENT_ID ? CLIENT : void 0;
		},
		transformIndexHtml() {
			return [{
				tag: "script",
				attrs: {
					type: "module",
					src: CLIENT_ID
				},
				injectTo: "head"
			}];
		}
	};
}
//#endregion
export { uipane as default, uipane };
