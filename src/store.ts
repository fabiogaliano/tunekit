import {
  flattenValues,
  parseConfig,
  reconcileValues,
  transitionModeOf,
} from "./config.ts";
import type {
  ControlMeta,
  PaneConfig,
  PaneValue,
  PanelOptions,
  PanelState,
  PersistOptions,
  Preset,
  PresetFile,
  PresetWriter,
  ShortcutConfig,
  TransitionMode,
} from "./types.ts";

type PersistTarget = { key: string; storage: "localStorage" | "sessionStorage"; presets: boolean };

type PersistedPanel = {
  version: 1;
  values?: Record<string, PaneValue>;
  baseValues?: Record<string, PaneValue>;
  presets?: Preset[];
  activePresetId?: string | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function attachShortcuts(
  controls: ControlMeta[],
  shortcuts: Record<string, ShortcutConfig>,
): ControlMeta[] {
  return controls.map((c) => ({
    ...c,
    shortcut: shortcuts[c.path],
    children: c.children && attachShortcuts(c.children, shortcuts),
  }));
}

type Listener = () => void;
type ActionListener = (action: string) => void;

const FILE_PREFIX = "file:";
const FILE_WRITE_DELAY = 400;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "preset"
  );
}

const EMPTY_VALUES: Record<string, PaneValue> = Object.freeze({});

class PaneStoreClass {
  private panels = new Map<string, PanelState>();
  private listeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();
  private snapshots = new Map<string, Record<string, PaneValue>>();
  private actionListeners = new Map<string, Set<ActionListener>>();
  private presets = new Map<string, Preset[]>();
  private activePreset = new Map<string, string | null>();
  private baseValues = new Map<string, Record<string, PaneValue>>();
  private slotNodes = new Map<string, HTMLDivElement>();
  private slotListeners = new Map<string, Set<Listener>>();
  private activeTabName: string | null = null;
  private activeTabListeners = new Set<Listener>();
  private defaults = new Map<string, Record<string, PaneValue>>();
  private persistTargets = new Map<string, PersistTarget>();
  private presetWriter: PresetWriter | null = null;
  private pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
  private savedThisSession = new WeakSet<Preset>();

  /** With a writer installed, new presets become files and edits to an active file preset are written back. */
  setPresetWriter(writer: PresetWriter | null): void {
    this.presetWriter = writer;
    this.notifyGlobal();
  }

  canWritePresets(): boolean {
    return this.presetWriter !== null;
  }

  setActiveTab(name: string): void {
    if (this.activeTabName === name) return;
    this.activeTabName = name;
    this.activeTabListeners.forEach((fn) => fn());
  }

  getActiveTab(): string | null {
    return this.activeTabName;
  }

  subscribeActiveTab(listener: Listener): () => void {
    this.activeTabListeners.add(listener);
    return () => this.activeTabListeners.delete(listener);
  }

  registerPanel(
    id: string,
    name: string,
    config: PaneConfig,
    options: PanelOptions = {},
  ): void {
    const shortcuts = options.shortcuts ?? {};
    const controls = attachShortcuts(parseConfig(config, ""), shortcuts);
    const defaults = flattenValues(config, "");
    this.defaults.set(id, defaults);

    const target = this.persistTarget(name, options.persist);
    if (target) this.persistTargets.set(id, target);
    else this.persistTargets.delete(id);
    const saved = target ? this.loadPersisted(target) : null;

    const values = saved?.values ? reconcileValues(saved.values, defaults) : { ...defaults };
    this.panels.set(id, { id, name, controls, values, shortcuts, source: options.source });
    this.snapshots.set(id, { ...values });
    this.baseValues.set(
      id,
      saved?.baseValues ? reconcileValues(saved.baseValues, defaults) : { ...values },
    );
    if (saved?.presets) {
      this.presets.set(
        id,
        saved.presets.map((p) => ({ ...p, values: reconcileValues(p.values, defaults) })),
      );
      this.activePreset.set(id, saved.activePresetId ?? null);
    }
    this.mergeFilePresets(id, options.presets, defaults);
    this.persist(id);
    this.notifyGlobal();
  }

