import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flattenValues, normalizeConfig } from "../config.ts";
import { PaneStore } from "../store.ts";
import type {
  PaneConfig,
  PaneValue,
  PanelOptions,
  ResolvedValues,
  ShortcutConfig,
  PersistOptions,
  PresetFile,
} from "../types.ts";

export type UsePaneOptions = {
  /** Stable panel id; defaults to one derived from `name` + React's useId. */
  id?: string;
  onAction?: (path: string) => void;
  persist?: PersistOptions;
  /** Presets kept as files, e.g. `Object.values(import.meta.glob("./presets/*.json", { eager: true, import: "default" }))`. */
  presets?: PresetFile[];
  /** Keyboard/scroll shortcuts by dot-path, e.g. `{ "blur.radius": { key: "b" } }`. */
  shortcuts?: Record<string, ShortcutConfig>;
};

export type PaneController<T extends PaneConfig> = {
  /** The id registered with PaneStore, for programmatic access. */
  id: string;
  values: ResolvedValues<T>;
  getValues: () => ResolvedValues<T>;
  setValue: (path: string, value: PaneValue) => void;
  /** Nested partial in the same shape as `values`. */
  setValues: (values: Record<string, unknown>) => void;
  resetValues: () => void;
};

export function usePane<const T extends PaneConfig>(
  name: string,
  config: T,
  options?: UsePaneOptions,
): ResolvedValues<T> {
  return usePaneController(name, config, options).values;
}

export function usePaneController<const T extends PaneConfig>(
  name: string,
  config: T,
  options?: UsePaneOptions,
): PaneController<T> {
  const instanceId = useId();
  const panelId = options?.id ?? `${name}-${instanceId}`;

  const configRef = useRef(config);
  configRef.current = config;
  const serialized = JSON.stringify(config);

  const [source] = useState(callerModule);
  const panelOptions: PanelOptions = {
    persist: options?.persist,
    presets: options?.presets,
    shortcuts: options?.shortcuts,
    source,
  };
  const optionsRef = useRef(panelOptions);
  optionsRef.current = panelOptions;
  const serializedOptions = JSON.stringify(panelOptions);

  const onActionRef = useRef(options?.onAction);
  onActionRef.current = options?.onAction;

  useEffect(() => {
    PaneStore.registerPanel(panelId, name, configRef.current, optionsRef.current);
    return () => PaneStore.unregisterPanel(panelId);
  }, [panelId, name]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    PaneStore.updatePanel(panelId, name, configRef.current, optionsRef.current);
  }, [panelId, name, serialized, serializedOptions]);

  useEffect(() => {
    return PaneStore.subscribeActions(panelId, (action) => {
      onActionRef.current?.(action);
    });
  }, [panelId]);

  const flat = useSyncExternalStore(
    (cb) => PaneStore.subscribe(panelId, cb),
    () => PaneStore.getValues(panelId),
    () => PaneStore.getValues(panelId),
  );

  const values = useMemo(
    () => resolveValues(configRef.current, flat),
    [flat, serialized],
  );

  const setValue = useCallback(
    (path: string, value: PaneValue) => PaneStore.updateValue(panelId, path, value),
    [panelId],
  );
  const setValues = useCallback(
    (nested: Record<string, unknown>) =>
      PaneStore.updateValues(panelId, flattenUpdates(nested)),
    [panelId],
  );
  const resetValues = useCallback(() => PaneStore.resetValues(panelId), [panelId]);
  const getValues = useCallback(
    () => resolveValues(configRef.current, PaneStore.getValues(panelId)),
    [panelId],
  );

  return useMemo(
    () => ({ id: panelId, values, getValues, setValue, setValues, resetValues }),
    [panelId, values, getValues, setValue, setValues, resetValues],
  );
}

/**
 * The module that called usePane, from the stack: the first frame outside this
 * file. Only the file is kept; dev transforms shift line numbers, so a line
 * would point at the wrong place.
 */
function callerModule(): string | undefined {
  const urls = (new Error().stack ?? "")
    .split("\n")
    .map((line) => line.match(/((?:https?|file):\/\/[^\s)]+?)(?::\d+){1,2}\)?\s*$/)?.[1])
    .filter((url): url is string => !!url);
  const own = urls[0];
  const caller = urls.find((url) => url !== own && !url.includes("/node_modules/"));
  if (!caller) return undefined;
  try {
    const { pathname } = new URL(caller);
    // Vite serves files outside the root as /@fs/<absolute path>.
    return decodeURIComponent(pathname.startsWith("/@fs/") ? pathname.slice(4) : pathname.slice(1));
  } catch {
    return undefined;
  }
}

function resolveValues<T extends PaneConfig>(
  config: T,
  flat: Record<string, PaneValue>,
): ResolvedValues<T> {
  // Before the panel registers (first render) the store is empty; fall back
  // to the config's own defaults so callers never see undefined.
  const defaults = flattenValues(config, "");
  return build(config, "") as ResolvedValues<T>;

  function build(cfg: PaneConfig, prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(normalizeConfig(cfg))) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (entry.type === "action" || entry.type === "slot") continue;
      result[key] =
        entry.type === "folder" ? build(entry.children, path) : (flat[path] ?? defaults[path]);
    }
    return result;
  }
}

/** `{ a: { b: 1 } }` → `{ "a.b": 1 }`, treating `{ type }` and `{ x, y }` objects as leaves. */
function flattenUpdates(nested: Record<string, unknown>, prefix = ""): Record<string, PaneValue> {
  const out: Record<string, PaneValue> = {};
  for (const [key, value] of Object.entries(nested)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isBranch =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !("type" in value) &&
      !("x" in value && "y" in value);
    if (isBranch) Object.assign(out, flattenUpdates(value as Record<string, unknown>, path));
    else out[path] = value as PaneValue;
  }
  return out;
}
