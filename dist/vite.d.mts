//#region src/vite.d.ts
type TunekitVitePluginOptions = {
  /** Folder for the bridge files, relative to the Vite root. Default `.tunekit`. */dir?: string;
};
type Middleware = (req: {
  method?: string;
  on(event: string, fn: (chunk?: unknown) => void): void;
}, res: {
  statusCode: number;
  end(body?: string): void;
}, next: () => void) => void;
type DevServer = {
  config: {
    root: string;
  };
  middlewares: {
    use(path: string, fn: Middleware): void;
  };
  ws: {
    send(payload: {
      type: "custom";
      event: string;
      data?: unknown;
    }): void;
  };
  httpServer: {
    once(event: "close", fn: () => void): void;
  } | null;
};
/**
 * Dev-only bridge between the panel and coding agents:
 * - presets saved in the panel are written to `presets/<name>.json` beside the
 *   module that called `usePane`; load them back with the `presets` option;
 * - the page's panel values are mirrored to `.tunekit/values.json`;
 * - writing `{ "<panel>": { "<path>": value } }` to `.tunekit/set.json` pushes
 *   those values into the open panel (the file is consumed and deleted).
 */
declare function tunekit(options?: TunekitVitePluginOptions): {
  name: string;
  apply: "serve";
  configureServer(server: DevServer): void;
  resolveId(id: string): "\0tunekit-client" | undefined;
  load(id: string): string | undefined;
  transformIndexHtml(): {
    tag: string;
    attrs: {
      type: string;
      src: string;
    };
    injectTo: "head";
  }[];
};
//#endregion
export { TunekitVitePluginOptions, tunekit as default, tunekit };