  updatePanel(
    id: string,
    name: string,
    config: PaneConfig,
    options: PanelOptions = {},
  ): void {
    const existing = this.panels.get(id);
    if (!existing) {
      this.registerPanel(id, name, config, options);
      return;
    }

    const shortcuts = options.shortcuts ?? existing.shortcuts;
    const controls = attachShortcuts(parseConfig(config, ""), shortcuts);
    const newDefaults = flattenValues(config, "");
    this.defaults.set(id, newDefaults);
    const nextValues = reconcileValues(existing.values, newDefaults);

    // Base and presets must follow the new shape too, otherwise returning to
    // them drops controls that were added after they were captured.
    const base = this.baseValues.get(id);
    this.baseValues.set(id, reconcileValues(base ?? newDefaults, newDefaults));
    for (const preset of this.presets.get(id) ?? []) {
      preset.values = reconcileValues(preset.values, newDefaults);
    }
    this.mergeFilePresets(id, options.presets, newDefaults);

    const source = options.source ?? existing.source;
    this.panels.set(id, { id, name, controls, values: nextValues, shortcuts, source });
    this.snapshots.set(id, { ...nextValues });
    this.persist(id);
    this.notify(id);
    this.notifyGlobal();
  }

  unregisterPanel(id: string): void {
    const prefix = `${id}:`;
    for (const key of this.slotNodes.keys()) {
      if (key.startsWith(prefix)) {
        this.slotNodes.delete(key);
        this.slotListeners.get(key)?.forEach((fn) => fn());
        this.slotListeners.delete(key);
      }
    }
    this.panels.delete(id);
    this.listeners.delete(id);
    this.snapshots.delete(id);
    this.actionListeners.delete(id);
    this.baseValues.delete(id);
    this.presets.delete(id);
    this.activePreset.delete(id);
    this.defaults.delete(id);
    this.persistTargets.delete(id);
    const pending = this.pendingWrites.get(id);
    if (pending) clearTimeout(pending);
    this.pendingWrites.delete(id);
    this.notifyGlobal();
  }

  /**
   * File presets already in memory keep their values: the session is the source of
   * truth, and a file reloading from our own write-back must not undo newer edits.
   */
  private mergeFilePresets(
    id: string,
    files: PresetFile[] | undefined,
    defaults: Record<string, PaneValue>,
  ): void {
    const current = this.presets.get(id) ?? [];
    if (!files && !current.some((p) => p.file)) return;
    const inMemory = new Map(current.filter((p) => p.file).map((p) => [p.id, p]));
    const fromFiles = (files ?? []).map((f): Preset => {
      const presetId = FILE_PREFIX + slugify(f.name);
      return (
        inMemory.get(presetId) ?? {
          id: presetId,
          name: f.name,
          values: reconcileValues(f.values, defaults),
          file: true,
        }
      );
    });
    // A preset saved this session stays until its file shows up in `presets`.
    const unsynced = [...inMemory.values()].filter((p) => !fromFiles.some((f) => f.id === p.id) && this.savedThisSession.has(p));
    const next = [...fromFiles, ...unsynced, ...current.filter((p) => !p.file)];
    this.presets.set(id, next);
    const active = this.activePreset.get(id);
    if (active && !next.some((p) => p.id === active)) this.activePreset.set(id, null);
  }

  private writeFilePreset(panelId: string, preset: Preset): void {
    const panel = this.panels.get(panelId);
    if (!panel || !this.presetWriter) return;
    const values: Record<string, PaneValue> = {};
    for (const [path, value] of Object.entries(preset.values)) {
      const type = typeof value === "object" && value !== null ? (value as { type?: unknown }).type : null;
      if (type !== "action" && type !== "slot") values[path] = value;
    }
    this.presetWriter({
      panelName: panel.name,
      source: panel.source,
      slug: preset.id.slice(FILE_PREFIX.length),
      preset: { name: preset.name, values },
    });
  }

  private scheduleFileWrite(panelId: string, preset: Preset): void {
    const pending = this.pendingWrites.get(panelId);
    if (pending) clearTimeout(pending);
    this.pendingWrites.set(
      panelId,
      setTimeout(() => {
        this.pendingWrites.delete(panelId);
        this.writeFilePreset(panelId, preset);
      }, FILE_WRITE_DELAY),
    );
  }

  updateValue(panelId: string, path: string, value: PaneValue): void {
    this.updateValues(panelId, { [path]: value });
  }

  /** Write several dot-paths at once with a single notification. */
  updateValues(panelId: string, updates: Record<string, PaneValue>): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    // Edits land in whichever version is active: a preset, or the base.
    const activeId = this.activePreset.get(panelId);
    const activePreset = activeId ? this.presets.get(panelId)?.find((p) => p.id === activeId) : undefined;
    const target = activeId ? activePreset?.values : this.baseValues.get(panelId);

    for (const [path, value] of Object.entries(updates)) {
      if (!(path in panel.values)) continue;
      panel.values[path] = value;
      if (target) target[path] = value;
    }
    if (activePreset?.file) this.scheduleFileWrite(panelId, activePreset);

    this.snapshots.set(panelId, { ...panel.values });
    this.persist(panelId);
    this.notify(panelId);
  }

  /** Restore the config defaults in the active version. */
  resetValues(panelId: string): void {
    const defaults = this.defaults.get(panelId);
    if (defaults) this.updateValues(panelId, { ...defaults });
  }

  getValue(panelId: string, path: string): PaneValue | undefined {
    return this.panels.get(panelId)?.values[path];
  }

  getValues(panelId: string): Record<string, PaneValue> {
    return this.snapshots.get(panelId) ?? EMPTY_VALUES;
  }

  getDefaults(panelId: string): Record<string, PaneValue> {
    return this.defaults.get(panelId) ?? EMPTY_VALUES;
  }

  /** Values without action/slot placeholders, which carry config rather than state. */
  getTunableValues(panelId: string): Record<string, PaneValue> {
    const out: Record<string, PaneValue> = {};
    for (const [path, value] of Object.entries(this.getValues(panelId))) {
      // flattenValues stores the raw config for actions, which PaneValue doesn't model.
      const type = typeof value === "object" && value !== null ? (value as { type?: unknown }).type : null;
      if (type !== "action" && type !== "slot") out[path] = value;
    }
    return out;
  }

  /** Values that differ from the config defaults: what a tuning session actually decided. */
  getChangedValues(panelId: string): Record<string, PaneValue> {
    const defaults = this.getDefaults(panelId);
    const changed: Record<string, PaneValue> = {};
    for (const [path, value] of Object.entries(this.getTunableValues(panelId))) {
      if (JSON.stringify(value) !== JSON.stringify(defaults[path])) changed[path] = value;
    }
    return changed;
  }

  getPanels(): PanelState[] {
    return Array.from(this.panels.values());
  }

  getPanel(id: string): PanelState | undefined {
    return this.panels.get(id);
  }

  subscribe(panelId: string, listener: Listener): () => void {
    let set = this.listeners.get(panelId);
    if (!set) {
      set = new Set();
      this.listeners.set(panelId, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  subscribeGlobal(listener: Listener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  setSlotNode(panelId: string, path: string, node: HTMLDivElement | null): void {
    const key = `${panelId}:${path}`;
    if (node) {
      if (this.slotNodes.get(key) === node) return;
      this.slotNodes.set(key, node);
    } else {
      if (!this.slotNodes.has(key)) return;
      this.slotNodes.delete(key);
    }
    this.slotListeners.get(key)?.forEach((fn) => fn());
  }

  getSlotNode(panelId: string, path: string): HTMLDivElement | null {
    return this.slotNodes.get(`${panelId}:${path}`) ?? null;
  }

  subscribeSlot(panelId: string, path: string, listener: Listener): () => void {
    const key = `${panelId}:${path}`;
    let set = this.slotListeners.get(key);
    if (!set) {
      set = new Set();
      this.slotListeners.set(key, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  subscribeActions(panelId: string, listener: ActionListener): () => void {
    let set = this.actionListeners.get(panelId);
    if (!set) {
      set = new Set();
      this.actionListeners.set(panelId, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  triggerAction(panelId: string, path: string): void {
    this.actionListeners.get(panelId)?.forEach((fn) => fn(path));
  }

  // Presets
  savePreset(panelId: string, name: string): string {
    const panel = this.panels.get(panelId);
    if (!panel) throw new Error(`Panel ${panelId} not found`);

    const existing = this.presets.get(panelId) ?? [];
    let preset: Preset;
    if (this.presetWriter) {
      const taken = new Set(existing.map((p) => p.id));
      const base = slugify(name);
      let slug = base;
      for (let n = 2; taken.has(FILE_PREFIX + slug); n++) slug = `${base}-${n}`;
      preset = { id: FILE_PREFIX + slug, name, values: { ...panel.values }, file: true };
      this.savedThisSession.add(preset);
      // Before local presets, matching where it lands once it loads back from its file.
      const firstLocal = existing.findIndex((p) => !p.file);
      const at = firstLocal === -1 ? existing.length : firstLocal;
      this.presets.set(panelId, [...existing.slice(0, at), preset, ...existing.slice(at)]);
      this.writeFilePreset(panelId, preset);
    } else {
      const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      preset = { id, name, values: { ...panel.values } };
      this.presets.set(panelId, [...existing, preset]);
    }
    const id = preset.id;
    this.activePreset.set(panelId, id);
    this.snapshots.set(panelId, { ...panel.values });
    this.persist(panelId);
    this.notify(panelId);
    return id;
  }

  loadPreset(panelId: string, presetId: string): void {
    const panel = this.panels.get(panelId);
    if (!panel) return;
    const presets = this.presets.get(panelId) ?? [];
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    panel.values = { ...preset.values };
    this.snapshots.set(panelId, { ...panel.values });
    this.activePreset.set(panelId, presetId);
    this.persist(panelId);
    this.notify(panelId);
  }

  deletePreset(panelId: string, presetId: string): void {
    const presets = this.presets.get(panelId) ?? [];
    // Files are removed from the repo, not from a click in the panel.
    if (presets.find((p) => p.id === presetId)?.file) return;
    this.presets.set(
      panelId,
      presets.filter((p) => p.id !== presetId),
    );
    if (this.activePreset.get(panelId) === presetId) {
      this.activePreset.set(panelId, null);
    }
    const panel = this.panels.get(panelId);
    if (panel) this.snapshots.set(panelId, { ...panel.values });
    this.persist(panelId);
    this.notify(panelId);
  }

  clearActivePreset(panelId: string): void {
    const panel = this.panels.get(panelId);
    const base = this.baseValues.get(panelId);
    if (panel && base) {
      panel.values = { ...base };
      this.snapshots.set(panelId, { ...panel.values });
    }
    this.activePreset.set(panelId, null);
    this.persist(panelId);
    this.notify(panelId);
  }

  getPresets(panelId: string): Preset[] {
    return this.presets.get(panelId) ?? [];
  }

  getActivePresetId(panelId: string): string | null {
    return this.activePreset.get(panelId) ?? null;
  }

  getTransitionMode(panelId: string, path: string): TransitionMode {
    return transitionModeOf(this.getValue(panelId, path));
  }

  // Persistence — same stored shape as dialkit's `persist` option.
  private persistTarget(name: string, persist: PersistOptions | undefined): PersistTarget | null {
    if (!persist) return null;
    const o = typeof persist === "object" ? persist : {};
    return {
      key: o.key ?? `tunekit:${name}`,
      storage: o.storage ?? "localStorage",
      presets: o.presets ?? true,
    };
  }

  private storage(kind: PersistTarget["storage"]): Storage | null {
    try {
      return typeof window === "undefined" ? null : window[kind];
    } catch {
      return null;
    }
  }

  private loadPersisted(target: PersistTarget): PersistedPanel | null {
    try {
      const raw = this.storage(target.storage)?.getItem(target.key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== 1) return null;
      const values = isRecord(parsed.values) ? (parsed.values as Record<string, PaneValue>) : undefined;
      if (!target.presets) return { version: 1, values };
      const presets = Array.isArray(parsed.presets)
        ? (parsed.presets as unknown[]).filter(
            (p): p is Preset =>
              isRecord(p) && typeof p.id === "string" && typeof p.name === "string" && isRecord(p.values),
          )
        : [];
      return {
        version: 1,
        values,
        baseValues: isRecord(parsed.baseValues) ? (parsed.baseValues as Record<string, PaneValue>) : values,
        presets,
        activePresetId: presets.some((p) => p.id === parsed.activePresetId)
          ? (parsed.activePresetId as string)
          : null,
      };
    } catch {
      return null;
    }
  }

  private persist(panelId: string): void {
    const target = this.persistTargets.get(panelId);
    const values = this.snapshots.get(panelId);
    if (!target || !values) return;
    const state: PersistedPanel = { version: 1, values };
    if (target.presets) {
      state.baseValues = this.baseValues.get(panelId) ?? values;
      state.presets = (this.presets.get(panelId) ?? []).filter((p) => !p.file);
      const active = this.activePreset.get(panelId) ?? null;
      state.activePresetId = state.presets.some((p) => p.id === active) ? active : null;
    }
    try {
      this.storage(target.storage)?.setItem(target.key, JSON.stringify(state));
    } catch {
      /* quota / privacy mode: keep working in memory */
    }
  }

  private notify(panelId: string): void {
    this.listeners.get(panelId)?.forEach((fn) => fn());
  }

  private notifyGlobal(): void {
    this.globalListeners.forEach((fn) => fn());
  }
}

export const PaneStore = new PaneStoreClass();
