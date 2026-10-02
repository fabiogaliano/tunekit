import { _ as rgbToHsv, a as WAIRO, b as toOklch, c as formatOf, d as gradientCss, f as gradientFromHexes, g as parseSolid, h as parseGradient, i as WAGRAD, l as formatSolid, m as isGradient, n as UIGRADIENTS, o as contrastGrade, p as hsvToRgb, r as CLASSIC, s as contrastRatio, t as WADA, u as fromOklch, v as sampleGradient, x as parseColor, y as toHex } from "./wada-CTQaV08E.mjs";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
/** Pixel coordinates within the visible grid; both axes must be within 8px. */
function padGridIntersection(x, y, width, height) {
	if (width <= 0 || height <= 0) return void 0;
	const column = Math.round(x / width * 6);
	const row = Math.round(y / height * 6);
	if (column < 1 || column >= 6 || row < 1 || row >= 6) return void 0;
	const target = {
		x: column / 6 * width,
		y: row / 6 * height
	};
	return Math.abs(x - target.x) <= 8 && Math.abs(y - target.y) <= 8 ? target : void 0;
}
function resolvePadAxis(config = [
	0,
	-1,
	1,
	.01
]) {
	const [initial, min, max, suppliedStep] = config;
	const step = suppliedStep ?? (max - min) / 200;
	if (![
		initial,
		min,
		max,
		step,
		max - min
	].every(Number.isFinite) || max <= min || step <= 0) throw new RangeError("DialPad axes need finite [default, min, max, step?] values, min < max, and a positive step.");
	const axis = {
		default: initial,
		min,
		max,
		step
	};
	axis.default = snapPadAxis(initial, axis);
	return axis;
}
function snapPadAxis(value, axis) {
	if (!Number.isFinite(value)) return axis.default;
	const clamped = Math.max(axis.min, Math.min(axis.max, value));
	if (clamped === axis.min || clamped === axis.max) return clamped;
	const snapped = axis.min + Math.round((clamped - axis.min) / axis.step) * axis.step;
	return Math.max(axis.min, Math.min(axis.max, Number(snapped.toPrecision(12))));
}
function normalizePadValue(value, config = {}) {
	const axes = {
		x: resolvePadAxis(config.x),
		y: resolvePadAxis(config.y)
	};
	const input = typeof value === "object" && value !== null ? value : {};
	return {
		x: typeof input.x === "number" ? snapPadAxis(input.x, axes.x) : axes.x.default,
		y: typeof input.y === "number" ? snapPadAxis(input.y, axes.y) : axes.y.default
	};
}
/** Screen coordinates: left/bottom are the minima, right/top the maxima. */
function padValueFromPoint(x, y, config = {}) {
	const horizontal = resolvePadAxis(config.x);
	const vertical = resolvePadAxis(config.y);
	return {
		x: snapPadAxis(horizontal.min + x * (horizontal.max - horizontal.min), horizontal),
		y: snapPadAxis(vertical.max - y * (vertical.max - vertical.min), vertical)
	};
}
function padValueFromKey(value, key, shift, config = {}) {
	const axis = key === "ArrowLeft" || key === "ArrowRight" ? "x" : key === "ArrowUp" || key === "ArrowDown" ? "y" : void 0;
	if (!axis) return void 0;
	const range = resolvePadAxis(config[axis]);
	const direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : -1;
	return {
		...value,
		[axis]: snapPadAxis(value[axis] + direction * range.step * (shift ? 10 : 1), range)
	};
}
//#endregion
//#region src/config.ts
/** Same inference dialkit applies to a bare number. */
function inferRange(value) {
	if (value >= 0 && value <= 1) return {
		min: 0,
		max: 1,
		step: .01
	};
	if (value >= 0 && value <= 10) return {
		min: 0,
		max: value * 3 || 10,
		step: .1
	};
	if (value >= 0 && value <= 100) return {
		min: 0,
		max: value * 3 || 100,
		step: 1
	};
	if (value >= 0) return {
		min: 0,
		max: value * 3 || 1e3,
		step: 10
	};
	return {
		min: value * 3,
		max: -value * 3,
		step: 1
	};
}
function toControl(input) {
	if (Array.isArray(input)) {
		const [value, min, max, step] = input;
		return {
			type: "slider",
			value,
			min,
			max,
			step
		};
	}
	if (typeof input === "number") return {
		type: "slider",
		value: input,
		...inferRange(input)
	};
	if (typeof input === "boolean") return {
		type: "toggle",
		value: input
	};
	if (typeof input === "string") {
		if (isGradient(input) && parseGradient(input)) return {
			type: "color",
			value: input,
			gradient: true
		};
		return parseColor(input) && input !== "transparent" ? {
			type: "color",
			value: input
		} : {
			type: "text",
			value: input
		};
	}
	if (typeof input === "object" && input !== null && "type" in input && typeof input.type === "string") {
		const control = input;
		return control.type === "folder" ? {
			...control,
			children: normalizeConfig(control.children)
		} : control;
	}
	const { _collapsed, ...children } = input;
	return {
		type: "folder",
		open: _collapsed === true ? false : true,
		children: normalizeConfig(children)
	};
}
/** Expand shorthand entries into explicit `{ type }` controls (idempotent). */
function normalizeConfig(config) {
	const out = {};
	for (const [key, input] of Object.entries(config)) {
		if (input === void 0) continue;
		out[key] = toControl(input);
	}
	return out;
}
function parseConfig(config, prefix) {
	const controls = [];
	for (const [key, entry] of Object.entries(normalizeConfig(config))) {
		const meta = controlToMeta(entry, prefix ? `${prefix}.${key}` : key, formatLabel(key));
		if (meta) controls.push(meta);
	}
	return controls;
}
function flattenValues(config, prefix) {
	const values = {};
	for (const [key, entry] of Object.entries(normalizeConfig(config))) {
		const path = prefix ? `${prefix}.${key}` : key;
		switch (entry.type) {
			case "slider":
				values[path] = entry.value;
				break;
			case "toggle":
				values[path] = entry.value;
				break;
			case "action":
				values[path] = entry;
				break;
			case "slot": break;
			case "select": {
				const first = entry.options[0];
				const firstValue = typeof first === "string" ? first : first?.value ?? "";
				values[path] = entry.value ?? firstValue;
				break;
			}
			case "color":
				values[path] = entry.value ?? "#000000";
				break;
			case "text":
				values[path] = entry.value ?? "";
				break;
			case "spring":
				values[path] = entry;
				break;
			case "easing":
				values[path] = entry;
				break;
			case "image": {
				const first = entry.options?.[0];
				values[path] = entry.value ?? (typeof first === "string" ? first : first?.value ?? "");
				break;
			}
			case "pad":
				values[path] = normalizePadValue(void 0, entry);
				break;
			case "folder":
				Object.assign(values, flattenValues(entry.children, path));
				break;
		}
	}
	return values;
}
function controlToMeta(entry, path, label) {
	switch (entry.type) {
		case "slider": return {
			type: "slider",
			path,
			label,
			min: entry.min,
			max: entry.max,
			step: entry.step ?? inferStep(entry.min, entry.max)
		};
		case "toggle": return {
			type: "toggle",
			path,
			label
		};
		case "action": return {
			type: "action",
			path,
			label: entry.label ?? label
		};
		case "select": return {
			type: "select",
			path,
			label,
			options: entry.options
		};
		case "color": return {
			type: "color",
			path,
			label,
			gradient: entry.gradient,
			contrast: entry.contrast
		};
		case "text": return {
			type: "text",
			path,
			label,
			placeholder: entry.placeholder
		};
		case "slot": return {
			type: "slot",
			path,
			label: entry.label ?? ""
		};
		case "image": return {
			type: "image",
			path,
			label,
			options: entry.options
		};
		case "pad": return {
			type: "pad",
			path,
			label,
			pad: {
				x: entry.x,
				y: entry.y,
				labels: entry.labels
			}
		};
		case "spring": return {
			type: "transition",
			path,
			label
		};
		case "easing": return {
			type: "transition",
			path,
			label
		};
		case "folder": return {
			type: "folder",
			path,
			label,
			defaultOpen: entry.open ?? true,
			children: parseConfig(entry.children, path)
		};
	}
}
function formatLabel(key) {
	return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}
function inferStep(min, max) {
	const range = max - min;
	if (range <= 1) return .01;
	if (range <= 10) return .1;
	if (range <= 100) return 1;
	return 10;
}
function normalizeSelectOptions(options) {
	return options.map((opt) => typeof opt === "string" ? {
		value: opt,
		label: opt.replace(/\b\w/g, (c) => c.toUpperCase())
	} : opt);
}
function transitionModeOf(value) {
	if (typeof value !== "object" || value === null || !("type" in value)) return "simple";
	if (value.type === "easing") return "easing";
	if (value.type !== "spring") return "simple";
	const hasPhysics = value.stiffness !== void 0 || value.damping !== void 0 || value.mass !== void 0;
	const hasTime = value.visualDuration !== void 0 || value.bounce !== void 0;
	return hasPhysics && !hasTime ? "advanced" : "simple";
}
/** Keep values from `prev` that still exist in `defaults` with the same type. */
function reconcileValues(prev, defaults) {
	const next = {};
	for (const [path, defaultValue] of Object.entries(defaults)) {
		const old = prev[path];
		next[path] = old !== void 0 && typeof old === typeof defaultValue ? old : defaultValue;
	}
	return next;
}
//#endregion
//#region src/store.ts
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function attachShortcuts(controls, shortcuts) {
	return controls.map((c) => ({
		...c,
		shortcut: shortcuts[c.path],
		children: c.children && attachShortcuts(c.children, shortcuts)
	}));
}
const FILE_PREFIX = "file:";
const FILE_WRITE_DELAY = 400;
function slugify(name) {
	return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "preset";
}
const EMPTY_VALUES = Object.freeze({});
var PaneStoreClass = class {
	panels = /* @__PURE__ */ new Map();
	listeners = /* @__PURE__ */ new Map();
	globalListeners = /* @__PURE__ */ new Set();
	snapshots = /* @__PURE__ */ new Map();
	actionListeners = /* @__PURE__ */ new Map();
	presets = /* @__PURE__ */ new Map();
	activePreset = /* @__PURE__ */ new Map();
	baseValues = /* @__PURE__ */ new Map();
	slotNodes = /* @__PURE__ */ new Map();
	slotListeners = /* @__PURE__ */ new Map();
	activeTabName = null;
	activeTabListeners = /* @__PURE__ */ new Set();
	defaults = /* @__PURE__ */ new Map();
	persistTargets = /* @__PURE__ */ new Map();
	presetWriter = null;
	pendingWrites = /* @__PURE__ */ new Map();
	savedThisSession = /* @__PURE__ */ new WeakSet();
	/** With a writer installed, new presets become files and edits to an active file preset are written back. */
	setPresetWriter(writer) {
		this.presetWriter = writer;
		this.notifyGlobal();
	}
	canWritePresets() {
		return this.presetWriter !== null;
	}
	setActiveTab(name) {
		if (this.activeTabName === name) return;
		this.activeTabName = name;
		this.activeTabListeners.forEach((fn) => fn());
	}
	getActiveTab() {
		return this.activeTabName;
	}
	subscribeActiveTab(listener) {
		this.activeTabListeners.add(listener);
		return () => this.activeTabListeners.delete(listener);
	}
	registerPanel(id, name, config, options = {}) {
		const shortcuts = options.shortcuts ?? {};
		const controls = attachShortcuts(parseConfig(config, ""), shortcuts);
		const defaults = flattenValues(config, "");
		this.defaults.set(id, defaults);
		const target = this.persistTarget(name, options.persist);
		if (target) this.persistTargets.set(id, target);
		else this.persistTargets.delete(id);
		const saved = target ? this.loadPersisted(target) : null;
		const values = saved?.values ? reconcileValues(saved.values, defaults) : { ...defaults };
		this.panels.set(id, {
			id,
			name,
			controls,
			values,
			shortcuts,
			source: options.source
		});
		this.snapshots.set(id, { ...values });
		this.baseValues.set(id, saved?.baseValues ? reconcileValues(saved.baseValues, defaults) : { ...values });
		if (saved?.presets) {
			this.presets.set(id, saved.presets.map((p) => ({
				...p,
				values: reconcileValues(p.values, defaults)
			})));
			this.activePreset.set(id, saved.activePresetId ?? null);
		}
		this.mergeFilePresets(id, options.presets, defaults);
		this.persist(id);
		this.notifyGlobal();
	}
	updatePanel(id, name, config, options = {}) {
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
		const base = this.baseValues.get(id);
		this.baseValues.set(id, reconcileValues(base ?? newDefaults, newDefaults));
		for (const preset of this.presets.get(id) ?? []) preset.values = reconcileValues(preset.values, newDefaults);
		this.mergeFilePresets(id, options.presets, newDefaults);
		const source = options.source ?? existing.source;
		this.panels.set(id, {
			id,
			name,
			controls,
			values: nextValues,
			shortcuts,
			source
		});
		this.snapshots.set(id, { ...nextValues });
		this.persist(id);
		this.notify(id);
		this.notifyGlobal();
	}
	unregisterPanel(id) {
		const prefix = `${id}:`;
		for (const key of this.slotNodes.keys()) if (key.startsWith(prefix)) {
			this.slotNodes.delete(key);
			this.slotListeners.get(key)?.forEach((fn) => fn());
			this.slotListeners.delete(key);
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
	mergeFilePresets(id, files, defaults) {
		const current = this.presets.get(id) ?? [];
		if (!files && !current.some((p) => p.file)) return;
		const inMemory = new Map(current.filter((p) => p.file).map((p) => [p.id, p]));
		const fromFiles = (files ?? []).map((f) => {
			const presetId = FILE_PREFIX + slugify(f.name);
			return inMemory.get(presetId) ?? {
				id: presetId,
				name: f.name,
				values: reconcileValues(f.values, defaults),
				file: true
			};
		});
		const unsynced = [...inMemory.values()].filter((p) => !fromFiles.some((f) => f.id === p.id) && this.savedThisSession.has(p));
		const next = [
			...fromFiles,
			...unsynced,
			...current.filter((p) => !p.file)
		];
		this.presets.set(id, next);
		const active = this.activePreset.get(id);
		if (active && !next.some((p) => p.id === active)) this.activePreset.set(id, null);
	}
	writeFilePreset(panelId, preset) {
		const panel = this.panels.get(panelId);
		if (!panel || !this.presetWriter) return;
		const values = {};
		for (const [path, value] of Object.entries(preset.values)) {
			const type = typeof value === "object" && value !== null ? value.type : null;
			if (type !== "action" && type !== "slot") values[path] = value;
		}
		this.presetWriter({
			panelName: panel.name,
			source: panel.source,
			slug: preset.id.slice(5),
			preset: {
				name: preset.name,
				values
			}
		});
	}
	scheduleFileWrite(panelId, preset) {
		const pending = this.pendingWrites.get(panelId);
		if (pending) clearTimeout(pending);
		this.pendingWrites.set(panelId, setTimeout(() => {
			this.pendingWrites.delete(panelId);
			this.writeFilePreset(panelId, preset);
		}, FILE_WRITE_DELAY));
	}
	updateValue(panelId, path, value) {
		this.updateValues(panelId, { [path]: value });
	}
	/** Write several dot-paths at once with a single notification. */
	updateValues(panelId, updates) {
		const panel = this.panels.get(panelId);
		if (!panel) return;
		const activeId = this.activePreset.get(panelId);
		const activePreset = activeId ? this.presets.get(panelId)?.find((p) => p.id === activeId) : void 0;
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
	resetValues(panelId) {
		const defaults = this.defaults.get(panelId);
		if (defaults) this.updateValues(panelId, { ...defaults });
	}
	getValue(panelId, path) {
		return this.panels.get(panelId)?.values[path];
	}
	getValues(panelId) {
		return this.snapshots.get(panelId) ?? EMPTY_VALUES;
	}
	getDefaults(panelId) {
		return this.defaults.get(panelId) ?? EMPTY_VALUES;
	}
	/** Values without action/slot placeholders, which carry config rather than state. */
	getTunableValues(panelId) {
		const out = {};
		for (const [path, value] of Object.entries(this.getValues(panelId))) {
			const type = typeof value === "object" && value !== null ? value.type : null;
			if (type !== "action" && type !== "slot") out[path] = value;
		}
		return out;
	}
	/** Values that differ from the config defaults: what a tuning session actually decided. */
	getChangedValues(panelId) {
		const defaults = this.getDefaults(panelId);
		const changed = {};
		for (const [path, value] of Object.entries(this.getTunableValues(panelId))) if (JSON.stringify(value) !== JSON.stringify(defaults[path])) changed[path] = value;
		return changed;
	}
	getPanels() {
		return Array.from(this.panels.values());
	}
	getPanel(id) {
		return this.panels.get(id);
	}
	subscribe(panelId, listener) {
		let set = this.listeners.get(panelId);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.listeners.set(panelId, set);
		}
		set.add(listener);
		return () => set.delete(listener);
	}
	subscribeGlobal(listener) {
		this.globalListeners.add(listener);
		return () => this.globalListeners.delete(listener);
	}
	setSlotNode(panelId, path, node) {
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
	getSlotNode(panelId, path) {
		return this.slotNodes.get(`${panelId}:${path}`) ?? null;
	}
	subscribeSlot(panelId, path, listener) {
		const key = `${panelId}:${path}`;
		let set = this.slotListeners.get(key);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.slotListeners.set(key, set);
		}
		set.add(listener);
		return () => set.delete(listener);
	}
	subscribeActions(panelId, listener) {
		let set = this.actionListeners.get(panelId);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.actionListeners.set(panelId, set);
		}
		set.add(listener);
		return () => set.delete(listener);
	}
	triggerAction(panelId, path) {
		this.actionListeners.get(panelId)?.forEach((fn) => fn(path));
	}
	savePreset(panelId, name) {
		const panel = this.panels.get(panelId);
		if (!panel) throw new Error(`Panel ${panelId} not found`);
		const existing = this.presets.get(panelId) ?? [];
		let preset;
		if (this.presetWriter) {
			const taken = new Set(existing.map((p) => p.id));
			const base = slugify(name);
			let slug = base;
			for (let n = 2; taken.has(FILE_PREFIX + slug); n++) slug = `${base}-${n}`;
			preset = {
				id: FILE_PREFIX + slug,
				name,
				values: { ...panel.values },
				file: true
			};
			this.savedThisSession.add(preset);
			const firstLocal = existing.findIndex((p) => !p.file);
			const at = firstLocal === -1 ? existing.length : firstLocal;
			this.presets.set(panelId, [
				...existing.slice(0, at),
				preset,
				...existing.slice(at)
			]);
			this.writeFilePreset(panelId, preset);
		} else {
			preset = {
				id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				name,
				values: { ...panel.values }
			};
			this.presets.set(panelId, [...existing, preset]);
		}
		const id = preset.id;
		this.activePreset.set(panelId, id);
		this.snapshots.set(panelId, { ...panel.values });
		this.persist(panelId);
		this.notify(panelId);
		return id;
	}
	loadPreset(panelId, presetId) {
		const panel = this.panels.get(panelId);
		if (!panel) return;
		const preset = (this.presets.get(panelId) ?? []).find((p) => p.id === presetId);
		if (!preset) return;
		panel.values = { ...preset.values };
		this.snapshots.set(panelId, { ...panel.values });
		this.activePreset.set(panelId, presetId);
		this.persist(panelId);
		this.notify(panelId);
	}
	deletePreset(panelId, presetId) {
		const presets = this.presets.get(panelId) ?? [];
		if (presets.find((p) => p.id === presetId)?.file) return;
		this.presets.set(panelId, presets.filter((p) => p.id !== presetId));
		if (this.activePreset.get(panelId) === presetId) this.activePreset.set(panelId, null);
		const panel = this.panels.get(panelId);
		if (panel) this.snapshots.set(panelId, { ...panel.values });
		this.persist(panelId);
		this.notify(panelId);
	}
	clearActivePreset(panelId) {
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
	getPresets(panelId) {
		return this.presets.get(panelId) ?? [];
	}
	getActivePresetId(panelId) {
		return this.activePreset.get(panelId) ?? null;
	}
	getTransitionMode(panelId, path) {
		return transitionModeOf(this.getValue(panelId, path));
	}
	persistTarget(name, persist) {
		if (!persist) return null;
		const o = typeof persist === "object" ? persist : {};
		return {
			key: o.key ?? `tunekit:${name}`,
			storage: o.storage ?? "localStorage",
			presets: o.presets ?? true
		};
	}
	storage(kind) {
		try {
			return typeof window === "undefined" ? null : window[kind];
		} catch {
			return null;
		}
	}
	loadPersisted(target) {
		try {
			const raw = this.storage(target.storage)?.getItem(target.key);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!isRecord(parsed) || parsed.version !== 1) return null;
			const values = isRecord(parsed.values) ? parsed.values : void 0;
			if (!target.presets) return {
				version: 1,
				values
			};
			const presets = Array.isArray(parsed.presets) ? parsed.presets.filter((p) => isRecord(p) && typeof p.id === "string" && typeof p.name === "string" && isRecord(p.values)) : [];
			return {
				version: 1,
				values,
				baseValues: isRecord(parsed.baseValues) ? parsed.baseValues : values,
				presets,
				activePresetId: presets.some((p) => p.id === parsed.activePresetId) ? parsed.activePresetId : null
			};
		} catch {
			return null;
		}
	}
	persist(panelId) {
		const target = this.persistTargets.get(panelId);
		const values = this.snapshots.get(panelId);
		if (!target || !values) return;
		const state = {
			version: 1,
			values
		};
		if (target.presets) {
			state.baseValues = this.baseValues.get(panelId) ?? values;
			state.presets = (this.presets.get(panelId) ?? []).filter((p) => !p.file);
			const active = this.activePreset.get(panelId) ?? null;
			state.activePresetId = state.presets.some((p) => p.id === active) ? active : null;
		}
		try {
			this.storage(target.storage)?.setItem(target.key, JSON.stringify(state));
		} catch {}
	}
	notify(panelId) {
		this.listeners.get(panelId)?.forEach((fn) => fn());
	}
	notifyGlobal() {
		this.globalListeners.forEach((fn) => fn());
	}
};
const PaneStore = new PaneStoreClass();
//#endregion
//#region src/react/usePane.ts
function usePane(name, config, options) {
	return usePaneController(name, config, options).values;
}
function usePaneController(name, config, options) {
	const instanceId = useId();
	const panelId = options?.id ?? `${name}-${instanceId}`;
	const configRef = useRef(config);
	configRef.current = config;
	const serialized = JSON.stringify(config);
	const [source] = useState(callerModule);
	const panelOptions = {
		persist: options?.persist,
		presets: options?.presets,
		shortcuts: options?.shortcuts,
		source
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
	}, [
		panelId,
		name,
		serialized,
		serializedOptions
	]);
	useEffect(() => {
		return PaneStore.subscribeActions(panelId, (action) => {
			onActionRef.current?.(action);
		});
	}, [panelId]);
	const flat = useSyncExternalStore((cb) => PaneStore.subscribe(panelId, cb), () => PaneStore.getValues(panelId), () => PaneStore.getValues(panelId));
	const values = useMemo(() => resolveValues(configRef.current, flat), [flat, serialized]);
	const setValue = useCallback((path, value) => PaneStore.updateValue(panelId, path, value), [panelId]);
	const setValues = useCallback((nested) => PaneStore.updateValues(panelId, flattenUpdates(nested)), [panelId]);
	const resetValues = useCallback(() => PaneStore.resetValues(panelId), [panelId]);
	const getValues = useCallback(() => resolveValues(configRef.current, PaneStore.getValues(panelId)), [panelId]);
	return useMemo(() => ({
		id: panelId,
		values,
		getValues,
		setValue,
		setValues,
		resetValues
	}), [
		panelId,
		values,
		getValues,
		setValue,
		setValues,
		resetValues
	]);
}
/**
* The module that called usePane, from the stack: the first frame outside this
* file. Only the file is kept; dev transforms shift line numbers, so a line
* would point at the wrong place.
*/
function callerModule() {
	const urls = ((/* @__PURE__ */ new Error()).stack ?? "").split("\n").map((line) => line.match(/((?:https?|file):\/\/[^\s)]+?)(?::\d+){1,2}\)?\s*$/)?.[1]).filter((url) => !!url);
	const own = urls[0];
	const caller = urls.find((url) => url !== own && !url.includes("/node_modules/"));
	if (!caller) return void 0;
	try {
		const { pathname } = new URL(caller);
		return decodeURIComponent(pathname.startsWith("/@fs/") ? pathname.slice(4) : pathname.slice(1));
	} catch {
		return;
	}
}
function resolveValues(config, flat) {
	const defaults = flattenValues(config, "");
	return build(config, "");
	function build(cfg, prefix) {
		const result = {};
		for (const [key, entry] of Object.entries(normalizeConfig(cfg))) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (entry.type === "action" || entry.type === "slot") continue;
			result[key] = entry.type === "folder" ? build(entry.children, path) : flat[path] ?? defaults[path];
		}
		return result;
	}
}
/** `{ a: { b: 1 } }` → `{ "a.b": 1 }`, treating `{ type }` and `{ x, y }` objects as leaves. */
function flattenUpdates(nested, prefix = "") {
	const out = {};
	for (const [key, value] of Object.entries(nested)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "object" && value !== null && !Array.isArray(value) && !("type" in value) && !("x" in value && "y" in value)) Object.assign(out, flattenUpdates(value, path));
		else out[path] = value;
	}
	return out;
}
//#endregion
//#region node_modules/.pnpm/preact@10.29.0/node_modules/preact/dist/preact.mjs
var n, l$1, u$2, i$2, r$1, o$2, e$1, f$2, c$1, s$1, a$1, p$1 = {}, v$1 = [], y$1 = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, d$1 = Array.isArray;
function w$1(n, l) {
	for (var u in l) n[u] = l[u];
	return n;
}
function g$1(n) {
	n && n.parentNode && n.parentNode.removeChild(n);
}
function _$1(l, u, t) {
	var i, r, o, e = {};
	for (o in u) "key" == o ? i = u[o] : "ref" == o ? r = u[o] : e[o] = u[o];
	if (arguments.length > 2 && (e.children = arguments.length > 3 ? n.call(arguments, 2) : t), "function" == typeof l && null != l.defaultProps) for (o in l.defaultProps) void 0 === e[o] && (e[o] = l.defaultProps[o]);
	return m$1(l, e, i, r, null);
}
function m$1(n, t, i, r, o) {
	var e = {
		type: n,
		props: t,
		key: i,
		ref: r,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: void 0,
		__v: null == o ? ++u$2 : o,
		__i: -1,
		__u: 0
	};
	return null == o && null != l$1.vnode && l$1.vnode(e), e;
}
function k$1(n) {
	return n.children;
}
function x(n, l) {
	this.props = n, this.context = l;
}
function S(n, l) {
	if (null == l) return n.__ ? S(n.__, n.__i + 1) : null;
	for (var u; l < n.__k.length; l++) if (null != (u = n.__k[l]) && null != u.__e) return u.__e;
	return "function" == typeof n.type ? S(n) : null;
}
function C$2(n) {
	if (n.__P && n.__d) {
		var u = n.__v, t = u.__e, i = [], r = [], o = w$1({}, u);
		o.__v = u.__v + 1, l$1.vnode && l$1.vnode(o), z$1(n.__P, o, u, n.__n, n.__P.namespaceURI, 32 & u.__u ? [t] : null, i, null == t ? S(u) : t, !!(32 & u.__u), r), o.__v = u.__v, o.__.__k[o.__i] = o, V$1(i, o, r), u.__e = u.__ = null, o.__e != t && M$1(o);
	}
}
function M$1(n) {
	if (null != (n = n.__) && null != n.__c) return n.__e = n.__c.base = null, n.__k.some(function(l) {
		if (null != l && null != l.__e) return n.__e = n.__c.base = l.__e;
	}), M$1(n);
}
function $$1(n) {
	(!n.__d && (n.__d = !0) && i$2.push(n) && !I.__r++ || r$1 != l$1.debounceRendering) && ((r$1 = l$1.debounceRendering) || o$2)(I);
}
function I() {
	try {
		for (var n, l = 1; i$2.length;) i$2.length > l && i$2.sort(e$1), n = i$2.shift(), l = i$2.length, C$2(n);
	} finally {
		i$2.length = I.__r = 0;
	}
}
function P$1(n, l, u, t, i, r, o, e, f, c, s) {
	var a, h, y, d, w, g, _, m = t && t.__k || v$1, b = l.length;
	for (f = A$2(u, l, m, f, b), a = 0; a < b; a++) null != (y = u.__k[a]) && (h = -1 != y.__i && m[y.__i] || p$1, y.__i = a, g = z$1(n, y, h, i, r, o, e, f, c, s), d = y.__e, y.ref && h.ref != y.ref && (h.ref && D$1(h.ref, null, y), s.push(y.ref, y.__c || d, y)), null == w && null != d && (w = d), (_ = !!(4 & y.__u)) || h.__k === y.__k ? f = H$1(y, f, n, _) : "function" == typeof y.type && void 0 !== g ? f = g : d && (f = d.nextSibling), y.__u &= -7);
	return u.__e = w, f;
}
function A$2(n, l, u, t, i) {
	var r, o, e, f, c, s = u.length, a = s, h = 0;
	for (n.__k = new Array(i), r = 0; r < i; r++) null != (o = l[r]) && "boolean" != typeof o && "function" != typeof o ? ("string" == typeof o || "number" == typeof o || "bigint" == typeof o || o.constructor == String ? o = n.__k[r] = m$1(null, o, null, null, null) : d$1(o) ? o = n.__k[r] = m$1(k$1, { children: o }, null, null, null) : void 0 === o.constructor && o.__b > 0 ? o = n.__k[r] = m$1(o.type, o.props, o.key, o.ref ? o.ref : null, o.__v) : n.__k[r] = o, f = r + h, o.__ = n, o.__b = n.__b + 1, e = null, -1 != (c = o.__i = T$2(o, u, f, a)) && (a--, (e = u[c]) && (e.__u |= 2)), null == e || null == e.__v ? (-1 == c && (i > s ? h-- : i < s && h++), "function" != typeof o.type && (o.__u |= 4)) : c != f && (c == f - 1 ? h-- : c == f + 1 ? h++ : (c > f ? h-- : h++, o.__u |= 4))) : n.__k[r] = null;
	if (a) for (r = 0; r < s; r++) null != (e = u[r]) && 0 == (2 & e.__u) && (e.__e == t && (t = S(e)), E$1(e, e));
	return t;
}
function H$1(n, l, u, t) {
	var i, r;
	if ("function" == typeof n.type) {
		for (i = n.__k, r = 0; i && r < i.length; r++) i[r] && (i[r].__ = n, l = H$1(i[r], l, u, t));
		return l;
	}
	n.__e != l && (t && (l && n.type && !l.parentNode && (l = S(n)), u.insertBefore(n.__e, l || null)), l = n.__e);
	do
		l = l && l.nextSibling;
	while (null != l && 8 == l.nodeType);
	return l;
}
function L$1(n, l) {
	return l = l || [], null == n || "boolean" == typeof n || (d$1(n) ? n.some(function(n) {
		L$1(n, l);
	}) : l.push(n)), l;
}
function T$2(n, l, u, t) {
	var i, r, o, e = n.key, f = n.type, c = l[u], s = null != c && 0 == (2 & c.__u);
	if (null === c && null == e || s && e == c.key && f == c.type) return u;
	if (t > (s ? 1 : 0)) {
		for (i = u - 1, r = u + 1; i >= 0 || r < l.length;) if (null != (c = l[o = i >= 0 ? i-- : r++]) && 0 == (2 & c.__u) && e == c.key && f == c.type) return o;
	}
	return -1;
}
function j$2(n, l, u) {
	"-" == l[0] ? n.setProperty(l, null == u ? "" : u) : n[l] = null == u ? "" : "number" != typeof u || y$1.test(l) ? u : u + "px";
}
function F$1(n, l, u, t, i) {
	var r, o;
	n: if ("style" == l) if ("string" == typeof u) n.style.cssText = u;
	else {
		if ("string" == typeof t && (n.style.cssText = t = ""), t) for (l in t) u && l in u || j$2(n.style, l, "");
		if (u) for (l in u) t && u[l] == t[l] || j$2(n.style, l, u[l]);
	}
	else if ("o" == l[0] && "n" == l[1]) r = l != (l = l.replace(f$2, "$1")), o = l.toLowerCase(), l = o in n || "onFocusOut" == l || "onFocusIn" == l ? o.slice(2) : l.slice(2), n.l || (n.l = {}), n.l[l + r] = u, u ? t ? u.u = t.u : (u.u = c$1, n.addEventListener(l, r ? a$1 : s$1, r)) : n.removeEventListener(l, r ? a$1 : s$1, r);
	else {
		if ("http://www.w3.org/2000/svg" == i) l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
		else if ("width" != l && "height" != l && "href" != l && "list" != l && "form" != l && "tabIndex" != l && "download" != l && "rowSpan" != l && "colSpan" != l && "role" != l && "popover" != l && l in n) try {
			n[l] = null == u ? "" : u;
			break n;
		} catch (n) {}
		"function" == typeof u || (null == u || !1 === u && "-" != l[4] ? n.removeAttribute(l) : n.setAttribute(l, "popover" == l && 1 == u ? "" : u));
	}
}
function O$1(n) {
	return function(u) {
		if (this.l) {
			var t = this.l[u.type + n];
			if (null == u.t) u.t = c$1++;
			else if (u.t < t.u) return;
			return t(l$1.event ? l$1.event(u) : u);
		}
	};
}
function z$1(n, u, t, i, r, o, e, f, c, s) {
	var a, h, p, y, _, m, b, S, C, M, $, I, A, H, L, T = u.type;
	if (void 0 !== u.constructor) return null;
	128 & t.__u && (c = !!(32 & t.__u), o = [f = u.__e = t.__e]), (a = l$1.__b) && a(u);
	n: if ("function" == typeof T) try {
		if (S = u.props, C = T.prototype && T.prototype.render, M = (a = T.contextType) && i[a.__c], $ = a ? M ? M.props.value : a.__ : i, t.__c ? b = (h = u.__c = t.__c).__ = h.__E : (C ? u.__c = h = new T(S, $) : (u.__c = h = new x(S, $), h.constructor = T, h.render = G$1), M && M.sub(h), h.state || (h.state = {}), h.__n = i, p = h.__d = !0, h.__h = [], h._sb = []), C && null == h.__s && (h.__s = h.state), C && null != T.getDerivedStateFromProps && (h.__s == h.state && (h.__s = w$1({}, h.__s)), w$1(h.__s, T.getDerivedStateFromProps(S, h.__s))), y = h.props, _ = h.state, h.__v = u, p) C && null == T.getDerivedStateFromProps && null != h.componentWillMount && h.componentWillMount(), C && null != h.componentDidMount && h.__h.push(h.componentDidMount);
		else {
			if (C && null == T.getDerivedStateFromProps && S !== y && null != h.componentWillReceiveProps && h.componentWillReceiveProps(S, $), u.__v == t.__v || !h.__e && null != h.shouldComponentUpdate && !1 === h.shouldComponentUpdate(S, h.__s, $)) {
				u.__v != t.__v && (h.props = S, h.state = h.__s, h.__d = !1), u.__e = t.__e, u.__k = t.__k, u.__k.some(function(n) {
					n && (n.__ = u);
				}), v$1.push.apply(h.__h, h._sb), h._sb = [], h.__h.length && e.push(h);
				break n;
			}
			null != h.componentWillUpdate && h.componentWillUpdate(S, h.__s, $), C && null != h.componentDidUpdate && h.__h.push(function() {
				h.componentDidUpdate(y, _, m);
			});
		}
		if (h.context = $, h.props = S, h.__P = n, h.__e = !1, I = l$1.__r, A = 0, C) h.state = h.__s, h.__d = !1, I && I(u), a = h.render(h.props, h.state, h.context), v$1.push.apply(h.__h, h._sb), h._sb = [];
		else do
			h.__d = !1, I && I(u), a = h.render(h.props, h.state, h.context), h.state = h.__s;
		while (h.__d && ++A < 25);
		h.state = h.__s, null != h.getChildContext && (i = w$1(w$1({}, i), h.getChildContext())), C && !p && null != h.getSnapshotBeforeUpdate && (m = h.getSnapshotBeforeUpdate(y, _)), H = null != a && a.type === k$1 && null == a.key ? q$2(a.props.children) : a, f = P$1(n, d$1(H) ? H : [H], u, t, i, r, o, e, f, c, s), h.base = u.__e, u.__u &= -161, h.__h.length && e.push(h), b && (h.__E = h.__ = null);
	} catch (n) {
		if (u.__v = null, c || null != o) if (n.then) {
			for (u.__u |= c ? 160 : 128; f && 8 == f.nodeType && f.nextSibling;) f = f.nextSibling;
			o[o.indexOf(f)] = null, u.__e = f;
		} else {
			for (L = o.length; L--;) g$1(o[L]);
			N(u);
		}
		else u.__e = t.__e, u.__k = t.__k, n.then || N(u);
		l$1.__e(n, u, t);
	}
	else null == o && u.__v == t.__v ? (u.__k = t.__k, u.__e = t.__e) : f = u.__e = B$2(t.__e, u, t, i, r, o, e, c, s);
	return (a = l$1.diffed) && a(u), 128 & u.__u ? void 0 : f;
}
function N(n) {
	n && (n.__c && (n.__c.__e = !0), n.__k && n.__k.some(N));
}
function V$1(n, u, t) {
	for (var i = 0; i < t.length; i++) D$1(t[i], t[++i], t[++i]);
	l$1.__c && l$1.__c(u, n), n.some(function(u) {
		try {
			n = u.__h, u.__h = [], n.some(function(n) {
				n.call(u);
			});
		} catch (n) {
			l$1.__e(n, u.__v);
		}
	});
}
function q$2(n) {
	return "object" != typeof n || null == n || n.__b > 0 ? n : d$1(n) ? n.map(q$2) : w$1({}, n);
}
function B$2(u, t, i, r, o, e, f, c, s) {
	var a, h, v, y, w, _, m, b = i.props || p$1, k = t.props, x = t.type;
	if ("svg" == x ? o = "http://www.w3.org/2000/svg" : "math" == x ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), null != e) {
		for (a = 0; a < e.length; a++) if ((w = e[a]) && "setAttribute" in w == !!x && (x ? w.localName == x : 3 == w.nodeType)) {
			u = w, e[a] = null;
			break;
		}
	}
	if (null == u) {
		if (null == x) return document.createTextNode(k);
		u = document.createElementNS(o, x, k.is && k), c && (l$1.__m && l$1.__m(t, e), c = !1), e = null;
	}
	if (null == x) b === k || c && u.data == k || (u.data = k);
	else {
		if (e = e && n.call(u.childNodes), !c && null != e) for (b = {}, a = 0; a < u.attributes.length; a++) b[(w = u.attributes[a]).name] = w.value;
		for (a in b) w = b[a], "dangerouslySetInnerHTML" == a ? v = w : "children" == a || a in k || "value" == a && "defaultValue" in k || "checked" == a && "defaultChecked" in k || F$1(u, a, null, w, o);
		for (a in k) w = k[a], "children" == a ? y = w : "dangerouslySetInnerHTML" == a ? h = w : "value" == a ? _ = w : "checked" == a ? m = w : c && "function" != typeof w || b[a] === w || F$1(u, a, w, b[a], o);
		if (h) c || v && (h.__html == v.__html || h.__html == u.innerHTML) || (u.innerHTML = h.__html), t.__k = [];
		else if (v && (u.innerHTML = ""), P$1("template" == t.type ? u.content : u, d$1(y) ? y : [y], t, i, r, "foreignObject" == x ? "http://www.w3.org/1999/xhtml" : o, e, f, e ? e[0] : i.__k && S(i, 0), c, s), null != e) for (a = e.length; a--;) g$1(e[a]);
		c || (a = "value", "progress" == x && null == _ ? u.removeAttribute("value") : null != _ && (_ !== u[a] || "progress" == x && !_ || "option" == x && _ != b[a]) && F$1(u, a, _, b[a], o), a = "checked", null != m && m != u[a] && F$1(u, a, m, b[a], o));
	}
	return u;
}
function D$1(n, u, t) {
	try {
		if ("function" == typeof n) {
			var i = "function" == typeof n.__u;
			i && n.__u(), i && null == u || (n.__u = n(u));
		} else n.current = u;
	} catch (n) {
		l$1.__e(n, t);
	}
}
function E$1(n, u, t) {
	var i, r;
	if (l$1.unmount && l$1.unmount(n), (i = n.ref) && (i.current && i.current != n.__e || D$1(i, null, u)), null != (i = n.__c)) {
		if (i.componentWillUnmount) try {
			i.componentWillUnmount();
		} catch (n) {
			l$1.__e(n, u);
		}
		i.base = i.__P = null;
	}
	if (i = n.__k) for (r = 0; r < i.length; r++) i[r] && E$1(i[r], u, t || "function" != typeof n.type);
	t || g$1(n.__e), n.__c = n.__ = n.__e = void 0;
}
function G$1(n, l, u) {
	return this.constructor(n, u);
}
function J$1(u, t, i) {
	var r, o, e, f;
	t == document && (t = document.documentElement), l$1.__ && l$1.__(u, t), o = (r = "function" == typeof i) ? null : i && i.__k || t.__k, e = [], f = [], z$1(t, u = (!r && i || t).__k = _$1(k$1, null, [u]), o || p$1, p$1, t.namespaceURI, !r && i ? [i] : o ? null : t.firstChild ? n.call(t.childNodes) : null, e, !r && i ? i : o ? o.__e : t.firstChild, r, f), V$1(e, u, f);
}
n = v$1.slice, l$1 = { __e: function(n, l, u, t) {
	for (var i, r, o; l = l.__;) if ((i = l.__c) && !i.__) try {
		if ((r = i.constructor) && null != r.getDerivedStateFromError && (i.setState(r.getDerivedStateFromError(n)), o = i.__d), null != i.componentDidCatch && (i.componentDidCatch(n, t || {}), o = i.__d), o) return i.__E = i;
	} catch (l) {
		n = l;
	}
	throw n;
} }, u$2 = 0, x.prototype.setState = function(n, l) {
	var u = null != this.__s && this.__s != this.state ? this.__s : this.__s = w$1({}, this.state);
	"function" == typeof n && (n = n(w$1({}, u), this.props)), n && w$1(u, n), null != n && this.__v && (l && this._sb.push(l), $$1(this));
}, x.prototype.forceUpdate = function(n) {
	this.__v && (this.__e = !0, n && this.__h.push(n), $$1(this));
}, x.prototype.render = k$1, i$2 = [], o$2 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e$1 = function(n, l) {
	return n.__v.__b - l.__v.__b;
}, I.__r = 0, f$2 = /(PointerCapture)$|Capture$/i, c$1 = 0, s$1 = O$1(!1), a$1 = O$1(!0);
//#endregion
//#region src/styles.ts
const STYLES = `
:host {
  all: initial;
  font-family: system-ui, -apple-system, 'SF Pro Display', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ------------------------------------------------------------------ */
/* Variables                                                          */
/* ------------------------------------------------------------------ */

.up-root,
.up-portal {
  --up-bg: #0A0A0A;
  --up-surface: #141414;
  --up-surface-hover: #1a1a1a;
  --up-surface-active: #1e1e1e;
  --up-border: #1e1e1e;
  --up-border-hover: #2a2a2a;
  --up-text-1: #ffffff;
  --up-text-2: #d4d4d4;
  --up-text-3: #a3a3a3;
  --up-text-4: #737373;
  --up-radius: 8px;
  --up-row-h: 36px;
  --up-transition: 0.15s ease;

  font-size: 13px;
  line-height: 1.4;
  color: var(--up-text-2);
}

/* ------------------------------------------------------------------ */
/* Shell                                                              */
/* ------------------------------------------------------------------ */

.up-shell {
  position: fixed;
  z-index: 2147483647;
  background: var(--up-bg);
  border: 1px solid var(--up-border);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 24px);
  transition: transform 0.25s cubic-bezier(0,0,0.2,1);
  user-select: none;
}

.up-shell-dragging {
  transition: none !important;
}

.up-content {
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  flex: 1;
  padding: 0 12px 12px;
  scrollbar-width: none;
}

.up-content::-webkit-scrollbar { display: none; }

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

.up-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  cursor: grab;
  border-bottom: 1px solid var(--up-border);
  flex-shrink: 0;
}

.up-header:active { cursor: grabbing; }

.up-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.up-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--up-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.up-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--up-text-4);
  cursor: pointer;
  transition: color var(--up-transition), background var(--up-transition);
}

.up-header-btn:hover {
  color: var(--up-text-2);
  background: var(--up-surface);
}

.up-header-btn svg {
  width: 14px;
  height: 14px;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                               */
/* ------------------------------------------------------------------ */

.up-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--up-border);
  flex-shrink: 0;
}

.up-tab {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--up-text-4);
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: color var(--up-transition), background var(--up-transition);
}

.up-tab:hover { color: var(--up-text-3); background: var(--up-surface); }
.up-tab-active { color: var(--up-text-2); background: var(--up-surface-active); }

/* ------------------------------------------------------------------ */
/* Collapsed tab                                                      */
/* ------------------------------------------------------------------ */

/* Edge-docked handle: flush to the screen edge it was dragged off, rounded
   on the inner side only, so it reads as a drawer pull rather than a button. */
.up-collapsed {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font: inherit;
  color: var(--up-text-3);
  background: linear-gradient(180deg, #151515, var(--up-bg));
  border: 1px solid var(--up-border-hover);
  box-shadow: 0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04);
  cursor: pointer;
  touch-action: none;
  transition:
    left 0.3s cubic-bezier(0.2, 0.9, 0.3, 1),
    top 0.3s cubic-bezier(0.2, 0.9, 0.3, 1),
    width 0.2s cubic-bezier(0,0,0.2,1),
    height 0.2s cubic-bezier(0,0,0.2,1),
    transform 0.2s cubic-bezier(0,0,0.2,1),
    color 0.15s, background 0.15s, box-shadow 0.2s;
}


.up-collapsed-dragging {
  transition: none;
  cursor: grabbing;
  transform: scale(1.04) !important;
  border-radius: 10px !important;
  border: 1px solid var(--up-border-hover) !important;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
  animation: none;
}

/* Released here, the panel opens instead of re-docking. */
.up-collapsed-will-expand {
  color: var(--up-text-1);
  border-color: #3a3270 !important;
  box-shadow: 0 0 0 4px rgba(139,123,255,0.18), 0 16px 40px rgba(0,0,0,0.6);
}

.up-collapsed-left   { border-left: none;   border-radius: 0 10px 10px 0; }
.up-collapsed-right  { border-right: none;  border-radius: 10px 0 0 10px; }
.up-collapsed-top    { border-top: none;    border-radius: 0 0 10px 10px; }
.up-collapsed-bottom { border-bottom: none; border-radius: 10px 10px 0 0; }

/* Magnet points, shown only while the handle is dragged. */
.up-dock-mark {
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.15s, border-color 0.15s;
}
.up-dock-mark-left   { border-left: none;   border-radius: 0 10px 10px 0; }
.up-dock-mark-right  { border-right: none;  border-radius: 10px 0 0 10px; }
.up-dock-mark-top    { border-top: none;    border-radius: 0 0 10px 10px; }
.up-dock-mark-bottom { border-bottom: none; border-radius: 10px 10px 0 0; }
.up-dock-mark-on {
  border-style: solid;
  border-color: rgba(139, 123, 255, 0.7);
  background: rgba(139, 123, 255, 0.12);
}

/* Slide in only when the panel is first pushed off-screen, not on re-docks. */
.up-collapsed-enter.up-collapsed-left   { animation: up-dock-left 0.3s cubic-bezier(0,0,0.2,1); }
.up-collapsed-enter.up-collapsed-right  { animation: up-dock-right 0.3s cubic-bezier(0,0,0.2,1); }
.up-collapsed-enter.up-collapsed-top    { animation: up-dock-top 0.3s cubic-bezier(0,0,0.2,1); }
.up-collapsed-enter.up-collapsed-bottom { animation: up-dock-bottom 0.3s cubic-bezier(0,0,0.2,1); }

@keyframes up-dock-left   { from { transform: translateX(-100%); } }
@keyframes up-dock-right  { from { transform: translateX(100%); } }
@keyframes up-dock-top    { from { transform: translateY(-100%); } }
@keyframes up-dock-bottom { from { transform: translateY(100%); } }

.up-collapsed:hover,
.up-collapsed:focus-visible {
  color: var(--up-text-1);
  background: linear-gradient(180deg, #1c1c1c, #111);
  box-shadow: 0 10px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
  outline: none;
}

.up-collapsed:focus-visible { border-color: #3a3a3a; }

/* Nudge toward the content on hover to hint "pull me out". */
.up-collapsed-left:hover   { transform: translateX(3px); }
.up-collapsed-right:hover  { transform: translateX(-3px); }
.up-collapsed-top:hover    { transform: translateY(3px); }
.up-collapsed-bottom:hover { transform: translateY(-3px); }

.up-knob-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  overflow: visible;
  transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.5, 1);
}
/* Drawn pointing right; turned so the arrow always faces into the screen. */
.up-collapsed-right .up-knob-arrow  { transform: rotate(180deg); }
.up-collapsed-top .up-knob-arrow    { transform: rotate(90deg); }
.up-collapsed-bottom .up-knob-arrow { transform: rotate(-90deg); }
.up-knob-arrow-k2 { color: #8b7bff; }
.up-knob-arrow-k { transition: transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1); }
/* On hover the outer knobs slide level with the middle one. */
.up-collapsed:hover .up-knob-arrow-k { transform: translateX(6px); }

@media (prefers-reduced-motion: reduce) {
  .up-collapsed, .up-knob-arrow, .up-knob-arrow-k { transition: none; animation: none; }
}

/* ------------------------------------------------------------------ */
/* Resize handles                                                     */
/* ------------------------------------------------------------------ */

.up-resize {
  position: absolute;
  z-index: 10;
}

.up-resize-top    { top: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.up-resize-bottom { bottom: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.up-resize-left   { left: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.up-resize-right  { right: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }

.up-resize-top-left     { top: -3px; left: -3px; width: 12px; height: 12px; cursor: nwse-resize; }
.up-resize-top-right    { top: -3px; right: -3px; width: 12px; height: 12px; cursor: nesw-resize; }
.up-resize-bottom-left  { bottom: -3px; left: -3px; width: 12px; height: 12px; cursor: nesw-resize; }
.up-resize-bottom-right { bottom: -3px; right: -3px; width: 12px; height: 12px; cursor: nwse-resize; }

/* ------------------------------------------------------------------ */
/* Folder                                                             */
/* ------------------------------------------------------------------ */

.up-folder {
  margin-bottom: 2px;
}

.up-folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--up-row-h);
  cursor: pointer;
  user-select: none;
}

.up-folder-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--up-text-3);
}

.up-folder-chevron {
  width: 16px;
  height: 16px;
  color: var(--up-text-4);
  transition: transform 0.2s cubic-bezier(0,0,0.2,1);
  flex-shrink: 0;
}

.up-folder-chevron-open { transform: rotate(0deg); }
.up-folder-chevron-closed { transform: rotate(-90deg); }

.up-folder-content {
  overflow: hidden;
  transition: height 0.25s cubic-bezier(0,0,0.2,1);
}

.up-folder-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 4px;
}

/* ------------------------------------------------------------------ */
/* Slider                                                             */
/* ------------------------------------------------------------------ */

.up-slider-wrap { position: relative; height: var(--up-row-h); }

.up-slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  background: var(--up-surface);
  border-radius: var(--up-radius);
  touch-action: none;
}

.up-slider-hashmarks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.up-slider-hashmark {
  position: absolute;
  top: 50%;
  width: 1px;
  height: 8px;
  border-radius: 999px;
  transform: translateX(-50%) translateY(-50%);
  background: transparent;
  transition: background 0.2s;
}

.up-slider-active .up-slider-hashmark {
  background: rgba(255,255,255,0.15);
}

.up-slider-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  transition: background 0.15s;
}

.up-slider-handle {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  pointer-events: none;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
}

.up-slider-active .up-slider-handle { opacity: 0.5; }
.up-slider-dragging .up-slider-handle { opacity: 0.9; }

.up-slider-label {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  pointer-events: none;
}

.up-slider-value {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: var(--up-text-3);
  pointer-events: auto;
  border-bottom: 1px solid transparent;
  padding-bottom: 1px;
  transition: color 0.15s;
}

.up-slider-active .up-slider-value { color: var(--up-text-1); }

.up-slider-value-editable {
  border-bottom-color: var(--up-text-4);
  cursor: text;
}

.up-slider-input {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 5ch;
  font-size: 13px;
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: var(--up-text-1);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--up-text-3);
  padding: 0 0 1px;
  outline: none;
  text-align: right;
}

/* ------------------------------------------------------------------ */
/* Toggle (segmented)                                                 */
/* ------------------------------------------------------------------ */

.up-labeled-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--up-row-h);
  padding: 2px 10px 2px 12px;
  background: var(--up-surface);
  border-radius: var(--up-radius);
}

.up-labeled-row-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  flex-shrink: 0;
}

.up-seg {
  position: relative;
  display: flex;
  padding: 2px;
  border-radius: var(--up-radius);
  flex-shrink: 0;
}

.up-seg-pill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: var(--up-surface-active);
  border-radius: 6px;
  z-index: 0;
  pointer-events: none;
  transition: left 0.2s cubic-bezier(0,0,0.2,1), width 0.2s cubic-bezier(0,0,0.2,1);
}

.up-seg-btn {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 6px 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  color: var(--up-text-4);
}

.up-seg-btn-active { color: var(--up-text-2); }

/* ------------------------------------------------------------------ */
/* Action button                                                      */
/* ------------------------------------------------------------------ */

.up-action {
  width: 100%;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  background: var(--up-surface);
  border: none;
  border-radius: var(--up-radius);
  cursor: pointer;
  transition: background var(--up-transition), color var(--up-transition);
}

.up-action:hover { background: var(--up-surface-hover); color: var(--up-text-2); }
.up-action:active { background: var(--up-surface-active); }

/* ------------------------------------------------------------------ */
/* Select                                                             */
/* ------------------------------------------------------------------ */

.up-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  user-select: none;
  height: var(--up-row-h);
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  background: var(--up-surface);
  border: none;
  border-radius: var(--up-radius);
  cursor: pointer;
  transition: background var(--up-transition);
}

.up-select-trigger:hover { background: var(--up-surface-hover); }
.up-select-trigger-open { background: var(--up-surface-active); }

.up-select-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.up-select-label { flex-shrink: 0; }

/* Baseline, not center: the smaller position number should sit on the value's text line. */
.up-select-current {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.up-select-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Position dots: where the current value sits in the list. */
.up-select-pos {
  font: 11px ui-monospace, 'SF Mono', Menlo, monospace;
  color: var(--up-text-4);
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.up-select-steps { display: flex; margin-right: -6px; }
.up-select-step {
  display: grid;
  place-items: center;
  width: 22px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--up-text-4);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.up-select-step:hover { background: var(--up-surface-active); color: var(--up-text-1); }
.up-select-step svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.up-select-chevron {
  width: 16px;
  height: 16px;
  color: var(--up-text-4);
  transition: transform 0.2s cubic-bezier(0,0,0.2,1);
  flex-shrink: 0;
}

.up-select-chevron-open { transform: rotate(180deg); }

.up-select-dropdown {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border: 1px solid var(--up-border-hover);
  border-radius: var(--up-radius);
  padding: 4px;
  z-index: 1;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  animation: up-dropdown-in 0.15s cubic-bezier(0,0,0.2,1);
}

@keyframes up-dropdown-in {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.up-select-option {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background var(--up-transition);
}

.up-select-option-selected { color: var(--up-text-1); }
.up-select-option-highlight { background: var(--up-surface-hover); color: var(--up-text-1); }
.up-select-check {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b7bff;
}

/* ------------------------------------------------------------------ */
/* Text input                                                         */
/* ------------------------------------------------------------------ */

.up-text-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--up-row-h);
  padding: 0 12px;
  background: var(--up-surface);
  border-radius: var(--up-radius);
}

.up-text-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  flex-shrink: 0;
}

.up-text-input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  text-align: right;
}

.up-text-input:focus { color: var(--up-text-1); }
.up-text-input::placeholder { color: var(--up-text-4); }

/* ------------------------------------------------------------------ */
/* Color                                                              */
/* ------------------------------------------------------------------ */

.up-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--up-row-h);
  padding: 0 12px;
  background: var(--up-surface);
  border-radius: var(--up-radius);
}

.up-color-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--up-text-3);
  flex-shrink: 0;
}

.up-color-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.up-color-hex {
  font-size: 13px;
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: var(--up-text-3);
  cursor: text;
}

.up-color-hex-input {
  width: 7ch;
  font-size: 13px;
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: var(--up-text-3);
  background: transparent;
  border: none;
  padding: 0;
  outline: none;
  text-transform: uppercase;
}

.up-color-hex-input:focus { color: var(--up-text-1); }

.up-color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--up-border-hover);
  cursor: pointer;
  transition: transform 0.15s;
  flex-shrink: 0;
}

.up-color-swatch:hover { transform: scale(1.1); }

.up-color-native {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

/* ------------------------------------------------------------------ */
/* Spring/Easing visualization                                        */
/* ------------------------------------------------------------------ */

.up-viz {
  display: block;
  width: 100%;
  border-radius: 10px;
  background: var(--up-surface);
  overflow: visible;
}

.up-viz-grid line { stroke: rgba(255,255,255,0.08); stroke-width: 1; }
.up-viz-target { stroke: rgba(255,255,255,0.15); stroke-width: 1; stroke-dasharray: 4 4; }
.up-viz-curve {
  fill: none;
  stroke: rgba(255,255,255,0.7);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.up-ease-input {
  width: 150px;
  text-align: right;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
}

/* ------------------------------------------------------------------ */
/* Keyboard focus                                                     */
/* ------------------------------------------------------------------ */

.up-root :where(button, input, textarea, [tabindex]):focus { outline: none; }
.up-root :where(button, [role="slider"], [role="button"], [role="combobox"], [role="radio"], .dialkit-color-plane, .dialkit-pad-surface):focus-visible,
.up-portal :where(button, [tabindex], .dialkit-color-plane):focus-visible {
  outline: 2px solid rgba(255,255,255,0.6);
  outline-offset: -2px;
}
.up-slider:focus-visible .up-slider-value { color: var(--up-text-1); }
@media (forced-colors: active) {
  .up-root :where(button, [role="slider"], [role="combobox"]):focus-visible { outline-color: Highlight; }
}

/* ------------------------------------------------------------------ */
/* Preset manager                                                     */
/* ------------------------------------------------------------------ */

.up-preset-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--up-border);
  flex-shrink: 0;
}

.up-preset-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  height: 28px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--up-text-3);
  background: var(--up-surface);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--up-transition);
}

.up-preset-trigger:hover { background: var(--up-surface-hover); }

.up-preset-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--up-surface);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--up-text-4);
  flex-shrink: 0;
  transition: background var(--up-transition), color var(--up-transition);
}

.up-preset-add:hover { background: var(--up-surface-hover); color: var(--up-text-2); }

.up-preset-add svg {
  width: 14px;
  height: 14px;
}

.up-preset-dropdown {
  position: fixed;
  background: #1a1a1a;
  border: 1px solid var(--up-border-hover);
  border-radius: 10px;
  padding: 4px;
  z-index: 20;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  min-width: 140px;
  animation: up-dropdown-in 0.15s cubic-bezier(0,0,0.2,1);
}

.up-preset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  gap: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--up-transition);
  font-size: 12px;
  font-weight: 500;
  color: var(--up-text-3);
}

.up-preset-item:hover { background: var(--up-surface-hover); }
.up-preset-item-active { color: var(--up-text-1); background: var(--up-surface-active); }

.up-preset-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0;
  color: var(--up-text-4);
  flex-shrink: 0;
  transition: opacity var(--up-transition);
}

.up-preset-item:hover .up-preset-delete { opacity: 0.6; }
.up-preset-delete:hover { opacity: 1 !important; }

.up-preset-delete svg {
  width: 12px;
  height: 12px;
}

/* ------------------------------------------------------------------ */
/* Copy button                                                        */
/* ------------------------------------------------------------------ */

.up-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--up-surface);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--up-text-4);
  flex-shrink: 0;
  transition: background var(--up-transition), color var(--up-transition);
}

.up-copy-btn:hover { background: var(--up-surface-hover); color: var(--up-text-2); }

.up-copy-btn svg {
  width: 14px;
  height: 14px;
}

/* ------------------------------------------------------------------ */
/* Slot                                                               */
/* ------------------------------------------------------------------ */

.up-slot-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.up-slot-wrap-empty {
  display: none;
}

.up-slot {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.up-slot-label {
  font-size: 11px;
  color: var(--up-text-3);
  padding: 0 2px;
}

/* Stacked layout: each panel is a top-level collapsible section. */
.up-folder-section {
  margin: 0;
}

.up-folder-section + .up-folder-section {
  border-top: 1px solid var(--up-border);
}

/* The section head (title + versions) pins while its controls scroll beneath. */
.up-folder-section > .up-folder-head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--up-bg);
}

/* Cover .up-content's side padding so rows don't show through the gutters. */
.up-folder-section > .up-folder-head::before {
  content: '';
  position: absolute;
  inset: 0 -12px;
  z-index: -1;
  background: var(--up-bg);
}

.up-folder-section > .up-folder-head > .up-folder-header {
  height: 44px;
}

.up-folder-section > .up-folder-head .up-folder-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: var(--up-text-1);
}

.up-folder-toolbar {
  padding: 4px 0 6px;
}

.up-folder-toolbar .up-preset-bar {
  padding: 0;
  border-bottom: none;
}

.up-folder-section > .up-folder-content > .up-folder-inner {
  padding-bottom: 12px;
}

/* Nested groups read as blocks between hairlines; adjacent ones share one. */
.up-content-stacked .up-folder:not(.up-folder-section) {
  margin: 4px 0;
  border-top: 1px solid var(--up-border);
  border-bottom: 1px solid var(--up-border);
}

.up-content-stacked .up-folder:not(.up-folder-section) + .up-folder:not(.up-folder-section) {
  margin-top: -5px;
}

/* ------------------------------------------------------------------ */
/* Panel section                                                      */
/* ------------------------------------------------------------------ */

.up-panel-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ------------------------------------------------------------------ */
/* Children slot                                                      */
/* ------------------------------------------------------------------ */

.up-children {
  padding: 0 0 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--up-border);
}

.up-children:empty {
  display: none;
}

/* ------------------------------------------------------------------ */
/* Portal container (for dropdowns inside shadow DOM)                  */
/* ------------------------------------------------------------------ */

.up-portal {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483647;
  pointer-events: none;
}

.up-portal > * {
  pointer-events: auto;
}

.up-overlay-backdrop {
  position: fixed;
  inset: 0;
}

/* ------------------------------------------------------------------ */
/* Color picker                                                       */
/* ------------------------------------------------------------------ */

.up-portal {
  --up-checker: repeating-conic-gradient(#2a2a2a 0 25%, #1a1a1a 0 50%) 0 0 / 10px 10px;
  --up-accent: #8b7bff;
}

/* Doubled with dialkit's class: its own swatch rule comes later in the sheet and paints from a variable tunekit never sets. */
.dialkit-color-swatch.up-cp-swatch {
  background: var(--up-swatch), repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 / 8px 8px;
}

/* The popover is promoted to the top layer ([popover]); undo the UA popover box. */
.up-cp-pop {
  inset: auto;
  margin: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--up-text-2);
  background: var(--up-bg);
  border: 1px solid var(--up-border-hover);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  font: 13px/1.4 system-ui, -apple-system, sans-serif;
  user-select: none;
  animation: up-cp-enter 0.16s ease-out;
}
.up-cp-copy {
  display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 3px 6px; margin-right: -2px;
  border: 0; border-radius: 6px; background: none; cursor: pointer;
  color: var(--up-text-3); font: 12px ui-monospace, 'SF Mono', Menlo, monospace; white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.up-cp-copy:hover { background: var(--up-surface-hover); color: var(--up-text-1); }
.up-cp-copy[data-copied] { color: #7ee2a8; }
.up-cp-copy-text { overflow: hidden; text-overflow: ellipsis; animation: up-cp-copy-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes up-cp-copy-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.up-cp-copy-icon { position: relative; width: 12px; height: 12px; flex: none; }
.up-cp-copy-icon svg {
  position: absolute; inset: 0; width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  transition: opacity 0.18s, transform 0.28s cubic-bezier(0.3, 1.5, 0.5, 1);
}
.up-cp-copy-b { opacity: 0; transform: scale(0.4) rotate(-20deg); }
.up-cp-copy[data-copied] .up-cp-copy-a { opacity: 0; transform: scale(0.4) rotate(20deg); }
.up-cp-copy[data-copied] .up-cp-copy-b { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .up-cp-copy-text { animation: none; }
  .up-cp-copy-icon svg { transition: none; }
}
.up-cp-scroll {
  flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 10px;
  overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
}
.up-cp-scroll::-webkit-scrollbar { display: none; }
.up-cp-library { display: contents; }
.up-cp-grip {
  position: absolute; right: 2px; bottom: 2px; width: 14px; height: 14px; z-index: 3;
  display: flex; align-items: center; justify-content: center; cursor: nwse-resize; color: var(--up-text-4); opacity: 0.6;
}
.up-cp-pop[data-side="before"] .up-cp-grip { right: auto; left: 2px; cursor: nesw-resize; transform: scaleX(-1); }
.up-cp-grip:hover { opacity: 1; color: var(--up-text-2); }
.up-cp-grip svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; }
@keyframes up-cp-enter { from { opacity: 0; transform: translateY(3px) scale(0.98); } to { opacity: 1; transform: none; } }

.up-cp-pop svg { flex-shrink: 0; }
.up-cp-pop button { font-family: inherit; }

.up-cp-tabs { display: flex; gap: 2px; padding: 2px; border-radius: 9px; background: var(--up-surface); flex-shrink: 0; }
.up-cp-tab {
  flex: 1; height: 26px; display: flex; align-items: center; justify-content: center; gap: 5px;
  border: 0; border-radius: 7px; background: none; color: var(--up-text-4);
  font-size: 12px; font-weight: 500; cursor: pointer;
}
.up-cp-tab:hover { color: var(--up-text-2); }
.up-cp-tab-on { background: var(--up-surface-active); color: var(--up-text-1); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
.up-cp-tab svg { width: 14px; height: 14px; }

.up-cp-editor, .up-cp-gradient { display: flex; flex-direction: column; gap: 10px; outline: none; }
.up-cp-row { display: flex; align-items: center; gap: 8px; }
.up-cp-between { justify-content: space-between; }
.up-cp-hint { font-size: 10.5px; color: var(--up-text-4); }
.up-cp-hidden { visibility: hidden; }

.up-cp-area { position: relative; height: 150px; border-radius: 9px; cursor: crosshair; touch-action: none; flex-shrink: 0; }
.up-cp-thumb {
  position: absolute; width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, -50%); pointer-events: none;
}
.up-cp-sliders { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.up-cp-slider { position: relative; height: 12px; border-radius: 6px; cursor: pointer; touch-action: none; }
.up-cp-slider .up-cp-thumb { top: 50%; width: 14px; height: 14px; }
.up-cp-hue { background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
.up-cp-alpha { background: var(--up-checker); }
.up-cp-alpha > b { position: absolute; inset: 0; border-radius: 6px; }
.up-cp-preview { position: relative; width: 30px; height: 30px; border-radius: 8px; overflow: hidden; background: var(--up-checker); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); flex-shrink: 0; }
.up-cp-preview > b { position: absolute; inset: 0; }
.up-cp-icon-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  border: 0; border-radius: 8px; background: var(--up-surface); color: var(--up-text-3); cursor: pointer;
}
.up-cp-icon-btn:hover { color: var(--up-text-1); background: var(--up-surface-active); }
.up-cp-icon-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.up-cp-dots { display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px 0; justify-items: center; }
.up-cp-dot {
  width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%;
  background: var(--c); cursor: pointer; transition: transform 0.12s, box-shadow 0.12s;
}
.up-cp-dot:hover { transform: scale(1.12); }
.up-cp-dot-light { box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
.up-cp-dot-on { box-shadow: inset 0 0 0 2px var(--c), inset 0 0 0 4px var(--up-bg); }
.up-cp-dot-light.up-cp-dot-on { box-shadow: inset 0 0 0 2px var(--c), inset 0 0 0 4px var(--up-bg), 0 0 0 1px rgba(255, 255, 255, 0.2); }
.up-cp-dots-label { margin: 8px 0 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--up-text-4); }

.up-cp-fields { display: flex; gap: 3px; }
.up-cp-format {
  height: 28px; padding: 0 5px; display: flex; align-items: center; gap: 3px; flex-shrink: 0;
  border: 0; border-radius: 7px; background: var(--up-surface); color: var(--up-text-3);
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em; cursor: pointer;
}
.up-cp-format:hover { color: var(--up-text-1); }
.up-cp-format svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

.up-cp-field {
  flex: 1; min-width: 0; height: 28px; display: flex; align-items: center; padding-left: 6px;
  border-radius: 7px; background: var(--up-surface); cursor: ew-resize;
  box-shadow: inset 0 0 0 1px transparent; transition: box-shadow 0.12s, background 0.12s;
}
.up-cp-field:hover { background: var(--up-surface-active); }
.up-cp-field-text { flex: 2.2; cursor: text; }
.up-cp-field-wide { flex: 1.25; }
.up-cp-field-alpha { flex: 1.2; }
.up-cp-field-angle { flex: 0 0 74px; }
.up-cp-field-scrubbing { box-shadow: inset 0 0 0 1px var(--up-accent); background: #1d1a33; }
.up-cp-field:focus-within { box-shadow: inset 0 0 0 1px #3a3a3a; }
.up-cp-field > span { margin-right: 2px; flex-shrink: 0; font-size: 10px; font-weight: 600; color: var(--up-text-4); }
.up-cp-field-scrubbing > span { color: var(--up-accent); }
.up-cp-field input {
  width: 100%; min-width: 0; padding: 0 5px 0 0; border: 0; outline: 0; background: none;
  color: var(--up-text-1); font: 11px ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: -0.02em;
  text-align: right; cursor: inherit; pointer-events: none;
}
.up-cp-field-text input, .up-cp-field-editing input { pointer-events: auto; cursor: text; text-align: left; }
/* No selectable text while scrubbing: a drag over a selection is what wakes PopClip-style tools. */
.up-cp-field, .up-cp-field input { -webkit-user-select: none; user-select: none; }
.up-cp-field-text input, .up-cp-field-editing input { -webkit-user-select: text; user-select: text; }

.up-vcursor {
  position: fixed; z-index: 2147483647; width: 24px; height: 24px; margin: -12px 0 0 -12px;
  pointer-events: none; display: none; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6));
}
.up-vcursor-on { display: block; }

.up-cp-contrast {
  display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 8px 0 3px;
  border: 0; border-radius: 7px; background: var(--up-surface); color: var(--up-text-3);
  font-size: 11px; cursor: pointer; text-align: left;
}
.up-cp-contrast:hover { background: var(--up-surface-active); }
.up-cp-contrast-sample { width: 34px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 5px; font-size: 12px; font-weight: 700; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
.up-cp-contrast-ratio { color: var(--up-text-1); font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
.up-cp-contrast-grade { padding: 1px 5px; border-radius: 4px; background: rgba(74, 222, 128, 0.14); color: #4ade80; font-size: 10px; font-weight: 700; }
.up-cp-contrast-fail { background: rgba(248, 113, 113, 0.14); color: #f87171; }
.up-cp-contrast-bg { margin-left: auto; color: var(--up-text-4); font-size: 10.5px; }

.up-cp-gbar-wrap { padding: 0 7px; }
.up-cp-gbar { position: relative; height: 26px; border-radius: 7px; background: var(--up-checker); cursor: copy; touch-action: none; }
.up-cp-gbar > b { position: absolute; inset: 0; border-radius: 7px; pointer-events: none; }
.up-cp-stop {
  position: absolute; top: 50%; width: 14px; height: 30px; transform: translate(-50%, -50%);
  border: 2px solid #fff; border-radius: 5px; cursor: grab;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.5);
}
.up-cp-stop-on { outline: 2px solid var(--up-accent); outline-offset: 2px; }
.up-cp-stop-removing { opacity: 0.3; }

.up-cp-seg { display: flex; padding: 2px; border-radius: 7px; background: var(--up-surface); }
.up-cp-seg button { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--up-text-4); font-size: 11px; font-weight: 500; cursor: pointer; }
.up-cp-seg button:hover { color: var(--up-text-2); }
.up-cp-seg .up-cp-seg-on { background: var(--up-surface-active); color: var(--up-text-1); }

.up-cp-sect { border-top: 1px solid var(--up-border); padding-top: 8px; }
.up-cp-sect-head {
  width: 100%; display: flex; align-items: center; gap: 6px; padding: 2px 0 6px;
  border: 0; background: none; color: var(--up-text-3); font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: left;
}
.up-cp-sect-head:hover { color: var(--up-text-1); }
.up-cp-sect-jp, .up-cp-sect-n { color: var(--up-text-4); font-weight: 400; }
.up-cp-sect-n { font-weight: 500; }
.up-cp-sect-head svg { width: 12px; height: 12px; margin-left: auto; fill: none; stroke: var(--up-text-4); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.2s; }
.up-cp-sect-open svg { transform: rotate(90deg); }
/* The body scrolls, which clips overflow; padding with a matching negative margin leaves room for hover scale. */
.up-cp-sect-body { max-height: var(--up-cp-sect-h, 272px); margin: -6px; padding: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #333 transparent; }
.up-cp-sect-free { max-height: none; overflow: visible; }
.up-cp-sect-body[hidden] { display: none; }
.up-cp-search {
  width: 100%; height: 26px; margin-bottom: 6px; padding: 0 8px; border: 0; border-radius: 7px; outline: 0;
  background: var(--up-surface); color: var(--up-text-1); font: 12px system-ui, sans-serif;
}

/* A wider picker fits more per row rather than bigger chips. */
.up-cp-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(26px, 1fr)); gap: 5px; }
.up-cp-chips-wide { grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); }
.up-cp-chip {
  position: relative; aspect-ratio: 1; padding: 0; border: 0; border-radius: 7px; cursor: pointer;
  background: var(--up-checker); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08); transition: transform 0.12s;
}
.up-cp-chips-wide .up-cp-chip { aspect-ratio: 1.6; }
.up-cp-chip > b { position: absolute; inset: 0; border-radius: inherit; }
.up-cp-chip:hover { transform: scale(1.08); z-index: 1; }
.up-cp-chip-add { display: flex; align-items: center; justify-content: center; background: none; border: 1px dashed #3a3a3a; box-shadow: none; color: var(--up-text-4); }
.up-cp-chip-add:hover { color: var(--up-text-1); border-color: var(--up-text-3); }
.up-cp-chip-add svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
.up-cp-chip-x {
  position: absolute; top: -5px; right: -5px; z-index: 2; width: 15px; height: 15px; padding: 0;
  display: none; align-items: center; justify-content: center;
  border: 1px solid #444; border-radius: 50%; background: #2a2a2a; color: #fff; font-size: 10px; line-height: 1; cursor: pointer;
}
.up-cp-chip:hover .up-cp-chip-x { display: flex; }
.up-cp-chip-x:hover { background: #c33; border-color: #c33; }
.up-cp-chip-label {
  position: absolute; left: 4px; bottom: 2px; max-width: calc(100% - 6px); overflow: hidden; white-space: nowrap;
  font-size: 9px; font-weight: 600; color: rgba(255, 255, 255, 0.92); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); pointer-events: none;
}

.up-cp-combos { display: flex; flex-direction: column; gap: 5px; }
.up-cp-combo { display: flex; align-items: center; gap: 6px; }
.up-cp-combo-name { width: 76px; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: var(--up-text-3); }
.up-cp-credit { margin-top: 8px; font-size: 10px; color: var(--up-text-4); }
.up-cp-credit a { color: inherit; }
.up-cp-credit a:hover { color: var(--up-text-2); }
.up-cp-combo-no { width: 22px; text-align: right; font: 10px ui-monospace, 'SF Mono', Menlo, monospace; color: var(--up-text-4); }
.up-cp-combo-strip { flex: 1; display: flex; height: 22px; border-radius: 6px; overflow: hidden; }
.up-cp-combo-strip i { flex: 1; cursor: pointer; transition: flex 0.15s; }
.up-cp-combo-strip i:hover { flex: 1.6; }
.up-cp-combo button { height: 22px; padding: 0 6px; border: 0; border-radius: 6px; background: var(--up-surface); color: var(--up-text-4); font-size: 11px; cursor: pointer; }
.up-cp-combo button:hover { color: var(--up-text-1); }

@media (prefers-reduced-motion: reduce) {
  .up-cp-pop { animation: none; }
}
`;
//#endregion
//#region src/vendor/dialkit/styles.ts
const DIALKIT_STYLES = `
.up-root,
.up-portal {
  --dial-surface: var(--up-surface);
  --dial-surface-hover: var(--up-surface-hover);
  --dial-surface-active: var(--up-surface-active);
  --dial-surface-subtle: #111;
  --dial-text-root: var(--up-text-1);
  --dial-text-section: var(--up-text-3);
  --dial-text-label: var(--up-text-3);
  --dial-text-focus: var(--up-text-1);
  --dial-text-primary: var(--up-text-1);
  --dial-text-secondary: var(--up-text-2);
  --dial-text-tertiary: var(--up-text-4);
  --dial-border: var(--up-border);
  --dial-border-hover: var(--up-border-hover);
  --dial-focus-ring: rgba(255, 255, 255, 0.6);
  --dial-glass-bg: #1a1a1a;
  --dial-dropdown-bg: #1a1a1a;
  --dial-radius: var(--up-radius);
  --dial-row-height: var(--up-row-h);
  --dial-row-gap: 6px;
  --dial-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  --dial-shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.5);
}

/* Segmented Control */
.dialkit-segmented {
  position: relative;
  display: flex;
  padding: 2px;
  background: transparent;
  border-radius: var(--dial-radius);
}

.dialkit-segmented-pill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: var(--dial-surface-active);
  border-radius: 6px;
  z-index: 0;
  pointer-events: none;
}

.dialkit-segmented-button {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.dialkit-segmented-button[data-active="true"] {
  color: var(--dial-text-primary);
}

.dialkit-segmented-button[data-active="false"] {
  color: var(--dial-text-label);
}

/* Button Group */
.dialkit-button-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialkit-button {
  flex: 1;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--dial-text-secondary);
  background: var(--dial-surface);
  border: none;
  border-radius: var(--dial-radius);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.dialkit-button:hover {
  background: var(--dial-surface-hover);
  color: var(--dial-text-primary);
}

.dialkit-button:active {
  background: var(--dial-surface-active);
}

/* Labeled Control Row (label + control side by side) */
.dialkit-labeled-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--dial-row-height);
  padding: 2px 10px 2px 12px;
  background: var(--dial-surface);
  border-radius: var(--dial-radius);
}

.dialkit-labeled-control-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--dial-text-label);
  flex-shrink: 0;
  line-height: 17px;
}

.dialkit-labeled-control .dialkit-segmented {
  flex-shrink: 0;
  margin-right: -6px;
}

.dialkit-action-button {
  width: 160px;
  flex-shrink: 0;
  padding: 10px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--dial-text-secondary);
  background: var(--dial-surface);
  border: none;
  border-radius: var(--dial-radius);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.dialkit-action-button:hover {
  background: var(--dial-surface-hover);
  color: var(--dial-text-primary);
}

.dialkit-action-button:active {
  background: var(--dial-surface-active);
}

.dialkit-actions-group {
  align-items: flex-start;
}

.dialkit-actions-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 160px;
}


/* Spring Visualization */
.dialkit-spring-viz {
  width: 100%;
  border-radius: var(--dial-radius);
  background: var(--dial-surface);
  overflow: visible;
}

.dialkit-easing-viz {
  position: relative;
  width: 100%;
  aspect-ratio: 256 / 180;
  border-radius: var(--dial-radius);
  background: var(--dial-surface);
  overflow: hidden;
  isolation: isolate;
}

.dialkit-easing-viz svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.dialkit-easing-reference {
  stroke: var(--dial-text-tertiary);
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.4;
}

.dialkit-easing-tangent {
  stroke: var(--dial-text-tertiary);
  stroke-width: 1;
}

.dialkit-easing-curve {
  fill: none;
  stroke: var(--dial-text-primary);
  stroke-width: 2;
  stroke-linecap: round;
}

.dialkit-easing-endpoint {
  fill: var(--dial-text-secondary);
}

.dialkit-easing-handle {
  position: absolute;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.dialkit-easing-handle::after {
  content: '';
  width: 10px;
  height: 10px;
  box-sizing: border-box;
  border: 1.5px solid var(--dial-text-secondary);
  border-radius: 50%;
  background: var(--dial-surface);
}

.dialkit-easing-handle:hover::after,
.dialkit-easing-handle:focus-visible::after,
.dialkit-easing-handle[data-dragging]::after {
  border-color: var(--dial-text-primary);
  background: var(--dial-text-primary);
}

.dialkit-easing-handle[data-dragging] {
  cursor: grabbing;
  z-index: 1;
}

.dialkit-easing-handle:disabled {
  pointer-events: none;
}

.dialkit-easing-instructions {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Panel Wrapper (contains panel + toolbar) */
/* Image selector: shared by React, Solid, Vue, and Svelte. */
.dialkit-image-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: var(--dial-row-height);
  padding: 0 6px 0 12px;
  border: 0;
  border-radius: var(--dial-radius);
  background: var(--dial-surface);
  color: var(--dial-text-label);
  font: 500 13px system-ui, -apple-system, sans-serif;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}
.dialkit-image-control:hover { background: var(--dial-surface-hover); }
.dialkit-image-control[data-open="true"] { background: var(--dial-surface-active); box-shadow: inset 0 0 0 1px var(--dial-border-hover); color: var(--dial-text-primary); }
.dialkit-image-label { flex-shrink: 0; }
.dialkit-image-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; color: var(--dial-text-secondary); font-size: 12px; }
.dialkit-image-frame { position: relative; display: block; overflow: hidden; border-radius: var(--dial-radius); background: repeating-conic-gradient(var(--dial-surface) 0% 25%, transparent 0% 50%) 0 / 12px 12px, var(--dial-surface); }
.dialkit-image-img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dialkit-image-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dial-text-tertiary); }
.dialkit-image-fallback svg { width: 24px; height: 24px; }
.dialkit-image-thumbnail { flex: 0 0 38px; height: 26px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--dial-border); }
.dialkit-image-thumbnail svg { width: 16px; height: 16px; }
.dialkit-image-popover {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: fixed;
  margin: 0;
  inset: auto;
  z-index: 10002;
  box-sizing: border-box;
  padding: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--dial-border-hover) transparent;
  border: 1px solid var(--dial-border);
  border-radius: 14px;
  background: var(--dial-glass-bg);
  box-shadow: var(--dial-shadow);
  color: var(--dial-text-label);
  font: 500 13px system-ui, -apple-system, sans-serif;
  animation: dialkit-color-enter 0.16s ease-out;
}
.dialkit-image-popover *, .dialkit-image-popover *::before, .dialkit-image-popover *::after { box-sizing: border-box; }
.dialkit-image-popover > * { flex-shrink: 0; }
.dialkit-image-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
.dialkit-image-title { color: var(--dial-text-primary); }
.dialkit-image-clear { margin: -4px -4px -4px 0; padding: 4px; border: 0; border-radius: 4px; background: none; color: var(--dial-text-tertiary); font: inherit; font-size: 11px; cursor: pointer; }
.dialkit-image-clear:hover { color: var(--dial-text-primary); }
.dialkit-image-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--dial-row-gap); }
.dialkit-image-option { position: relative; display: block; width: 100%; padding: 3px; border: 1px solid transparent; border-radius: calc(var(--dial-radius) + 3px); background: transparent; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.dialkit-image-option-preview { width: 100%; aspect-ratio: 4 / 3; border-radius: calc(var(--dial-radius) - 1px); }
.dialkit-image-option:hover { background: var(--dial-surface-hover); border-color: var(--dial-border-hover); }
.dialkit-image-option[aria-pressed="true"] { border-color: var(--dial-text-label); background: var(--dial-surface-active); }
.dialkit-image-upload { display: flex; flex: none; align-items: center; justify-content: center; gap: 8px; width: 100%; }
.dialkit-image-upload svg { width: 15px; height: 15px; }
.dialkit-image-popover[data-dragging="true"] .dialkit-image-upload { background: var(--dial-surface-hover); color: var(--dial-text-primary); }
.dialkit-image-upload[aria-disabled="true"] { opacity: 0.6; cursor: progress; }
.dialkit-image-empty { padding: 28px 12px; border-radius: var(--dial-radius); background: var(--dial-surface); color: var(--dial-text-tertiary); font-weight: 400; text-align: center; }
.dialkit-image-status { font-size: 11px; font-weight: 400; line-height: 1.5; overflow-wrap: anywhere; }
.dialkit-image-popover [hidden], .dialkit-image-frame [hidden], .dialkit-image-file { display: none; }
@media (prefers-reduced-motion: reduce) { .dialkit-image-popover { animation: none; } }

/* DialPad: a continuous two-axis field, shared across frameworks. */
.dialkit-pad { display: grid; gap: var(--dial-row-gap); min-width: 0; }
.dialkit-pad-caption { display: flex; align-items: center; min-width: 0; height: var(--dial-row-height); padding: 0 12px; border-radius: var(--dial-radius); background: var(--dial-surface); }
.dialkit-pad-label { flex: 1; min-width: 0; color: var(--dial-text-label); font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dialkit-pad-surface { position: relative; width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: var(--dial-radius); background: var(--dial-surface); cursor: crosshair; touch-action: none; user-select: none; -webkit-user-select: none; }
.dialkit-pad-plane { position: absolute; inset: 12px; pointer-events: none; }
.dialkit-pad-grid { position: absolute; inset: 0; pointer-events: none; }
.dialkit-pad-grid-line { position: absolute; background: var(--dial-border); opacity: 0.65; }
.dialkit-pad-grid-vertical { top: 0; bottom: 0; width: 1px; transform: translateX(-50%); }
.dialkit-pad-grid-horizontal { left: 0; right: 0; height: 1px; transform: translateY(-50%); }
.dialkit-pad-center { position: absolute; top: 50%; left: 50%; width: 3px; height: 3px; border-radius: 50%; background: var(--dial-text-tertiary); transform: translate(-50%, -50%); }
.dialkit-pad-point { position: absolute; width: 12px; height: 12px; border-radius: 50%; background: var(--dial-text-primary); box-shadow: 0 0 0 0 transparent, 0 2px 4px #0003; transform: translate(-50%, -50%); transition: box-shadow 0.15s; pointer-events: auto; cursor: grab; }
.dialkit-pad-surface[data-dragging="true"], .dialkit-pad-surface[data-dragging="true"] .dialkit-pad-point { cursor: grabbing; }
.dialkit-pad-surface[data-dragging="true"] .dialkit-pad-point { box-shadow: 0 0 0 6px var(--dial-border-hover), 0 2px 6px #0003; }
.dialkit-pad-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--dial-row-gap); }
.dialkit-pad-field { display: flex; align-items: center; gap: 4px; min-width: 0; height: var(--dial-row-height); padding: 0 12px 0 10px; border-radius: var(--dial-radius); background: var(--dial-surface); }
.dialkit-pad-axis { min-width: 0; max-width: 35%; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 500; color: var(--dial-text-label); }
.dialkit-pad-value { min-width: 0; width: 100%; border: 0; padding: 0 0 1px; background: transparent; color: var(--dial-text-label); text-align: right; font: 500 13px ui-monospace, 'SF Mono', Menlo, monospace; }
.dialkit-pad-field:focus-within { background: var(--dial-surface-hover); }
.dialkit-pad-value:focus-visible { box-shadow: inset 0 -1px var(--dial-focus-ring); }
.dialkit-pad-value:focus { color: var(--dial-text-focus); }
.dialkit-pad-instructions { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { .dialkit-pad-point { transition: none; } }

/* Color Control */
.dialkit-color-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--dial-row-height);
  padding: 0 12px;
  background: var(--dial-surface);
  border-radius: var(--dial-radius);
  transition: background 0.15s, box-shadow 0.15s;
}

.dialkit-color-control[data-open="true"] {
  background: var(--dial-surface-active);
  box-shadow: inset 0 0 0 1px var(--dial-border-hover);
}
.dialkit-color-control[data-open="true"] .dialkit-color-label,
.dialkit-color-control[data-open="true"] .dialkit-color-value { color: var(--dial-text-primary); }

.dialkit-color-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dial-text-label);
  flex-shrink: 0;
  transform: translateY(-0.5px);
}

.dialkit-color-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Color picker: shared by React, Solid, Vue, and Svelte. */
.dialkit-color-inputs { min-width: 0; flex: 1; justify-content: flex-end; }
.dialkit-color-value {
  min-width: 0;
  width: 100%;
  padding: 4px 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dial-text-label);
  font: 500 13px ui-monospace, 'SF Mono', Menlo, monospace;
  text-align: right;
  text-overflow: ellipsis;
}
.dialkit-color-value:focus { color: var(--dial-text-focus); }
.dialkit-color-swatch {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 5px;
  border: 1px solid var(--dial-border-hover);
  background: linear-gradient(var(--dial-color), var(--dial-color)), repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 / 8px 8px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 8%);
  cursor: pointer;
  transition: transform 0.15s;
}
.dialkit-color-swatch:hover { transform: scale(1.08); }
.dialkit-color-popover {
  display: grid;
  gap: var(--dial-row-gap);
  position: fixed;
  margin: 0;
  inset: auto;
  z-index: 10002;
  box-sizing: border-box;
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  border: 1px solid var(--dial-border);
  border-radius: 14px;
  background: var(--dial-glass-bg);
  box-shadow: var(--dial-shadow);
  color: var(--dial-text-label);
  animation: dialkit-color-enter 0.16s ease-out;
}
.dialkit-color-popover *, .dialkit-color-popover *::before, .dialkit-color-popover *::after { box-sizing: border-box; }
.dialkit-color-plane { position: relative; height: 160px; border-radius: var(--dial-radius); touch-action: none; cursor: crosshair; user-select: none; }
.dialkit-color-canvas { display: block; width: 100%; height: 100%; border-radius: inherit; }
.dialkit-color-plane::after { content: ''; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%); pointer-events: none; }
.dialkit-color-marker { position: absolute; z-index: 1; width: 12px; height: 12px; margin: -6px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 4px rgb(0 0 0 / 30%); pointer-events: none; }
.dialkit-color-tracks { display: grid; gap: var(--dial-row-gap); }
.dialkit-color-track-row { display: flex; align-items: center; gap: 12px; height: var(--dial-row-height); padding: 0 12px; border-radius: var(--dial-radius); background: var(--dial-surface); font-size: 13px; font-weight: 500; }
.dialkit-color-track-row > span { flex: 0 0 52px; color: var(--dial-text-label); }
.dialkit-color-track {
  -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 100%; padding: 0; margin: 0; border: 0; background: transparent; cursor: pointer; touch-action: none;
}
.dialkit-color-hue {
  --dial-color-thumb-bg: var(--dial-color-thumb);
}
.dialkit-color-opacity {
  --dial-color-track-bg: linear-gradient(to right, transparent, var(--dial-color-opaque)), repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 / 8px 8px;
  --dial-color-thumb-bg: linear-gradient(var(--dial-color-thumb), var(--dial-color-thumb)), repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 / 8px 8px;
}
.dialkit-color-track::-webkit-slider-runnable-track { height: 16px; border-radius: 4px; background: var(--dial-color-track-bg); }
.dialkit-color-track::-moz-range-track { height: 16px; border: 0; border-radius: 4px; background: var(--dial-color-track-bg); }
.dialkit-color-track::-webkit-slider-thumb { -webkit-appearance: none; box-sizing: border-box; width: 16px; height: 24px; margin-top: -4px; border-radius: 5px; background: var(--dial-color-thumb-bg); background-clip: padding-box; border: 2px solid white; box-shadow: 0 2px 4px rgb(0 0 0 / 30%); }
.dialkit-color-track::-moz-range-thumb { box-sizing: border-box; width: 16px; height: 24px; border-radius: 5px; background: var(--dial-color-thumb-bg); background-clip: padding-box; border: 2px solid white; box-shadow: 0 2px 4px rgb(0 0 0 / 30%); }
/* The same row, buttons, and pill as Enabled, with no label and equal segments. */
.dialkit-color-format-row { padding: 2px; }
.dialkit-color-format-row .dialkit-color-formats { flex: 1; min-width: 0; margin-right: 0; }
.dialkit-color-formats .dialkit-segmented-pill { left: 2px; width: calc((100% - 4px) / 3); transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1); }
.dialkit-color-format { flex: 1 1 0; min-width: 0; white-space: nowrap; }
.dialkit-color-format:hover { color: var(--dial-text-primary); }
.dialkit-color-css-input { display: block; width: 100%; height: var(--dial-row-height); padding: 0 12px; border: 0; border-radius: var(--dial-radius); background: var(--dial-surface); outline: none; color: var(--dial-text-label); font: 500 13px ui-monospace, 'SF Mono', Menlo, monospace; }
.dialkit-color-css-input:focus { color: var(--dial-text-focus); }
.dialkit-color-popover input[aria-invalid="true"], .dialkit-color-value[aria-invalid="true"] { color: #ef7777; }
@keyframes dialkit-color-enter { from { opacity: 0; transform: translateY(3px) scale(0.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .dialkit-color-popover { animation: none; }
  .dialkit-color-formats .dialkit-segmented-pill { transition: none; }
}

/* Shortcut Pill */
.dialkit-shortcut-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--dial-text-tertiary);
  background: var(--dial-surface-subtle);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  letter-spacing: 0.02em;
  line-height: 16px;
  white-space: nowrap;
  vertical-align: middle;
  transition: color 0.15s, background 0.15s;
}

.dialkit-shortcut-pill-active {
  color: var(--dial-text-primary);
  background: var(--dial-border-hover);
}
`;
//#endregion
//#region node_modules/.pnpm/preact@10.29.0/node_modules/preact/hooks/dist/hooks.mjs
var t, r, u$1, i$1, o$1 = 0, f$1 = [], c = l$1, e = c.__b, a = c.__r, v = c.diffed, l = c.__c, m = c.unmount, s = c.__;
function p(n, t) {
	c.__h && c.__h(r, n, o$1 || t), o$1 = 0;
	var u = r.__H || (r.__H = {
		__: [],
		__h: []
	});
	return n >= u.__.length && u.__.push({}), u.__[n];
}
function d(n) {
	return o$1 = 1, h(D, n);
}
function h(n, u, i) {
	var o = p(t++, 2);
	if (o.t = n, !o.__c && (o.__ = [i ? i(u) : D(void 0, u), function(n) {
		var t = o.__N ? o.__N[0] : o.__[0], r = o.t(t, n);
		t !== r && (o.__N = [r, o.__[1]], o.__c.setState({}));
	}], o.__c = r, !r.__f)) {
		var f = function(n, t, r) {
			if (!o.__c.__H) return !0;
			var u = o.__c.__H.__.filter(function(n) {
				return n.__c;
			});
			if (u.every(function(n) {
				return !n.__N;
			})) return !c || c.call(this, n, t, r);
			var i = o.__c.props !== n;
			return u.some(function(n) {
				if (n.__N) {
					var t = n.__[0];
					n.__ = n.__N, n.__N = void 0, t !== n.__[0] && (i = !0);
				}
			}), c && c.call(this, n, t, r) || i;
		};
		r.__f = !0;
		var c = r.shouldComponentUpdate, e = r.componentWillUpdate;
		r.componentWillUpdate = function(n, t, r) {
			if (this.__e) {
				var u = c;
				c = void 0, f(n, t, r), c = u;
			}
			e && e.call(this, n, t, r);
		}, r.shouldComponentUpdate = f;
	}
	return o.__N || o.__;
}
function y(n, u) {
	var i = p(t++, 3);
	!c.__s && C$1(i.__H, u) && (i.__ = n, i.u = u, r.__H.__h.push(i));
}
function _(n, u) {
	var i = p(t++, 4);
	!c.__s && C$1(i.__H, u) && (i.__ = n, i.u = u, r.__h.push(i));
}
function A$1(n) {
	return o$1 = 5, T$1(function() {
		return { current: n };
	}, []);
}
function T$1(n, r) {
	var u = p(t++, 7);
	return C$1(u.__H, r) && (u.__ = n(), u.__H = r, u.__h = n), u.__;
}
function q$1(n, t) {
	return o$1 = 8, T$1(function() {
		return n;
	}, t);
}
function j$1() {
	for (var n; n = f$1.shift();) {
		var t = n.__H;
		if (n.__P && t) try {
			t.__h.some(z), t.__h.some(B$1), t.__h = [];
		} catch (r) {
			t.__h = [], c.__e(r, n.__v);
		}
	}
}
c.__b = function(n) {
	r = null, e && e(n);
}, c.__ = function(n, t) {
	n && t.__k && t.__k.__m && (n.__m = t.__k.__m), s && s(n, t);
}, c.__r = function(n) {
	a && a(n), t = 0;
	var i = (r = n.__c).__H;
	i && (u$1 === r ? (i.__h = [], r.__h = [], i.__.some(function(n) {
		n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
	})) : (i.__h.some(z), i.__h.some(B$1), i.__h = [], t = 0)), u$1 = r;
}, c.diffed = function(n) {
	v && v(n);
	var t = n.__c;
	t && t.__H && (t.__H.__h.length && (1 !== f$1.push(t) && i$1 === c.requestAnimationFrame || ((i$1 = c.requestAnimationFrame) || w)(j$1)), t.__H.__.some(function(n) {
		n.u && (n.__H = n.u), n.u = void 0;
	})), u$1 = r = null;
}, c.__c = function(n, t) {
	t.some(function(n) {
		try {
			n.__h.some(z), n.__h = n.__h.filter(function(n) {
				return !n.__ || B$1(n);
			});
		} catch (r) {
			t.some(function(n) {
				n.__h && (n.__h = []);
			}), t = [], c.__e(r, n.__v);
		}
	}), l && l(n, t);
}, c.unmount = function(n) {
	m && m(n);
	var t, r = n.__c;
	r && r.__H && (r.__H.__.some(function(n) {
		try {
			z(n);
		} catch (n) {
			t = n;
		}
	}), r.__H = void 0, t && c.__e(t, r.__v));
};
var k = "function" == typeof requestAnimationFrame;
function w(n) {
	var t, r = function() {
		clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
	}, u = setTimeout(r, 35);
	k && (t = requestAnimationFrame(r));
}
function z(n) {
	var t = r, u = n.__c;
	"function" == typeof u && (n.__c = void 0, u()), r = t;
}
function B$1(n) {
	var t = r;
	n.__c = n.__(), r = t;
}
function C$1(n, t) {
	return !n || n.length !== t.length || t.some(function(t, r) {
		return t !== n[r];
	});
}
function D(n, t) {
	return "function" == typeof t ? t(n) : t;
}
/** Fit a preferred panel size into the current viewport (never persisted). */
function fitToViewport(width, height) {
	return {
		width: Math.max(0, Math.min(width, window.innerWidth - 24)),
		height: Math.max(0, Math.min(height, window.innerHeight - 24))
	};
}
function calculatePosition(corner, width, height) {
	const ww = window.innerWidth;
	const wh = window.innerHeight;
	const right = ww - width - 12;
	const center = (ww - width) / 2;
	const bottom = wh - height - 12;
	switch (corner) {
		case "top-left": return {
			x: 12,
			y: 12
		};
		case "top-center": return {
			x: center,
			y: 12
		};
		case "top-right": return {
			x: right,
			y: 12
		};
		case "bottom-left": return {
			x: 12,
			y: bottom
		};
		case "bottom-center": return {
			x: center,
			y: bottom
		};
		case "bottom-right": return {
			x: right,
			y: bottom
		};
	}
}
const SNAP_CORNERS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right"
];
/** Snap target nearest to where the panel was dropped. */
function getSnapCorner(x, y, width, height) {
	const distance = (c) => {
		const p = calculatePosition(c, width, height);
		return (p.x - x) ** 2 + (p.y - y) ** 2;
	};
	return SNAP_CORNERS.reduce((best, c) => distance(c) < distance(best) ? c : best);
}
function getCollapsedEdge(corner, orientation) {
	if (orientation === "horizontal") return corner.endsWith("left") ? "left" : "right";
	return corner.startsWith("top") ? "top" : "bottom";
}
const ANCHORS = [
	"start",
	"center",
	"end"
];
/** Pixel offset of an anchor along an edge `span` long. */
function anchorOffset(anchor, span) {
	if (anchor === "start") return 12;
	if (anchor === "end") return span - 12 - 56;
	return (span - 56) / 2;
}
function edgeRect(edge, anchor) {
	const ww = window.innerWidth;
	const wh = window.innerHeight;
	if (edge === "left" || edge === "right") return {
		x: edge === "left" ? 0 : ww - 26,
		y: anchorOffset(anchor, wh),
		width: 26,
		height: 56
	};
	return {
		x: anchorOffset(anchor, ww),
		y: edge === "top" ? 0 : wh - 26,
		width: 56,
		height: 26
	};
}
/** Rect of the collapsed handle, flush against its edge at one of the magnet points. */
function getCollapsedPosition(corner, orientation, anchor) {
	const edge = getCollapsedEdge(corner, orientation);
	const fallback = orientation === "horizontal" ? corner.startsWith("top") ? "start" : "end" : corner.endsWith("left") ? "start" : "end";
	return edgeRect(edge, anchor ?? fallback);
}
/** All 12 magnet points: each corner from both of its edges, plus every edge's middle. */
function allDocks() {
	return [
		"top",
		"right",
		"bottom",
		"left"
	].flatMap((edge) => ANCHORS.map((anchor) => dockAt(edge, anchor, null)));
}
function dockAt(edge, anchor, pointer) {
	const vertical = edge === "left" || edge === "right";
	const half = (lo, hi, pos, span) => anchor === "start" ? lo : anchor === "end" ? hi : (pos ?? 0) < span / 2 ? lo : hi;
	return {
		corner: vertical ? `${half("top", "bottom", pointer?.y, window.innerHeight)}-${edge}` : `${edge}-${half("left", "right", pointer?.x, window.innerWidth)}`,
		orientation: vertical ? "horizontal" : "vertical",
		anchor,
		edge,
		rect: edgeRect(edge, anchor)
	};
}
/** Nearest magnet point on `edge` to a position along it. */
function dockOnEdge(edge, x, y) {
	const vertical = edge === "left" || edge === "right";
	const along = vertical ? y : x;
	const span = vertical ? window.innerHeight : window.innerWidth;
	return dockAt(edge, ANCHORS.reduce((best, a) => Math.abs(anchorOffset(a, span) + 56 / 2 - along) < Math.abs(anchorOffset(best, span) + 56 / 2 - along) ? a : best), {
		x,
		y
	});
}
/** Magnet point for a pointer anywhere on screen: nearest edge, then nearest point on it. */
function collapsedFromPoint(x, y) {
	const ww = window.innerWidth;
	const wh = window.innerHeight;
	const dists = {
		left: x,
		right: ww - x,
		top: y,
		bottom: wh - y
	};
	return dockOnEdge(Object.keys(dists).reduce((a, b) => dists[b] < dists[a] ? b : a), x, y);
}
function isInExpandZone(x, y) {
	const ww = window.innerWidth;
	const wh = window.innerHeight;
	return Math.min(x, ww - x, y, wh - y) > 140;
}
/** Corner the panel opens in when expanded from a point on screen. */
function cornerFromPoint(x, y) {
	return `${y < window.innerHeight / 2 ? "top" : "bottom"}-${x < window.innerWidth / 2 ? "left" : "right"}`;
}
function calculateResizedSizeAndPosition(handle, initialWidth, initialHeight, initialX, initialY, deltaX, deltaY) {
	const maxW = window.innerWidth - 24;
	const maxH = window.innerHeight - 24;
	let w = initialWidth;
	let h = initialHeight;
	let x = initialX;
	let y = initialY;
	if (handle.includes("right")) {
		const avail = window.innerWidth - initialX - 12;
		w = Math.min(maxW, Math.max(280, Math.min(initialWidth + deltaX, avail)));
	}
	if (handle.includes("left")) {
		const avail = initialX + initialWidth - 12;
		const proposed = Math.min(maxW, Math.max(280, Math.min(initialWidth - deltaX, avail)));
		x = initialX - (proposed - initialWidth);
		w = proposed;
	}
	if (handle.includes("bottom")) {
		const avail = window.innerHeight - initialY - 12;
		h = Math.min(maxH, Math.max(200, Math.min(initialHeight + deltaY, avail)));
	}
	if (handle.includes("top")) {
		const avail = initialY + initialHeight - 12;
		const proposed = Math.min(maxH, Math.max(200, Math.min(initialHeight - deltaY, avail)));
		y = initialY - (proposed - initialHeight);
		h = proposed;
	}
	return {
		width: w,
		height: h,
		x,
		y
	};
}
//#endregion
//#region src/ui/containWheel.ts
function canScroll(el, dx, dy) {
	const style = getComputedStyle(el);
	const scrollsY = /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
	const scrollsX = /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth;
	if (dy !== 0 && scrollsY) {
		if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
	}
	if (dx !== 0 && scrollsX) {
		if (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
	}
	return false;
}
/**
* Wheel handler for floating surfaces: scrolls inside them never reach the page.
* `overscroll-behavior: contain` alone misses wheels over parts that don't scroll
* (the header, or content shorter than the panel), which chain straight to the page.
*/
function containWheel(e) {
	const root = e.currentTarget;
	for (let el = e.target; el && el !== root.parentElement; el = el.parentElement) {
		if (canScroll(el, e.deltaX, e.deltaY)) return;
		if (el === root) break;
	}
	e.preventDefault();
}
//#endregion
//#region node_modules/.pnpm/preact@10.29.0/node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f = 0;
Array.isArray;
function u(e, t, n, o, i, u) {
	t || (t = {});
	var a, c, p = t;
	if ("ref" in p) for (c in p = {}, t) "ref" == c ? a = t[c] : p[c] = t[c];
	var l = {
		type: e,
		props: p,
		key: n,
		ref: a,
		__k: null,
		__: null,
		__b: 0,
		__e: null,
		__c: null,
		constructor: void 0,
		__v: --f,
		__i: -1,
		__u: 0,
		__source: i,
		__self: u
	};
	if ("function" == typeof e && (a = e.defaultProps)) for (c in a) void 0 === p[c] && (p[c] = a[c]);
	return l$1.vnode && l$1.vnode(l), l;
}
//#endregion
//#region src/ui/Folder.tsx
function Folder({ title, defaultOpen = true, variant, toolbar, children }) {
	const [isOpen, setIsOpen] = d(defaultOpen);
	const contentRef = A$1(null);
	const innerRef = A$1(null);
	const [height, setHeight] = d(null);
	const measure = q$1(() => {
		if (innerRef.current) setHeight(innerRef.current.offsetHeight);
	}, []);
	y(() => {
		measure();
		const ro = new ResizeObserver(measure);
		if (innerRef.current) ro.observe(innerRef.current);
		return () => ro.disconnect();
	}, [measure]);
	const toggle = q$1(() => {
		if (!isOpen) measure();
		setIsOpen((prev) => !prev);
	}, [isOpen, measure]);
	return /* @__PURE__ */ u("div", {
		class: variant ? `up-folder up-folder-${variant}` : "up-folder",
		children: [/* @__PURE__ */ u("div", {
			class: "up-folder-head",
			children: [/* @__PURE__ */ u("div", {
				class: "up-folder-header",
				role: "button",
				tabIndex: 0,
				"aria-expanded": isOpen,
				onClick: toggle,
				onKeyDown: (e) => {
					if (e.target !== e.currentTarget || e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					toggle();
				},
				children: [/* @__PURE__ */ u("span", {
					class: "up-folder-title",
					children: title
				}), /* @__PURE__ */ u("svg", {
					class: `up-folder-chevron ${isOpen ? "up-folder-chevron-open" : "up-folder-chevron-closed"}`,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					children: /* @__PURE__ */ u("path", { d: "M6 9.5L12 15.5L18 9.5" })
				})]
			}), toolbar && isOpen && /* @__PURE__ */ u("div", {
				class: "up-folder-toolbar",
				children: toolbar
			})]
		}), /* @__PURE__ */ u("div", {
			ref: contentRef,
			class: "up-folder-content",
			inert: !isOpen,
			style: { height: isOpen ? height !== null ? `${height}px` : "auto" : "0px" },
			children: /* @__PURE__ */ u("div", {
				ref: innerRef,
				class: "up-folder-inner",
				children
			})
		})]
	});
}
//#endregion
//#region src/vendor/dialkit/numeric.ts
/** Snap relative to the minimum and keep exact endpoints reachable. */
function roundValue$1(value, step, min, max) {
	const lower = min ?? -Infinity;
	const upper = max ?? Infinity;
	const clamped = Math.max(lower, Math.min(upper, value));
	if (clamped === lower || clamped === upper || !Number.isFinite(step) || step <= 0) return clamped;
	const origin = min ?? 0;
	const snapped = origin + Math.round((clamped - origin) / step) * step;
	return Math.max(lower, Math.min(upper, Number(snapped.toPrecision(14))));
}
//#endregion
//#region src/vendor/dialkit/shadow.ts
/** The focused element, descending through open shadow roots. */
function activeElement() {
	let el = document.activeElement;
	while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
	return el;
}
/** The node an event really started on, even when observed from `document`. */
function eventTarget(event) {
	return event.composedPath()[0] ?? event.target;
}
//#endregion
//#region src/shortcuts.ts
function getEffectiveStep(control, shortcut) {
	const range = (control.max ?? 1) - (control.min ?? 0);
	const mode = shortcut.mode ?? "normal";
	return mode === "fine" ? range * .01 : mode === "coarse" ? range * .1 : control.step ?? 1;
}
function applySliderDelta(target, step, direction) {
	const { panelId, path, control } = target;
	const current = PaneStore.getValue(panelId, path);
	const min = control.min ?? 0;
	const max = control.max ?? 1;
	const next = Math.max(min, Math.min(max, current + direction * step));
	PaneStore.updateValue(panelId, path, roundValue$1(next, step, min, max));
}
/** Shortcuts pause while typing or while a control itself has focus. */
function isInputFocused() {
	const el = activeElement();
	if (!el) return false;
	if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
	if (el.isContentEditable) return true;
	return !!el.closest("select, button, [role=\"slider\"], [role=\"radio\"], [role=\"listbox\"], [role=\"menu\"], [role=\"menuitem\"], [role=\"button\"]");
}
function getActiveModifier(e) {
	if (e.altKey) return "alt";
	if (e.shiftKey) return "shift";
	if (e.metaKey) return "meta";
}
function findControl(controls, path) {
	for (const c of controls) {
		if (c.path === path) return c;
		const found = c.children && findControl(c.children, path);
		if (found) return found;
	}
	return null;
}
function* allTargets() {
	for (const panel of PaneStore.getPanels()) for (const [path, shortcut] of Object.entries(panel.shortcuts)) {
		const control = findControl(panel.controls, path);
		if (control) yield {
			panelId: panel.id,
			path,
			control,
			shortcut
		};
	}
}
function resolveShortcutTarget(key, modifier) {
	for (const t of allTargets()) if (t.shortcut.key?.toLowerCase() === key.toLowerCase() && t.shortcut.modifier === modifier) return t;
	return null;
}
function resolveHeldTarget(keys, interaction) {
	for (const key of keys) for (const t of allTargets()) {
		if (t.shortcut.key?.toLowerCase() !== key) continue;
		if ((t.shortcut.interaction ?? "scroll") !== interaction) continue;
		if (t.control.type === "slider") return t;
	}
	return null;
}
function resolveScrollOnlyTargets() {
	return [...allTargets()].filter((t) => t.shortcut.interaction === "scroll-only" && t.control.type === "slider");
}
const MODIFIER_GLYPH = {
	alt: "⌥",
	shift: "⇧",
	meta: "⌘"
};
function formatSliderShortcut(sc) {
	const action = sc.interaction === "drag" ? "Drag" : sc.interaction === "move" ? "Move" : "Scroll";
	if (!sc.key) return action;
	return `${sc.modifier ? MODIFIER_GLYPH[sc.modifier] : ""}${sc.key.toUpperCase()}+${action}`;
}
function formatToggleShortcut(sc) {
	if (!sc.key) return "Press";
	return `${sc.modifier ? MODIFIER_GLYPH[sc.modifier] : ""}${sc.key.toUpperCase()}`;
}
//#endregion
//#region src/vendor/dialkit/control-keyboard.ts
/** Keyboard steps are relative to the range minimum, including fractional ranges. */
function sliderKeyValue(key, value, min, max, step, shift = false) {
	if (key === "Home") return min;
	if (key === "End") return max;
	const direction = [
		"ArrowRight",
		"ArrowUp",
		"PageUp"
	].includes(key) ? 1 : [
		"ArrowLeft",
		"ArrowDown",
		"PageDown"
	].includes(key) ? -1 : 0;
	if (!direction) return void 0;
	if (!(step > 0) || max <= min) return min;
	const amount = key.startsWith("Page") || shift ? 10 : 1;
	const position = (value - min) / step;
	const next = min + (direction > 0 ? Math.floor(position + 1e-9) + amount : Math.ceil(position - 1e-9) - amount) * step;
	return Math.max(min, Math.min(max, Number(next.toPrecision(14))));
}
function handleSliderKey(event, value, min, max, step, change, edit) {
	if (event.target !== event.currentTarget || event.altKey || event.metaKey || event.ctrlKey) return;
	const next = sliderKeyValue(event.key, value, min, max, step, event.shiftKey);
	if (next === void 0 && event.key !== "Enter") return;
	event.preventDefault();
	event.stopPropagation();
	if (next === void 0) edit();
	else change(next);
}
function optionKeyIndex(key, index, count, wrap = false) {
	if (!count) return void 0;
	if (key === "Home") return 0;
	if (key === "End") return count - 1;
	const delta = ["ArrowRight", "ArrowDown"].includes(key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(key) ? -1 : 0;
	if (!delta) return void 0;
	return wrap ? (index + delta + count) % count : Math.max(0, Math.min(count - 1, index + delta));
}
/** Find the next control in the owner's document order, excluding floating content. */
function adjacentTabStop(trigger, backwards = false) {
	const stops = Array.from(trigger.getRootNode().querySelectorAll("a[href], button, input, select, textarea, [tabindex], [contenteditable=\"true\"]")).filter((el) => el === trigger || el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert], [aria-hidden=\"true\"], .dialkit-select-dropdown, .dialkit-preset-dropdown, .dialkit-shortcuts-dropdown, .dialkit-color-popover"));
	const index = stops.indexOf(trigger);
	return index < 0 ? void 0 : stops[index + (backwards ? -1 : 1)];
}
//#endregion
//#region src/ui/Controls.tsx
function Toggle({ label, checked, onChange, shortcut, shortcutActive }) {
	return /* @__PURE__ */ u("div", {
		class: "up-labeled-row",
		children: [/* @__PURE__ */ u("span", {
			class: "up-labeled-row-label",
			children: [label, shortcut && /* @__PURE__ */ u("span", {
				class: `dialkit-shortcut-pill${shortcutActive ? " dialkit-shortcut-pill-active" : ""}`,
				children: formatToggleShortcut(shortcut)
			})]
		}), /* @__PURE__ */ u(SegmentedControl, {
			options: [{
				value: "off",
				label: "Off"
			}, {
				value: "on",
				label: "On"
			}],
			value: checked ? "on" : "off",
			onChange: (v) => onChange(v === "on")
		})]
	});
}
function SegmentedControl({ options, value, onChange }) {
	const containerRef = A$1(null);
	const btnRefs = A$1(/* @__PURE__ */ new Map());
	const [pillStyle, setPillStyle] = d(null);
	_(() => {
		const btn = btnRefs.current.get(value);
		const container = containerRef.current;
		if (btn && container) {
			const cr = container.getBoundingClientRect();
			const br = btn.getBoundingClientRect();
			setPillStyle({
				left: br.left - cr.left,
				width: br.width
			});
		}
	}, [value]);
	const onKeyDown = (e) => {
		if (e.altKey || e.metaKey || e.ctrlKey) return;
		const index = options.findIndex((o) => o.value === value);
		const next = optionKeyIndex(e.key, index, options.length, true);
		if (next === void 0) return;
		e.preventDefault();
		const opt = options[next];
		onChange(opt.value);
		btnRefs.current.get(opt.value)?.focus({ preventScroll: true });
	};
	return /* @__PURE__ */ u("div", {
		ref: containerRef,
		class: "up-seg",
		role: "radiogroup",
		onKeyDown,
		children: [pillStyle && /* @__PURE__ */ u("div", {
			class: "up-seg-pill",
			style: {
				left: `${pillStyle.left}px`,
				width: `${pillStyle.width}px`
			}
		}), options.map((opt) => /* @__PURE__ */ u("button", {
			ref: (el) => {
				if (el) btnRefs.current.set(opt.value, el);
			},
			class: `up-seg-btn ${value === opt.value ? "up-seg-btn-active" : ""}`,
			role: "radio",
			"aria-checked": value === opt.value,
			tabIndex: value === opt.value ? 0 : -1,
			onClick: () => onChange(opt.value),
			children: opt.label
		}, opt.value))]
	});
}
function Action({ label, onClick }) {
	return /* @__PURE__ */ u("button", {
		class: "up-action",
		onClick,
		children: label
	});
}
function TextInput({ label, value, onChange, placeholder }) {
	return /* @__PURE__ */ u("div", {
		class: "up-text-row",
		children: [/* @__PURE__ */ u("span", {
			class: "up-text-label",
			children: label
		}), /* @__PURE__ */ u("input", {
			type: "text",
			class: "up-text-input",
			value,
			onInput: (e) => onChange(e.target.value),
			placeholder,
			spellcheck: false
		})]
	});
}
//#endregion
//#region node_modules/.pnpm/preact@10.29.0/node_modules/preact/compat/dist/compat.mjs
function g(n, t) {
	for (var e in t) n[e] = t[e];
	return n;
}
function E(n, t) {
	for (var e in n) if ("__source" !== e && !(e in t)) return !0;
	for (var r in t) if ("__source" !== r && n[r] !== t[r]) return !0;
	return !1;
}
function C(n, t) {
	var e = t(), r = d({ t: {
		__: e,
		u: t
	} }), u = r[0].t, o = r[1];
	return _(function() {
		u.__ = e, u.u = t, R(u) && o({ t: u });
	}, [
		n,
		e,
		t
	]), y(function() {
		return R(u) && o({ t: u }), n(function() {
			R(u) && o({ t: u });
		});
	}, [n]), e;
}
function R(n) {
	try {
		return !((t = n.__) === (e = n.u()) && (0 !== t || 1 / t == 1 / e) || t != t && e != e);
	} catch (n) {
		return !0;
	}
	var t, e;
}
function M(n, t) {
	this.props = n, this.context = t;
}
(M.prototype = new x()).isPureReactComponent = !0, M.prototype.shouldComponentUpdate = function(n, t) {
	return E(this.props, n) || E(this.state, t);
};
var T = l$1.__b;
l$1.__b = function(n) {
	n.type && n.type.__f && n.ref && (n.props.ref = n.ref, n.ref = null), T && T(n);
};
"undefined" != typeof Symbol && Symbol.for;
var O = l$1.__e;
l$1.__e = function(n, t, e, r) {
	if (n.then) {
		for (var u, o = t; o = o.__;) if ((u = o.__c) && u.__c) return t.__e ?? (t.__e = e.__e, t.__k = e.__k), u.__c(n, t);
	}
	O(n, t, e, r);
};
var U = l$1.unmount;
function V(n, t, e) {
	return n && (n.__c && n.__c.__H && (n.__c.__H.__.forEach(function(n) {
		"function" == typeof n.__c && n.__c();
	}), n.__c.__H = null), null != (n = g({}, n)).__c && (n.__c.__P === e && (n.__c.__P = t), n.__c.__e = !0, n.__c = null), n.__k = n.__k && n.__k.map(function(n) {
		return V(n, t, e);
	})), n;
}
function W(n, t, e) {
	return n && e && (n.__v = null, n.__k = n.__k && n.__k.map(function(n) {
		return W(n, t, e);
	}), n.__c && n.__c.__P === t && (n.__e && e.appendChild(n.__e), n.__c.__e = !0, n.__c.__P = e)), n;
}
function P() {
	this.__u = 0, this.o = null, this.__b = null;
}
function j(n) {
	var t = n.__ && n.__.__c;
	return t && t.__a && t.__a(n);
}
function B() {
	this.i = null, this.l = null;
}
l$1.unmount = function(n) {
	var t = n.__c;
	t && (t.__z = !0), t && t.__R && t.__R(), t && 32 & n.__u && (n.type = null), U && U(n);
}, (P.prototype = new x()).__c = function(n, t) {
	var e = t.__c, r = this;
	r.o ??= [], r.o.push(e);
	var u = j(r.__v), o = !1, i = function() {
		o || r.__z || (o = !0, e.__R = null, u ? u(c) : c());
	};
	e.__R = i;
	var l = e.__P;
	e.__P = null;
	var c = function() {
		if (!--r.__u) {
			if (r.state.__a) {
				var n = r.state.__a;
				r.__v.__k[0] = W(n, n.__c.__P, n.__c.__O);
			}
			var t;
			for (r.setState({ __a: r.__b = null }); t = r.o.pop();) t.__P = l, t.forceUpdate();
		}
	};
	r.__u++ || 32 & t.__u || r.setState({ __a: r.__b = r.__v.__k[0] }), n.then(i, i);
}, P.prototype.componentWillUnmount = function() {
	this.o = [];
}, P.prototype.render = function(n, e) {
	if (this.__b) {
		if (this.__v.__k) {
			var r = document.createElement("div"), o = this.__v.__k[0].__c;
			this.__v.__k[0] = V(this.__b, r, o.__O = o.__P);
		}
		this.__b = null;
	}
	var i = e.__a && _$1(k$1, null, n.fallback);
	return i && (i.__u &= -33), [_$1(k$1, null, e.__a ? null : n.children), i];
};
var H = function(n, t, e) {
	if (++e[1] === e[0] && n.l.delete(t), n.props.revealOrder && ("t" !== n.props.revealOrder[0] || !n.l.size)) for (e = n.i; e;) {
		for (; e.length > 3;) e.pop()();
		if (e[1] < e[0]) break;
		n.i = e = e[2];
	}
};
function Z(n) {
	return this.getChildContext = function() {
		return n.context;
	}, n.children;
}
function Y(n) {
	var e = this, r = n.h;
	if (e.componentWillUnmount = function() {
		J$1(null, e.v), e.v = null, e.h = null;
	}, e.h && e.h !== r && e.componentWillUnmount(), !e.v) {
		for (var u = e.__v; null !== u && !u.__m && null !== u.__;) u = u.__;
		e.h = r, e.v = {
			nodeType: 1,
			parentNode: r,
			childNodes: [],
			__k: { __m: u.__m },
			contains: function() {
				return !0;
			},
			namespaceURI: r.namespaceURI,
			insertBefore: function(n, t) {
				this.childNodes.push(n), e.h.insertBefore(n, t);
			},
			removeChild: function(n) {
				this.childNodes.splice(this.childNodes.indexOf(n) >>> 1, 1), e.h.removeChild(n);
			}
		};
	}
	J$1(_$1(Z, { context: e.context }, n.__v), e.v);
}
function $(n, e) {
	var r = _$1(Y, {
		__v: n,
		h: e
	});
	return r.containerInfo = e, r;
}
(B.prototype = new x()).__a = function(n) {
	var t = this, e = j(t.__v), r = t.l.get(n);
	return r[0]++, function(u) {
		var o = function() {
			t.props.revealOrder ? (r.push(u), H(t, n, r)) : u();
		};
		e ? e(o) : o();
	};
}, B.prototype.render = function(n) {
	this.i = null, this.l = /* @__PURE__ */ new Map();
	var t = L$1(n.children);
	n.revealOrder && "b" === n.revealOrder[0] && t.reverse();
	for (var e = t.length; e--;) this.l.set(t[e], this.i = [
		1,
		0,
		this.i
	]);
	return n.children;
}, B.prototype.componentDidUpdate = B.prototype.componentDidMount = function() {
	var n = this;
	this.l.forEach(function(t, e) {
		H(n, e, t);
	});
};
var q = "undefined" != typeof Symbol && Symbol.for && Symbol.for("react.element") || 60103, G = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, J = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, K = /[A-Z0-9]/g, Q = "undefined" != typeof document, X = function(n) {
	return ("undefined" != typeof Symbol && "symbol" == typeof Symbol() ? /fil|che|rad/ : /fil|che|ra/).test(n);
};
x.prototype.isReactComponent = !0, [
	"componentWillMount",
	"componentWillReceiveProps",
	"componentWillUpdate"
].forEach(function(t) {
	Object.defineProperty(x.prototype, t, {
		configurable: !0,
		get: function() {
			return this["UNSAFE_" + t];
		},
		set: function(n) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				value: n
			});
		}
	});
});
var en = l$1.event;
l$1.event = function(n) {
	return en && (n = en(n)), n.persist = function() {}, n.isPropagationStopped = function() {
		return this.cancelBubble;
	}, n.isDefaultPrevented = function() {
		return this.defaultPrevented;
	}, n.nativeEvent = n;
};
var un = {
	configurable: !0,
	get: function() {
		return this.class;
	}
}, on = l$1.vnode;
l$1.vnode = function(n) {
	"string" == typeof n.type && function(n) {
		var t = n.props, e = n.type, u = {}, o = -1 == e.indexOf("-");
		for (var i in t) {
			var l = t[i];
			if (!("value" === i && "defaultValue" in t && null == l || Q && "children" === i && "noscript" === e || "class" === i || "className" === i)) {
				var c = i.toLowerCase();
				"defaultValue" === i && "value" in t && null == t.value ? i = "value" : "download" === i && !0 === l ? l = "" : "translate" === c && "no" === l ? l = !1 : "o" === c[0] && "n" === c[1] ? "ondoubleclick" === c ? i = "ondblclick" : "onchange" !== c || "input" !== e && "textarea" !== e || X(t.type) ? "onfocus" === c ? i = "onfocusin" : "onblur" === c ? i = "onfocusout" : J.test(i) && (i = c) : c = i = "oninput" : o && G.test(i) ? i = i.replace(K, "-$&").toLowerCase() : null === l && (l = void 0), "oninput" === c && u[i = c] && (i = "oninputCapture"), u[i] = l;
			}
		}
		"select" == e && (u.multiple && Array.isArray(u.value) && (u.value = L$1(t.children).forEach(function(n) {
			n.props.selected = -1 != u.value.indexOf(n.props.value);
		})), null != u.defaultValue && (u.value = L$1(t.children).forEach(function(n) {
			n.props.selected = u.multiple ? -1 != u.defaultValue.indexOf(n.props.value) : u.defaultValue == n.props.value;
		}))), t.class && !t.className ? (u.class = t.class, Object.defineProperty(u, "className", un)) : t.className && (u.class = u.className = t.className), n.props = u;
	}(n), n.$$typeof = q, on && on(n);
};
var ln = l$1.__r;
l$1.__r = function(n) {
	ln && ln(n), n.__c;
};
var cn = l$1.diffed;
l$1.diffed = function(n) {
	cn && cn(n);
	var t = n.props, e = n.__e;
	null != e && "textarea" === n.type && "value" in t && t.value !== e.value && (e.value = null == t.value ? "" : t.value);
};
//#endregion
//#region src/ui/Select.tsx
const WHEEL_THROTTLE_MS = 90;
let nextId$2 = 0;
/**
* A select built for comparing options, not just picking one:
* - open: hovering or arrowing through options previews them live; click or
*   Enter commits, Esc / leaving the menu / clicking outside reverts;
* - closed: ‹ › buttons, ←/→ while focused or hovered, and horizontal wheel
*   step through options and commit immediately.
*/
function Select({ label, value, options, onChange, portalContainer }) {
	const [isOpen, setIsOpen] = d(false);
	const [highlight, setHighlight] = d(-1);
	const [pos, setPos] = d(null);
	const triggerRef = A$1(null);
	const hovered = A$1(false);
	const lastWheel = A$1(0);
	const committed = A$1(value);
	const idRef = A$1(`up-select-${++nextId$2}`);
	const normalized = normalizeSelectOptions(options);
	const index = normalized.findIndex((o) => o.value === value);
	const selected = normalized[index];
	if (!isOpen) committed.current = value;
	const step = q$1((dir) => {
		if (!normalized.length) return;
		const next = normalized[((index < 0 ? 0 : index) + dir + normalized.length) % normalized.length];
		onChange(next.value);
	}, [
		normalized,
		index,
		onChange
	]);
	const updatePos = q$1(() => {
		const el = triggerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const menuHeight = 8 + normalized.length * 34;
		const above = window.innerHeight - rect.bottom - 4 < menuHeight && rect.top > menuHeight;
		setPos({
			top: above ? rect.top - 4 : rect.bottom + 4,
			left: rect.left,
			width: rect.width,
			above
		});
	}, [normalized.length]);
	const open = q$1(() => {
		committed.current = value;
		setHighlight(index);
		setIsOpen(true);
	}, [value, index]);
	const close = q$1((commit) => {
		setIsOpen(false);
		const target = commit ?? committed.current;
		if (target !== value) onChange(target);
		committed.current = target;
	}, [value, onChange]);
	const preview = q$1((i) => {
		setHighlight(i);
		const opt = normalized[i];
		if (opt && opt.value !== value) onChange(opt.value);
	}, [
		normalized,
		value,
		onChange
	]);
	y(() => {
		if (!isOpen) {
			setPos(null);
			return;
		}
		updatePos();
		const scroller = triggerRef.current?.closest(".up-content");
		scroller?.addEventListener("scroll", updatePos, { passive: true });
		window.addEventListener("resize", updatePos);
		return () => {
			scroller?.removeEventListener("scroll", updatePos);
			window.removeEventListener("resize", updatePos);
		};
	}, [isOpen, updatePos]);
	y(() => {
		const onKey = (e) => {
			if (!hovered.current || isOpen || e.altKey || e.metaKey || e.ctrlKey) return;
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			const tag = e.composedPath()[0]?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			e.preventDefault();
			step(e.key === "ArrowRight" ? 1 : -1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, step]);
	const onTriggerKeyDown = (e) => {
		if (e.altKey || e.metaKey || e.ctrlKey) return;
		if (!isOpen) {
			if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
				e.preventDefault();
				e.stopPropagation();
				step(e.key === "ArrowRight" ? 1 : -1);
			} else if ([
				"ArrowDown",
				"ArrowUp",
				"Enter",
				" "
			].includes(e.key)) {
				e.preventDefault();
				open();
			}
			return;
		}
		const count = normalized.length;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			preview(((highlight < 0 ? index : highlight) + (e.key === "ArrowDown" ? 1 : -1) + count) % count);
		} else if (e.key === "Home" || e.key === "End") {
			e.preventDefault();
			preview(e.key === "Home" ? 0 : count - 1);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			close(normalized[highlight]?.value ?? null);
		} else if (e.key === "Escape" || e.key === "Tab") {
			if (e.key === "Escape") e.preventDefault();
			close(null);
		}
	};
	const onWheel = (e) => {
		if (isOpen || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 2) return;
		e.preventDefault();
		const now = performance.now();
		if (now - lastWheel.current < WHEEL_THROTTLE_MS) return;
		lastWheel.current = now;
		step(e.deltaX > 0 ? 1 : -1);
	};
	const showPosition = normalized.length > 1 && index >= 0;
	const menuId = `${idRef.current}-menu`;
	return /* @__PURE__ */ u("div", { children: [/* @__PURE__ */ u("div", {
		ref: triggerRef,
		role: "combobox",
		tabIndex: 0,
		"aria-label": label,
		"aria-haspopup": "listbox",
		"aria-expanded": isOpen,
		"aria-controls": menuId,
		"aria-activedescendant": isOpen && highlight >= 0 ? `${idRef.current}-${highlight}` : void 0,
		class: `up-select-trigger ${isOpen ? "up-select-trigger-open" : ""}`,
		onMouseEnter: () => hovered.current = true,
		onMouseLeave: () => hovered.current = false,
		onMouseDown: (e) => {
			if (e.target.closest(".up-select-step")) return;
			if (isOpen) close(null);
			else open();
		},
		onKeyDown: onTriggerKeyDown,
		onWheel,
		children: [/* @__PURE__ */ u("span", {
			class: "up-select-label",
			children: label
		}), /* @__PURE__ */ u("div", {
			class: "up-select-right",
			children: [/* @__PURE__ */ u("span", {
				class: "up-select-current",
				children: [/* @__PURE__ */ u("span", {
					class: "up-select-value",
					children: selected?.label ?? value
				}), showPosition && /* @__PURE__ */ u("span", {
					class: "up-select-pos",
					"aria-hidden": "true",
					children: ["· ", index + 1]
				})]
			}), /* @__PURE__ */ u("span", {
				class: "up-select-steps",
				children: [/* @__PURE__ */ u("button", {
					type: "button",
					class: "up-select-step",
					tabIndex: -1,
					"aria-label": `Previous ${label}`,
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => step(-1),
					children: /* @__PURE__ */ u("svg", {
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ u("path", { d: "M14.5 6L8.5 12L14.5 18" })
					})
				}), /* @__PURE__ */ u("button", {
					type: "button",
					class: "up-select-step",
					tabIndex: -1,
					"aria-label": `Next ${label}`,
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => step(1),
					children: /* @__PURE__ */ u("svg", {
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ u("path", { d: "M9.5 6L15.5 12L9.5 18" })
					})
				})]
			})]
		})]
	}), isOpen && pos && portalContainer && $(/* @__PURE__ */ u(k$1, { children: [/* @__PURE__ */ u("div", {
		class: "up-overlay-backdrop",
		onMouseDown: (e) => {
			e.preventDefault();
			close(null);
		}
	}), /* @__PURE__ */ u("div", {
		id: menuId,
		role: "listbox",
		"aria-label": label,
		class: "up-select-dropdown",
		onMouseDown: (e) => e.preventDefault(),
		onMouseLeave: () => {
			setHighlight(normalized.findIndex((o) => o.value === committed.current));
			if (value !== committed.current) onChange(committed.current);
		},
		style: {
			left: `${pos.left}px`,
			width: `${pos.width}px`,
			...pos.above ? { bottom: `${window.innerHeight - pos.top}px` } : { top: `${pos.top}px` }
		},
		children: normalized.map((opt, i) => /* @__PURE__ */ u("div", {
			id: `${idRef.current}-${i}`,
			role: "option",
			"aria-selected": opt.value === committed.current,
			class: [
				"up-select-option",
				opt.value === committed.current ? "up-select-option-selected" : "",
				i === highlight ? "up-select-option-highlight" : ""
			].join(" "),
			onMouseEnter: () => preview(i),
			onClick: () => close(opt.value),
			children: [/* @__PURE__ */ u("span", { children: opt.label }), opt.value === committed.current && /* @__PURE__ */ u("span", { class: "up-select-check" })]
		}, opt.value))
	})] }), portalContainer)] });
}
//#endregion
//#region src/anim.ts
function animateSpring(from, to, config, onUpdate, onComplete) {
	const { stiffness = 300, damping = 25, mass = .8 } = config;
	let position = from;
	let velocity = 0;
	let rafId = null;
	let lastTime = null;
	let stopped = false;
	function tick(now) {
		if (stopped) return;
		if (lastTime === null) {
			lastTime = now;
			rafId = requestAnimationFrame(tick);
			return;
		}
		const dt = Math.min((now - lastTime) / 1e3, .032);
		lastTime = now;
		const accel = (-stiffness * (position - to) + -damping * velocity) / mass;
		velocity += accel * dt;
		position += velocity * dt;
		if (Math.abs(position - to) < .001 && Math.abs(velocity) < .01) {
			onUpdate(to);
			onComplete?.();
			return;
		}
		onUpdate(position);
		rafId = requestAnimationFrame(tick);
	}
	rafId = requestAnimationFrame(tick);
	return { stop() {
		stopped = true;
		if (rafId !== null) cancelAnimationFrame(rafId);
	} };
}
/** Motion's visualDuration/bounce → physical spring constants (mass 1). */
function timeToPhysics(visualDuration, bounce) {
	const stiffness = Math.pow(2 * Math.PI / visualDuration, 2);
	return {
		stiffness,
		damping: 2 * (1 - bounce) * Math.sqrt(stiffness),
		mass: 1
	};
}
function physicsToTime({ stiffness, damping, mass }) {
	const omega = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	return {
		visualDuration: 2 * Math.PI / omega,
		bounce: Math.max(0, 1 - zeta)
	};
}
/**
* Analytic step response (0 → 1, starting at rest). Closed form instead of
* numeric integration: a fixed-step integrator diverges for stiff, light
* springs that are still inside the editor's slider ranges.
*/
function springProgress(t, { stiffness, damping, mass }) {
	const w0 = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	if (zeta < 1) {
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + zeta * w0 / wd * Math.sin(wd * t));
	}
	if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
	const s = Math.sqrt(zeta * zeta - 1);
	const r1 = -w0 * (zeta - s);
	const r2 = -w0 * (zeta + s);
	return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}
//#endregion
//#region src/ui/Slider.tsx
const CLICK_THRESHOLD = 3;
const DEAD_ZONE = 32;
const MAX_CURSOR_RANGE = 200;
const MAX_STRETCH = 8;
function decimalsForStep(step) {
	const s = step.toString();
	const dot = s.indexOf(".");
	return dot === -1 ? 0 : s.length - dot - 1;
}
function roundValue(val, step) {
	const raw = Math.round(val / step) * step;
	return parseFloat(raw.toFixed(decimalsForStep(step)));
}
function snapToDecile(rawValue, min, max) {
	const normalized = (rawValue - min) / (max - min);
	const nearest = Math.round(normalized * 10) / 10;
	if (Math.abs(normalized - nearest) <= .03125) return min + nearest * (max - min);
	return rawValue;
}
function Slider({ label, value, onChange, min, max, step, shortcut, shortcutActive }) {
	const wrapRef = A$1(null);
	const inputRef = A$1(null);
	const [isHovered, setIsHovered] = d(false);
	const [isDragging, setIsDragging] = d(false);
	const [isEditing, setIsEditing] = d(false);
	const [editValue, setEditValue] = d("");
	const [isValueEditable, setIsValueEditable] = d(false);
	const [isValueHovered, setIsValueHovered] = d(false);
	const interacting = A$1(false);
	const pointerStart = A$1(null);
	const isClick = A$1(true);
	const animHandle = A$1(null);
	const rectRef = A$1(null);
	const fillRef = A$1(null);
	const handleRef = A$1(null);
	const trackRef = A$1(null);
	const percentage = Math.max(0, Math.min(100, (value - min) / (max - min || 1) * 100));
	y(() => {
		if (!interacting.current && !animHandle.current) {
			if (fillRef.current) fillRef.current.style.width = `${percentage}%`;
			if (handleRef.current) handleRef.current.style.left = `max(5px, calc(${percentage}% - 9px))`;
		}
	}, [percentage]);
	const setFillPercent = q$1((pct) => {
		if (fillRef.current) fillRef.current.style.width = `${pct}%`;
		if (handleRef.current) handleRef.current.style.left = `max(5px, calc(${pct}% - 9px))`;
	}, []);
	const positionToValue = q$1((clientX) => {
		const rect = rectRef.current;
		if (!rect) return value;
		const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		return Math.max(min, Math.min(max, min + pct * (max - min)));
	}, [
		min,
		max,
		value
	]);
	const computeStretch = q$1((clientX, sign) => {
		const rect = rectRef.current;
		if (!rect) return 0;
		const dist = sign < 0 ? rect.left - clientX : clientX - rect.right;
		const overflow = Math.max(0, dist - DEAD_ZONE);
		return sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1));
	}, []);
	const handlePointerDown = q$1((e) => {
		if (isEditing || e.target.closest(".up-slider-value-editable")) return;
		e.preventDefault();
		e.target.setPointerCapture(e.pointerId);
		pointerStart.current = {
			x: e.clientX,
			y: e.clientY
		};
		isClick.current = true;
		interacting.current = true;
		if (wrapRef.current) rectRef.current = wrapRef.current.getBoundingClientRect();
	}, [isEditing]);
	const handlePointerMove = q$1((e) => {
		if (!interacting.current || !pointerStart.current) return;
		const dx = e.clientX - pointerStart.current.x;
		const dy = e.clientY - pointerStart.current.y;
		if (isClick.current && Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) {
			isClick.current = false;
			setIsDragging(true);
		}
		if (!isClick.current) {
			const rect = rectRef.current;
			if (rect && trackRef.current) if (e.clientX < rect.left) {
				const stretch = computeStretch(e.clientX, -1);
				trackRef.current.style.width = `calc(100% + ${Math.abs(stretch)}px)`;
				trackRef.current.style.transform = `translateX(${stretch}px)`;
			} else if (e.clientX > rect.right) {
				const stretch = computeStretch(e.clientX, 1);
				trackRef.current.style.width = `calc(100% + ${stretch}px)`;
				trackRef.current.style.transform = "translateX(0)";
			} else {
				trackRef.current.style.width = "100%";
				trackRef.current.style.transform = "translateX(0)";
			}
			const newVal = positionToValue(e.clientX);
			const pct = (newVal - min) / (max - min) * 100;
			if (animHandle.current) {
				animHandle.current.stop();
				animHandle.current = null;
			}
			setFillPercent(pct);
			onChange(roundValue(newVal, step));
		}
	}, [
		positionToValue,
		onChange,
		min,
		max,
		step,
		setFillPercent,
		computeStretch
	]);
	const handlePointerUp = q$1((e) => {
		if (!interacting.current) return;
		if (isClick.current) {
			const rawVal = positionToValue(e.clientX);
			const snapped = (max - min) / step <= 10 ? Math.max(min, Math.min(max, min + Math.round((rawVal - min) / step) * step)) : snapToDecile(rawVal, min, max);
			const targetPct = (snapped - min) / (max - min) * 100;
			const currentPct = (value - min) / (max - min) * 100;
			if (animHandle.current) animHandle.current.stop();
			animHandle.current = animateSpring(currentPct, targetPct, {
				stiffness: 300,
				damping: 25,
				mass: .8
			}, (v) => setFillPercent(v), () => {
				animHandle.current = null;
			});
			onChange(roundValue(snapped, step));
		}
		if (trackRef.current) {
			trackRef.current.style.transition = "width 0.3s cubic-bezier(0,0,0.2,1), transform 0.3s cubic-bezier(0,0,0.2,1)";
			trackRef.current.style.width = "100%";
			trackRef.current.style.transform = "translateX(0)";
			setTimeout(() => {
				if (trackRef.current) trackRef.current.style.transition = "";
			}, 300);
		}
		interacting.current = false;
		setIsDragging(false);
		pointerStart.current = null;
	}, [
		positionToValue,
		onChange,
		min,
		max,
		step,
		value,
		setFillPercent
	]);
	const hoverTimeout = A$1(null);
	y(() => {
		if (isValueHovered && !isEditing && !isValueEditable) hoverTimeout.current = setTimeout(() => setIsValueEditable(true), 800);
		else if (!isValueHovered && !isEditing) {
			if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
			setIsValueEditable(false);
		}
		return () => {
			if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
		};
	}, [
		isValueHovered,
		isEditing,
		isValueEditable
	]);
	y(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);
	const cancelled = A$1(false);
	const submitEdit = q$1(() => {
		const parsed = parseFloat(editValue);
		if (!cancelled.current && !isNaN(parsed)) onChange(roundValue(Math.max(min, Math.min(max, parsed)), step));
		setIsEditing(false);
		setIsValueHovered(false);
		setIsValueEditable(false);
	}, [
		editValue,
		onChange,
		min,
		max,
		step
	]);
	const isActive = isHovered || isDragging;
	const displayValue = value.toFixed(decimalsForStep(step));
	const discreteSteps = (max - min) / step;
	const hashCount = discreteSteps <= 10 ? discreteSteps - 1 : 9;
	const hashMarks = Array.from({ length: Math.max(0, hashCount) }, (_, i) => {
		return /* @__PURE__ */ u("div", {
			class: "up-slider-hashmark",
			style: { left: `${discreteSteps <= 10 ? (i + 1) * step / (max - min) * 100 : (i + 1) * 10}%` }
		}, i);
	});
	return /* @__PURE__ */ u("div", {
		ref: wrapRef,
		class: "up-slider-wrap",
		children: /* @__PURE__ */ u("div", {
			ref: trackRef,
			class: [
				"up-slider",
				isActive ? "up-slider-active" : "",
				isDragging ? "up-slider-dragging" : ""
			].filter(Boolean).join(" "),
			role: "slider",
			tabIndex: isEditing ? -1 : 0,
			"aria-label": label,
			"aria-valuemin": min,
			"aria-valuemax": max,
			"aria-valuenow": value,
			"aria-valuetext": displayValue,
			onKeyDown: (e) => handleSliderKey(e, value, min, max, step, (next) => {
				animHandle.current?.stop();
				animHandle.current = null;
				setFillPercent((next - min) / (max - min) * 100);
				onChange(next);
			}, () => {
				cancelled.current = false;
				setEditValue(displayValue);
				setIsEditing(true);
			}),
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
			onMouseEnter: () => setIsHovered(true),
			onMouseLeave: () => setIsHovered(false),
			children: [
				/* @__PURE__ */ u("div", {
					class: "up-slider-hashmarks",
					children: hashMarks
				}),
				/* @__PURE__ */ u("div", {
					ref: fillRef,
					class: "up-slider-fill",
					style: {
						width: `${percentage}%`,
						background: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"
					}
				}),
				/* @__PURE__ */ u("div", {
					ref: handleRef,
					class: "up-slider-handle",
					style: { left: `max(5px, calc(${percentage}% - 9px))` }
				}),
				/* @__PURE__ */ u("span", {
					class: "up-slider-label",
					children: [label, shortcut && /* @__PURE__ */ u("span", {
						class: `dialkit-shortcut-pill${shortcutActive ? " dialkit-shortcut-pill-active" : ""}`,
						children: formatSliderShortcut(shortcut)
					})]
				}),
				isEditing ? /* @__PURE__ */ u("input", {
					ref: inputRef,
					type: "text",
					class: "up-slider-input",
					value: editValue,
					onInput: (e) => setEditValue(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter") submitEdit();
						if (e.key === "Escape") {
							cancelled.current = true;
							setIsEditing(false);
							setIsValueHovered(false);
							setIsValueEditable(false);
						}
					},
					onBlur: submitEdit,
					onClick: (e) => e.stopPropagation(),
					onMouseDown: (e) => e.stopPropagation()
				}) : /* @__PURE__ */ u("span", {
					class: `up-slider-value ${isValueEditable ? "up-slider-value-editable" : ""}`,
					onMouseEnter: () => setIsValueHovered(true),
					onMouseLeave: () => setIsValueHovered(false),
					onClick: (e) => {
						if (isValueEditable) {
							e.stopPropagation();
							e.preventDefault();
							cancelled.current = false;
							setIsEditing(true);
							setEditValue(displayValue);
						}
					},
					onMouseDown: (e) => {
						if (isValueEditable) e.stopPropagation();
					},
					children: displayValue
				})
			]
		})
	});
}
//#endregion
//#region src/ui/Slot.tsx
function Slot({ panelId, path, label }) {
	const slotRef = A$1(null);
	const [isEmpty, setIsEmpty] = d(true);
	y(() => {
		const el = slotRef.current;
		if (!el) return;
		PaneStore.setSlotNode(panelId, path, el);
		setIsEmpty(el.childNodes.length === 0);
		const observer = new MutationObserver(() => {
			setIsEmpty(el.childNodes.length === 0);
		});
		observer.observe(el, { childList: true });
		return () => {
			observer.disconnect();
			PaneStore.setSlotNode(panelId, path, null);
		};
	}, [panelId, path]);
	return /* @__PURE__ */ u("div", {
		class: `up-slot-wrap ${isEmpty ? "up-slot-wrap-empty" : ""}`,
		children: [label ? /* @__PURE__ */ u("div", {
			class: "up-slot-label",
			children: label
		}) : null, /* @__PURE__ */ u("div", {
			ref: slotRef,
			class: "up-slot"
		})]
	});
}
//#endregion
//#region src/vendor/dialkit/easing-geometry.ts
const clampY = (value) => Math.max(-1, Math.min(2, value));
function formatEase(ease) {
	return ease.join(", ");
}
function parseEase(text) {
	const parts = text.split(",").map((part) => part.trim());
	if (parts.length !== 4 || parts.some((part) => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(part))) return null;
	const values = parts.map(Number);
	if (!values.every(Number.isFinite) || values[0] < 0 || values[0] > 1 || values[2] < 0 || values[2] > 1) return null;
	values[1] = clampY(values[1]);
	values[3] = clampY(values[3]);
	return values;
}
/** Defensive rendering for externally supplied values; valid overshoot is never clamped. */
function normalizeEase(ease) {
	return ease.map((value, index) => {
		const finite = Number.isFinite(value) ? value : index < 2 ? 0 : 1;
		return index % 2 === 0 ? Math.max(0, Math.min(1, finite)) : finite;
	});
}
/** Fit both axes equally so the 0→1 reference stays at 45°, including during overshoot. */
function fitEasingGraph(ease, width, height) {
	const value = normalizeEase(ease);
	const padding = Math.min(12, width / 4, height / 4);
	const radiusY = Math.max(.5, Math.abs(value[1] - .5), Math.abs(value[3] - .5));
	const unit = Math.min(width - padding * 2, (height / 2 - padding) / radiusY);
	const scale = {
		x: unit,
		y: unit
	};
	const project = (x, y) => ({
		x: width / 2 + (x - .5) * scale.x,
		y: height / 2 - (y - .5) * scale.y
	});
	return {
		scale,
		start: project(0, 0),
		end: project(1, 1),
		handles: [project(value[0], value[1]), project(value[2], value[3])]
	};
}
/** Deltas use the pointer-down scale so refitting the display cannot amplify a drag. */
function moveEasingHandle(ease, handle, dx, dy, scale) {
	const next = [...ease];
	if (!Number.isFinite(scale.x) || !Number.isFinite(scale.y) || scale.x <= 0 || scale.y <= 0) return next;
	const index = handle * 2;
	const x = ease[index] + dx / scale.x;
	const y = ease[index + 1] - dy / scale.y;
	if (dx !== 0) next[index] = Number(Math.max(0, Math.min(1, x)).toFixed(2));
	if (dy !== 0 && Number.isFinite(y)) next[index + 1] = Number(clampY(y).toFixed(2));
	return next;
}
function easingHandleFromKey(ease, handle, key, shift) {
	const delta = shift ? .1 : .01;
	const scale = {
		x: 1,
		y: 1
	};
	if (key === "ArrowLeft") return moveEasingHandle(ease, handle, -delta, 0, scale);
	if (key === "ArrowRight") return moveEasingHandle(ease, handle, delta, 0, scale);
	if (key === "ArrowUp") return moveEasingHandle(ease, handle, 0, -delta, scale);
	if (key === "ArrowDown") return moveEasingHandle(ease, handle, 0, delta, scale);
}
/** Stop the tangent at the handle's outer radius, including when the handle meets an endpoint. */
function easingGuideEnd(start, handle, radius = 5) {
	const dx = handle.x - start.x;
	const dy = handle.y - start.y;
	const distance = Math.hypot(dx, dy);
	if (distance <= radius) return { ...start };
	return {
		x: handle.x - dx / distance * radius,
		y: handle.y - dy / distance * radius
	};
}
//#endregion
//#region src/vendor/dialkit/dial-pad-control.ts
let nextId$1 = 0;
function element$1(tag, className, text) {
	const el = document.createElement(tag);
	el.className = className;
	if (text) el.textContent = text;
	return el;
}
/** Shared pointer, keyboard, and numeric editing behavior for all four frameworks. */
function mountDialPad(host, initial) {
	let props = initial;
	let value = normalizePadValue(props.value, props);
	let drag;
	const root = element$1("div", "dialkit-pad");
	const fields = element$1("div", "dialkit-pad-fields");
	const caption = element$1("div", "dialkit-pad-caption");
	const label = element$1("span", "dialkit-pad-label");
	caption.append(label);
	fields.append(caption);
	const surface = element$1("div", "dialkit-pad-surface");
	surface.tabIndex = 0;
	surface.setAttribute("role", "group");
	const plane = element$1("div", "dialkit-pad-plane");
	plane.setAttribute("aria-hidden", "true");
	const grid = element$1("div", "dialkit-pad-grid");
	grid.setAttribute("aria-hidden", "true");
	for (let index = 1; index < 6; index++) {
		const vertical = element$1("span", "dialkit-pad-grid-line dialkit-pad-grid-vertical");
		const horizontal = element$1("span", "dialkit-pad-grid-line dialkit-pad-grid-horizontal");
		vertical.style.left = `${index / 6 * 100}%`;
		horizontal.style.top = `${index / 6 * 100}%`;
		grid.append(vertical, horizontal);
	}
	const center = element$1("span", "dialkit-pad-center");
	const point = element$1("span", "dialkit-pad-point");
	plane.append(center, point);
	surface.append(grid, plane);
	const instructions = element$1("span", "dialkit-pad-instructions", "Arrow keys adjust each axis. Shift adjusts by ten steps. Home resets both axes. Hold Shift while dragging to lock an axis.");
	instructions.id = `dialkit-pad-help-${++nextId$1}`;
	surface.setAttribute("aria-describedby", instructions.id);
	const inputs = ["x", "y"].map((axis) => {
		const field = element$1("label", "dialkit-pad-field");
		const name = element$1("span", "dialkit-pad-axis");
		const input = element$1("input", "dialkit-pad-value");
		input.type = "text";
		input.inputMode = "decimal";
		input.autocomplete = "off";
		input.spellcheck = false;
		input.setAttribute("role", "spinbutton");
		field.append(name, input);
		fields.append(field);
		input.addEventListener("focus", () => input.select());
		input.addEventListener("blur", () => {
			const number = input.value.trim() === "" ? NaN : Number(input.value);
			if (Number.isFinite(number)) commit({
				...value,
				[axis]: number
			});
			input.value = String(value[axis]);
		});
		input.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Enter" || event.key === "Escape") {
				event.preventDefault();
				if (event.key === "Escape") input.value = String(value[axis]);
				input.blur();
				surface.focus({ preventScroll: true });
			} else if (!event.altKey && !event.metaKey && !event.ctrlKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
				event.preventDefault();
				const range = resolvePadAxis(props[axis]);
				const draft = input.value.trim() === "" ? NaN : Number(input.value);
				const current = Number.isFinite(draft) ? draft : value[axis];
				const direction = event.key === "ArrowUp" ? 1 : -1;
				commit({
					...value,
					[axis]: snapPadAxis(current + direction * range.step * (event.shiftKey ? 10 : 1), range)
				});
				input.value = String(value[axis]);
			}
		});
		return {
			axis,
			name,
			input
		};
	});
	root.append(fields, surface, instructions);
	host.append(root);
	function render() {
		label.textContent = props.label;
		label.title = props.label;
		const names = {
			x: props.labels?.x ?? "X",
			y: props.labels?.y ?? "Y"
		};
		surface.setAttribute("aria-label", `${props.label}: ${names.x} ${value.x}, ${names.y} ${value.y}`);
		inputs.forEach(({ axis, name, input }) => {
			const range = resolvePadAxis(props[axis]);
			name.textContent = names[axis];
			name.title = names[axis];
			input.setAttribute("aria-label", `${props.label} ${names[axis]}`);
			input.setAttribute("aria-valuemin", String(range.min));
			input.setAttribute("aria-valuemax", String(range.max));
			input.setAttribute("aria-valuenow", String(value[axis]));
			if (activeElement() !== input) input.value = String(value[axis]);
			const fraction = (value[axis] - range.min) / (range.max - range.min);
			point.style[axis === "x" ? "left" : "top"] = `${(axis === "x" ? fraction : 1 - fraction) * 100}%`;
		});
	}
	function commit(next) {
		const normalized = normalizePadValue(next, props);
		if (normalized.x === value.x && normalized.y === value.y) return;
		value = normalized;
		render();
		props.onChange({ ...value });
	}
	function endDrag() {
		const id = drag?.id;
		drag = void 0;
		delete surface.dataset.dragging;
		if (id !== void 0 && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
	}
	function move(event, released = false) {
		if (!drag || event.pointerId !== drag.id) return;
		if (Math.max(Math.abs(event.clientX - drag.start.x), Math.abs(event.clientY - drag.start.y)) >= 3) {
			drag.moved = true;
			surface.dataset.dragging = "true";
		}
		const bounds = plane.getBoundingClientRect();
		if (!bounds.width || !bounds.height) return;
		let x = event.clientX - drag.offset.x;
		let y = event.clientY - drag.offset.y;
		if (released && !drag.moved && !event.shiftKey) {
			const gridBounds = grid.getBoundingClientRect();
			const intersection = padGridIntersection(event.clientX - gridBounds.left, event.clientY - gridBounds.top, gridBounds.width, gridBounds.height);
			if (intersection) {
				x = gridBounds.left + intersection.x;
				y = gridBounds.top + intersection.y;
			}
		}
		const next = padValueFromPoint((x - bounds.left) / bounds.width, (y - bounds.top) / bounds.height, props);
		if (event.shiftKey) {
			if (!drag.lock) {
				const dx = Math.abs(event.clientX - drag.start.x);
				const dy = Math.abs(event.clientY - drag.start.y);
				if (Math.max(dx, dy) < 3) return;
				drag.lock = dx >= dy ? "x" : "y";
				drag.lockValue = { ...value };
			}
			const fixed = drag.lock === "x" ? "y" : "x";
			next[fixed] = drag.lockValue[fixed];
		} else {
			drag.lock = void 0;
			drag.lockValue = void 0;
		}
		commit(next);
	}
	surface.addEventListener("dblclick", () => commit(normalizePadValue(void 0, props)));
	surface.addEventListener("pointerdown", (event) => {
		if (event.button !== 0 || drag) return;
		event.preventDefault();
		surface.focus({ preventScroll: true });
		const bounds = point.getBoundingClientRect();
		const onPoint = event.target === point;
		drag = {
			id: event.pointerId,
			start: {
				x: event.clientX,
				y: event.clientY
			},
			value: { ...value },
			offset: onPoint ? {
				x: event.clientX - bounds.left - bounds.width / 2,
				y: event.clientY - bounds.top - bounds.height / 2
			} : {
				x: 0,
				y: 0
			},
			moved: false
		};
		surface.setPointerCapture(event.pointerId);
		move(event);
	});
	surface.addEventListener("pointermove", move);
	surface.addEventListener("pointerup", (event) => {
		if (event.pointerId !== drag?.id) return;
		move(event, true);
		endDrag();
	});
	surface.addEventListener("pointercancel", (event) => {
		if (event.pointerId === drag?.id) endDrag();
	});
	surface.addEventListener("lostpointercapture", (event) => {
		if (event.pointerId === drag?.id) endDrag();
	});
	surface.addEventListener("keydown", (event) => {
		if (event.altKey || event.metaKey || event.ctrlKey) return;
		const next = padValueFromKey(value, event.key, event.shiftKey, props);
		if (next || event.key === "Home" || event.key === "Escape" && drag) {
			event.preventDefault();
			event.stopPropagation();
			if (next) commit(next);
			else if (event.key === "Home") {
				endDrag();
				commit(normalizePadValue(void 0, props));
			} else if (drag) {
				const start = drag.value;
				endDrag();
				commit(start);
			}
		}
	});
	render();
	return {
		update(next) {
			props = next;
			value = normalizePadValue(next.value, props);
			render();
		},
		destroy() {
			endDrag();
			root.remove();
		}
	};
}
//#endregion
//#region src/vendor/dialkit/easing-control.ts
let nextId = 0;
/** One interaction and fitting implementation for React, Solid, Vue, and Svelte. */
function mountEasingVisualization(host, initial) {
	let props = initial;
	let value = normalizeEase([...props.easing.ease]);
	let width = 256;
	let height = 180;
	let drag;
	const root = document.createElement("div");
	root.className = "dialkit-easing-viz";
	root.setAttribute("aria-label", "Bézier easing curve");
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("aria-hidden", "true");
	const shape = (tag, className) => {
		const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
		node.setAttribute("class", className);
		svg.append(node);
		return node;
	};
	const reference = shape("line", "dialkit-easing-reference");
	const tangents = [shape("line", "dialkit-easing-tangent"), shape("line", "dialkit-easing-tangent")];
	const path = shape("path", "dialkit-easing-curve");
	const endpoints = [shape("circle", "dialkit-easing-endpoint"), shape("circle", "dialkit-easing-endpoint")];
	const help = document.createElement("span");
	help.className = "dialkit-easing-instructions";
	help.id = `dialkit-easing-help-${++nextId}`;
	help.textContent = "Drag to adjust X from 0 to 1 and Y from -1 to 2. Arrow keys adjust by 0.01. Shift adjusts by 0.1. Escape cancels a drag.";
	root.append(svg, help);
	const handles = [0, 1].map((handle) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "dialkit-easing-handle";
		button.setAttribute("aria-describedby", help.id);
		button.addEventListener("pointerdown", (event) => {
			if (!props.onChange || event.button !== 0 || drag) return;
			event.preventDefault();
			event.stopPropagation();
			button.focus({ preventScroll: true });
			measure();
			const bounds = root.getBoundingClientRect();
			if (!bounds.width || !bounds.height) return;
			drag = {
				id: event.pointerId,
				handle,
				x: event.clientX,
				y: event.clientY,
				scale: fitEasingGraph(value, width, height).scale,
				ratioX: width / bounds.width,
				ratioY: height / bounds.height,
				value: [...value]
			};
			button.setPointerCapture(event.pointerId);
			button.dataset.dragging = "true";
		});
		button.addEventListener("pointermove", move);
		button.addEventListener("pointerup", (event) => {
			if (event.pointerId !== drag?.id) return;
			move(event);
			endDrag();
		});
		button.addEventListener("pointercancel", (event) => {
			if (event.pointerId === drag?.id) cancelDrag();
		});
		button.addEventListener("lostpointercapture", (event) => {
			if (event.pointerId === drag?.id) endDrag();
		});
		button.addEventListener("keydown", (event) => {
			if (!props.onChange || event.altKey || event.metaKey || event.ctrlKey) return;
			if (event.key === "Escape" && drag) {
				event.preventDefault();
				event.stopPropagation();
				cancelDrag();
				return;
			}
			const next = easingHandleFromKey(value, handle, event.key, event.shiftKey);
			if (next) {
				event.preventDefault();
				event.stopPropagation();
				endDrag();
				commit(next);
			}
		});
		root.append(button);
		return button;
	});
	host.append(root);
	function line(node, a, b) {
		node.setAttribute("x1", String(a.x));
		node.setAttribute("y1", String(a.y));
		node.setAttribute("x2", String(b.x));
		node.setAttribute("y2", String(b.y));
	}
	function render() {
		const graph = fitEasingGraph(value, width, height);
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		line(reference, graph.start, graph.end);
		[graph.start, graph.end].forEach((point, index) => {
			line(tangents[index], point, easingGuideEnd(point, graph.handles[index]));
			endpoints[index].setAttribute("cx", String(point.x));
			endpoints[index].setAttribute("cy", String(point.y));
			endpoints[index].setAttribute("r", "2.5");
			const button = handles[index];
			button.style.left = `${graph.handles[index].x / width * 100}%`;
			button.style.top = `${graph.handles[index].y / height * 100}%`;
			button.disabled = !props.onChange;
			button.setAttribute("aria-label", `Bézier handle ${index + 1}: X ${value[index * 2]}, Y ${value[index * 2 + 1]}`);
		});
		root.setAttribute("role", props.onChange ? "group" : "img");
		const { start, end, handles: [a, b] } = graph;
		path.setAttribute("d", `M ${start.x} ${start.y} C ${a.x} ${a.y}, ${b.x} ${b.y}, ${end.x} ${end.y}`);
	}
	function measure() {
		width = root.clientWidth || width;
		height = root.clientHeight || height;
		render();
	}
	function commit(next) {
		if (next.every((part, index) => part === value[index])) return;
		value = next;
		render();
		props.onChange?.([...value]);
	}
	function move(event) {
		if (!drag || event.pointerId !== drag.id) return;
		commit(moveEasingHandle(drag.value, drag.handle, (event.clientX - drag.x) * drag.ratioX, (event.clientY - drag.y) * drag.ratioY, drag.scale));
	}
	function endDrag() {
		if (!drag) return;
		const { id, handle } = drag;
		drag = void 0;
		delete handles[handle].dataset.dragging;
		if (handles[handle].hasPointerCapture(id)) handles[handle].releasePointerCapture(id);
	}
	function cancelDrag() {
		if (!drag) return;
		const original = drag.value;
		endDrag();
		commit(original);
	}
	const observer = new ResizeObserver(measure);
	observer.observe(root);
	measure();
	return {
		update(next) {
			const incoming = normalizeEase([...next.easing.ease]);
			if (!next.onChange || incoming.some((part, index) => part !== value[index])) endDrag();
			props = next;
			value = incoming;
			render();
		},
		destroy() {
			endDrag();
			observer.disconnect();
			root.remove();
		}
	};
}
//#endregion
//#region src/vendor/dialkit/dropdown-position.ts
function getDropdownPosition(trigger, portalRoot, options = {}) {
	const { dropdownHeight = 0, gap = 4, allowAbove = true } = options;
	const triggerRect = trigger.getBoundingClientRect();
	const rootRect = portalRoot.getBoundingClientRect();
	const viewport = window.visualViewport;
	const viewportTop = viewport?.offsetTop ?? 0;
	const viewportLeft = viewport?.offsetLeft ?? 0;
	const viewportHeight = viewport?.height ?? window.innerHeight;
	const viewportWidth = viewport?.width ?? window.innerWidth;
	const margin = 8;
	const spaceBelow = Math.max(0, viewportTop + viewportHeight - triggerRect.bottom - gap - margin);
	const spaceAbove = Math.max(0, triggerRect.top - viewportTop - gap - margin);
	const above = allowAbove && spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
	let maxHeight = Math.min(options.maxHeight ?? 320, above ? spaceAbove : spaceBelow);
	const height = Math.min(dropdownHeight, maxHeight);
	const width = Math.min(options.width ?? triggerRect.width, Math.max(0, viewportWidth - margin * 2));
	let left = Math.max(viewportLeft + margin, Math.min(triggerRect.left, viewportLeft + viewportWidth - width - margin));
	let top = Math.max(viewportTop + margin, above ? triggerRect.top - height - gap : triggerRect.bottom + gap);
	if (options.preferSide) {
		const sideRect = trigger.closest(".up-shell")?.getBoundingClientRect() ?? triggerRect;
		const before = sideRect.left - width - gap;
		const after = sideRect.right + gap;
		if (before >= viewportLeft + margin) left = before;
		else if (after + width <= viewportLeft + viewportWidth - margin) left = after;
		maxHeight = Math.min(options.maxHeight ?? 480, viewportHeight - margin * 2);
		top = Math.max(viewportTop + margin, Math.min(triggerRect.top - 32, viewportTop + viewportHeight - Math.min(dropdownHeight, maxHeight) - margin));
	}
	return {
		top: options.fixed ? top : top - rootRect.top + portalRoot.scrollTop - portalRoot.clientTop,
		left: options.fixed ? left : left - rootRect.left + portalRoot.scrollLeft - portalRoot.clientLeft,
		width,
		above,
		maxHeight
	};
}
/** Track scroll, resize, panel dragging, and layout animations while a popup is open. */
function observeDropdownPosition(trigger, update, popup) {
	let frame = 0;
	let disposed = false;
	let previous = "";
	const tick = () => {
		if (disposed) return;
		const floating = popup?.();
		if (floating?.isConnected && floating.style.position === "fixed" && typeof floating.showPopover === "function" && !floating.matches(":popover-open")) {
			floating.setAttribute("popover", "manual");
			floating.showPopover();
		}
		const rect = trigger.getBoundingClientRect();
		const root = getDialKitPortalRoot(trigger)?.getBoundingClientRect();
		const viewport = window.visualViewport;
		const next = [
			rect.x,
			rect.y,
			rect.width,
			rect.height,
			root?.x,
			root?.y,
			popup?.()?.scrollHeight,
			window.innerWidth,
			window.innerHeight,
			viewport?.height,
			viewport?.offsetTop,
			viewport?.offsetLeft
		].join(",");
		if (next !== previous) {
			previous = next;
			update();
		}
		if (!disposed) frame = requestAnimationFrame(tick);
	};
	tick();
	window.addEventListener("scroll", update, true);
	return () => {
		disposed = true;
		cancelAnimationFrame(frame);
		window.removeEventListener("scroll", update, true);
	};
}
function getDialKitPortalRoot(trigger) {
	return (trigger?.getRootNode())?.querySelector?.(".up-portal") ?? null;
}
//#endregion
//#region src/vendor/dialkit/image-control.ts
let imageControlId = 0;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
function element(tag, className, text) {
	const el = document.createElement(tag);
	el.className = className;
	if (text) el.textContent = text;
	if (tag === "button") el.type = "button";
	return el;
}
function icon(kind) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "1.5");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("aria-hidden", "true");
	const path = document.createElementNS(svg.namespaceURI, "path");
	path.setAttribute("d", kind === "upload" ? "M12 16V3m-4 4 4-4 4 4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" : "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 13 5-5 4 4 3-3 6 6M15 7h.01");
	svg.append(path);
	return svg;
}
function imageLabel(value) {
	if (!value) return "No image";
	if (value.startsWith("data:") || value.startsWith("blob:")) return "Uploaded image";
	const name = value.split(/[?#]/)[0].split("/").filter(Boolean).pop();
	try {
		return name ? decodeURIComponent(name) : "Image";
	} catch {
		return name || "Image";
	}
}
function imageOptions(options = [], uploaded = [], value = "") {
	const unique = /* @__PURE__ */ new Map();
	for (const option of [...options, ...uploaded]) {
		const item = typeof option === "string" ? {
			value: option,
			label: imageLabel(option)
		} : option;
		if (item.value && !unique.has(item.value)) unique.set(item.value, item);
	}
	if (value && !unique.has(value)) unique.set(value, {
		value,
		label: imageLabel(value)
	});
	return [...unique.values()];
}
function preview(className) {
	const frame = element("span", `dialkit-image-frame ${className}`);
	const fallback = element("span", "dialkit-image-fallback");
	fallback.append(icon("image"));
	const img = element("img", "dialkit-image-img");
	img.alt = "";
	img.draggable = false;
	img.decoding = "async";
	img.hidden = true;
	frame.append(fallback, img);
	let current;
	img.addEventListener("load", () => {
		img.hidden = false;
		fallback.hidden = true;
		frame.removeAttribute("title");
	});
	img.addEventListener("error", () => {
		img.hidden = true;
		fallback.hidden = false;
		frame.title = "Image unavailable";
	});
	return {
		frame,
		update(value) {
			if (value === current) return;
			current = value;
			img.hidden = true;
			fallback.hidden = false;
			frame.removeAttribute("title");
			if (value) img.src = value;
			else img.removeAttribute("src");
		}
	};
}
/** Shared picker so selection, uploads, focus, and positioning match in every framework. */
function mountImageControl(host, initial, presentation = "popover") {
	const inline = presentation === "inline";
	let props = initial;
	const uploaded = [];
	let popup;
	let stopPosition;
	let updatePicker = () => {};
	let resetUpload = () => {};
	let reader;
	let uploadRequest = 0;
	const popupId = `dialkit-image-picker-${++imageControlId}`;
	const trigger = element("button", "dialkit-image-control");
	const label = element("span", "dialkit-image-label");
	const name = element("span", "dialkit-image-value");
	const thumbnail = preview("dialkit-image-thumbnail");
	trigger.setAttribute("aria-haspopup", "dialog");
	trigger.setAttribute("aria-expanded", "false");
	trigger.append(label, name, thumbnail.frame);
	const fileInput = element("input", "dialkit-image-file");
	fileInput.type = "file";
	fileInput.accept = "image/*";
	fileInput.hidden = true;
	host.append(trigger, fileInput);
	if (inline) trigger.style.display = "none";
	const choices = () => imageOptions(props.options, uploaded, props.value);
	const render = () => {
		label.textContent = props.label;
		name.textContent = choices().find((item) => item.value === props.value)?.label ?? "No image";
		trigger.setAttribute("aria-label", `Choose ${props.label.toLowerCase()} image: ${name.textContent}`);
		thumbnail.update(props.value);
		updatePicker();
	};
	const commit = (value) => {
		props = {
			...props,
			value
		};
		render();
		props.onChange(value);
	};
	const close = (restoreFocus = false) => {
		uploadRequest++;
		reader?.abort();
		reader = void 0;
		fileInput.onchange = null;
		stopPosition?.();
		stopPosition = void 0;
		popup?.remove();
		popup = void 0;
		updatePicker = () => {};
		resetUpload = () => {};
		delete trigger.dataset.open;
		trigger.setAttribute("aria-expanded", "false");
		trigger.removeAttribute("aria-controls");
		document.removeEventListener("pointerdown", outside);
		document.removeEventListener("focusin", focusOutside);
		if (restoreFocus) trigger.focus({ preventScroll: true });
	};
	const outside = (event) => {
		if (!popup?.contains(eventTarget(event)) && !host.contains(eventTarget(event))) close();
	};
	const focusOutside = (event) => {
		if (!popup?.contains(eventTarget(event)) && !host.contains(eventTarget(event))) close();
	};
	const open = () => {
		if (popup) {
			if (!inline) close();
			return;
		}
		const root = inline ? host : getDialKitPortalRoot(host) ?? host;
		popup = element("div", "dialkit-image-popover");
		popup.dataset.presentation = presentation;
		popup.style.position = inline ? "static" : "fixed";
		popup.id = popupId;
		popup.setAttribute("role", inline ? "group" : "dialog");
		const heading = element("div", "dialkit-image-heading");
		const title = element("span", "dialkit-image-title");
		const clear = element("button", "dialkit-image-clear", "Remove");
		clear.addEventListener("click", () => {
			commit("");
			if (!inline) close(true);
		});
		heading.append(title, clear);
		const grid = element("div", "dialkit-image-grid");
		grid.setAttribute("role", "group");
		grid.setAttribute("aria-label", "Available images");
		const empty = element("div", "dialkit-image-empty", "Choose an image to get started.");
		const upload = element("button", "dialkit-button dialkit-image-upload");
		const uploadText = element("span", "", "Upload image");
		upload.append(icon("upload"), uploadText);
		const status = element("div", "dialkit-image-status");
		status.setAttribute("role", "status");
		status.hidden = true;
		upload.addEventListener("click", () => {
			if (!busy) fileInput.click();
		});
		let buttons = [];
		let previousItems = [];
		let busy = false;
		const setBusy = (next) => {
			busy = next;
			upload.setAttribute("aria-disabled", String(next));
			uploadText.textContent = next ? "Loading image…" : "Upload image";
			grid.setAttribute("aria-busy", String(next));
		};
		resetUpload = () => {
			uploadRequest++;
			reader?.abort();
			reader = void 0;
			setBusy(false);
			status.hidden = true;
		};
		const acceptFile = (file) => {
			if (busy) return;
			status.hidden = true;
			if (!file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
				status.textContent = file.size > MAX_FILE_SIZE ? "Choose an image smaller than 10 MB." : "Choose an image file, such as PNG, JPG, WebP, GIF, or SVG.";
				status.hidden = false;
				return;
			}
			const request = ++uploadRequest;
			setBusy(true);
			const fail = () => {
				if (request !== uploadRequest) return;
				setBusy(false);
				status.textContent = "This image could not be opened. Try another file.";
				status.hidden = false;
			};
			reader = new FileReader();
			reader.addEventListener("error", fail);
			reader.addEventListener("load", () => {
				if (request !== uploadRequest) return;
				const value = reader?.result;
				reader = void 0;
				if (typeof value !== "string") {
					fail();
					return;
				}
				const check = new Image();
				check.onerror = fail;
				check.onload = () => {
					if (request !== uploadRequest) return;
					setBusy(false);
					if (!uploaded.some((item) => item.value === value)) uploaded.push({
						value,
						label: file.name
					});
					commit(value);
					buttons.find((button) => button.getAttribute("aria-pressed") === "true")?.focus({ preventScroll: true });
				};
				check.src = value;
			});
			reader.readAsDataURL(file);
		};
		fileInput.onchange = () => {
			const file = fileInput.files?.[0];
			fileInput.value = "";
			if (file) acceptFile(file);
		};
		popup.addEventListener("dragover", (event) => {
			if (!event.dataTransfer?.types.includes("Files")) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "copy";
			popup.dataset.dragging = "true";
		});
		popup.addEventListener("dragleave", (event) => {
			if (!popup?.contains(event.relatedTarget)) delete popup.dataset.dragging;
		});
		popup.addEventListener("drop", (event) => {
			event.preventDefault();
			delete popup.dataset.dragging;
			const file = event.dataTransfer?.files[0];
			if (file) acceptFile(file);
		});
		grid.addEventListener("keydown", (event) => {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const index = buttons.indexOf(activeElement());
			if (index < 0) return;
			const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
			const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "ArrowDown" ? index + columns : event.key === "ArrowUp" ? index - columns : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : void 0;
			if (next === void 0) return;
			event.preventDefault();
			const button = buttons[Math.max(0, Math.min(buttons.length - 1, next))];
			buttons.forEach((item) => {
				item.tabIndex = item === button ? 0 : -1;
			});
			button.focus({ preventScroll: true });
			button.scrollIntoView({ block: "nearest" });
		});
		popup.addEventListener("keydown", (event) => {
			if (inline) return;
			event.stopPropagation();
			if (event.key === "Escape") {
				event.preventDefault();
				close(true);
			}
			if (event.key === "Tab") {
				const first = clear.hidden ? buttons.find((button) => button.tabIndex === 0) ?? upload : clear;
				if (event.shiftKey && activeElement() === first || !event.shiftKey && activeElement() === upload) {
					const next = adjacentTabStop(trigger, event.shiftKey);
					close(true);
					if (next) {
						event.preventDefault();
						next.focus();
					}
				}
			}
		});
		updatePicker = () => {
			popup?.setAttribute("aria-label", `${props.label} image picker`);
			title.textContent = props.label;
			clear.hidden = !props.value;
			clear.setAttribute("aria-label", `Remove ${props.label.toLowerCase()} image`);
			const items = choices();
			empty.hidden = items.length > 0;
			grid.hidden = items.length === 0;
			if (items.length !== previousItems.length || items.some((item, i) => item.value !== previousItems[i].value || item.label !== previousItems[i].label)) {
				const focusedIndex = buttons.indexOf(activeElement());
				previousItems = items;
				buttons = items.map((item) => {
					const button = element("button", "dialkit-image-option");
					button.setAttribute("aria-label", item.label);
					button.title = item.label;
					const thumb = preview("dialkit-image-option-preview");
					thumb.update(item.value);
					button.append(thumb.frame);
					button.addEventListener("click", () => {
						resetUpload();
						commit(item.value);
					});
					return button;
				});
				grid.replaceChildren(...buttons);
				if (focusedIndex >= 0) buttons[Math.min(focusedIndex, buttons.length - 1)]?.focus({ preventScroll: true });
			}
			const selected = items.findIndex((item) => item.value === props.value);
			buttons.forEach((button, index) => {
				button.setAttribute("aria-pressed", String(index === selected));
				button.tabIndex = index === Math.max(0, selected) ? 0 : -1;
			});
		};
		popup.append(heading, grid, empty, upload, status);
		root.append(popup);
		render();
		const position = () => {
			if (!popup) return;
			if (!host.isConnected || trigger.getClientRects().length === 0) {
				close();
				return;
			}
			const p = getDropdownPosition(trigger, root, {
				dropdownHeight: popup.scrollHeight + 2,
				width: 320,
				maxHeight: 560,
				preferSide: true,
				fixed: true,
				gap: 8
			});
			Object.assign(popup.style, {
				left: `${p.left}px`,
				top: `${p.top}px`,
				width: `${p.width}px`,
				maxHeight: `${p.maxHeight}px`,
				transformOrigin: p.above ? "bottom" : "top"
			});
		};
		if (inline) return;
		stopPosition = observeDropdownPosition(trigger, position, () => popup);
		trigger.dataset.open = "true";
		trigger.setAttribute("aria-expanded", "true");
		trigger.setAttribute("aria-controls", popupId);
		document.addEventListener("pointerdown", outside);
		document.addEventListener("focusin", focusOutside);
		(buttons.find((button) => button.tabIndex === 0) ?? upload).focus({ preventScroll: true });
	};
	trigger.addEventListener("click", open);
	trigger.addEventListener("keydown", (event) => {
		event.stopPropagation();
		if (event.key === "Escape") {
			event.preventDefault();
			close();
		}
		if (event.key === "ArrowDown" && !popup) {
			event.preventDefault();
			open();
		}
	});
	render();
	if (inline) open();
	return {
		update(next) {
			if (next.value !== props.value) resetUpload();
			props = next;
			render();
		},
		destroy() {
			close();
			fileInput.onchange = null;
			trigger.remove();
			fileInput.remove();
		}
	};
}
//#endregion
//#region src/ui/Vendor.tsx
function useVendorControl(mount, props) {
	const host = A$1(null);
	const control = A$1(null);
	const latest = A$1(props);
	latest.current = props;
	y(() => {
		control.current = mount(host.current, latest.current);
		return () => control.current?.destroy();
	}, []);
	y(() => {
		control.current?.update(props);
	});
	return host;
}
function ImageControl(props) {
	return /* @__PURE__ */ u("div", {
		ref: useVendorControl(mountImageControl, props),
		class: "dialkit-image-host"
	});
}
function DialPad(props) {
	return /* @__PURE__ */ u("div", {
		ref: useVendorControl(mountDialPad, props),
		class: "dialkit-pad-host"
	});
}
function EasingEditor(props) {
	return /* @__PURE__ */ u("div", {
		ref: useVendorControl(mountEasingVisualization, props),
		class: "dialkit-easing-host"
	});
}
//#endregion
//#region src/ui/Transition.tsx
const DEFAULT_TIME = {
	visualDuration: .3,
	bounce: .2
};
const DEFAULT_PHYSICS = {
	stiffness: 400,
	damping: 17,
	mass: 1
};
const DEFAULT_EASE = [
	.25,
	.1,
	.25,
	1
];
const clamp$1 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, step) => Math.round(v / step) * step;
function springPhysics(spring, isSimple) {
	return isSimple ? timeToPhysics(spring.visualDuration ?? DEFAULT_TIME.visualDuration, spring.bounce ?? DEFAULT_TIME.bounce) : {
		stiffness: spring.stiffness ?? DEFAULT_PHYSICS.stiffness,
		damping: spring.damping ?? DEFAULT_PHYSICS.damping,
		mass: spring.mass ?? DEFAULT_PHYSICS.mass
	};
}
/** Rough perceived duration of any transition value, used when switching modes. */
function durationOf(value) {
	if (value.type === "easing") return value.duration;
	if (transitionModeOf(value) === "simple") return value.visualDuration ?? DEFAULT_TIME.visualDuration;
	return physicsToTime(springPhysics(value, false)).visualDuration;
}
function convert(value, to) {
	const duration = durationOf(value);
	if (to === "easing") return {
		type: "easing",
		duration: clamp$1(round(duration, .05), .1, 2),
		ease: DEFAULT_EASE
	};
	const time = value.type === "spring" && transitionModeOf(value) === "advanced" ? physicsToTime(springPhysics(value, false)) : {
		visualDuration: duration,
		bounce: value.type === "spring" ? value.bounce ?? DEFAULT_TIME.bounce : DEFAULT_TIME.bounce
	};
	if (to === "simple") return {
		type: "spring",
		visualDuration: clamp$1(round(time.visualDuration, .05), .1, 1),
		bounce: clamp$1(round(time.bounce, .05), 0, 1)
	};
	const p = timeToPhysics(time.visualDuration, time.bounce);
	return {
		type: "spring",
		stiffness: clamp$1(round(p.stiffness, 10), 1, 1e3),
		damping: clamp$1(round(p.damping, 1), 1, 100),
		mass: 1
	};
}
function SpringViz({ spring, isSimple }) {
	const W = 256;
	const H = 140;
	const physics = springPhysics(spring, isSimple);
	const pts = [];
	for (let i = 0; i <= 100; i++) {
		const t = i / 100 * 2;
		pts.push([t, springProgress(t, physics)]);
	}
	const vals = pts.map(([, v]) => v);
	const lo = Math.min(...vals);
	const range = Math.max(...vals) - lo || 1;
	const d = pts.map(([t, v], i) => {
		const x = t / 2 * W;
		const y = H - ((v - lo) / range * H * .6 + H * .2);
		return `${i === 0 ? "M" : "L"} ${x} ${y}`;
	}).join(" ");
	const grid = [
		1,
		2,
		3
	].flatMap((i) => [/* @__PURE__ */ u("line", {
		x1: W / 4 * i,
		y1: 0,
		x2: W / 4 * i,
		y2: H
	}, `v${i}`), /* @__PURE__ */ u("line", {
		x1: 0,
		y1: H / 4 * i,
		x2: W,
		y2: H / 4 * i
	}, `h${i}`)]);
	return /* @__PURE__ */ u("svg", {
		viewBox: `0 0 ${W} ${H}`,
		class: "up-viz up-spring-viz",
		children: [
			/* @__PURE__ */ u("g", {
				class: "up-viz-grid",
				children: grid
			}),
			/* @__PURE__ */ u("line", {
				class: "up-viz-target",
				x1: 0,
				y1: H / 2,
				x2: W,
				y2: H / 2
			}),
			/* @__PURE__ */ u("path", {
				class: "up-viz-curve",
				d
			})
		]
	});
}
function TransitionControl({ label, value, onChange }) {
	const mode = transitionModeOf(value);
	const isEasing = mode === "easing";
	const isSimple = mode === "simple";
	const spring = value.type === "spring" ? value : {
		type: "spring",
		...DEFAULT_TIME
	};
	const easing = value.type === "easing" ? value : {
		type: "easing",
		duration: .3,
		ease: DEFAULT_EASE
	};
	const cache = A$1({});
	cache.current[mode] = value;
	const handleModeChange = q$1((newMode) => {
		const target = newMode;
		if (target === mode) return;
		onChange(cache.current[target] ?? convert(value, target));
	}, [
		mode,
		value,
		onChange
	]);
	const updateSpring = q$1((key, val) => {
		if (isSimple) {
			const { stiffness: _s, damping: _d, mass: _m, ...rest } = spring;
			onChange({
				...rest,
				[key]: val
			});
		} else {
			const { visualDuration: _v, bounce: _b, ...rest } = spring;
			onChange({
				...rest,
				[key]: val
			});
		}
	}, [
		spring,
		isSimple,
		onChange
	]);
	return /* @__PURE__ */ u(Folder, {
		title: label,
		defaultOpen: true,
		children: /* @__PURE__ */ u("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: "6px"
			},
			children: [
				isEasing ? /* @__PURE__ */ u(EasingEditor, {
					easing,
					onChange: (ease) => onChange({
						...easing,
						ease
					})
				}) : /* @__PURE__ */ u(SpringViz, {
					spring,
					isSimple
				}),
				/* @__PURE__ */ u("div", {
					class: "up-labeled-row",
					children: [/* @__PURE__ */ u("span", {
						class: "up-labeled-row-label",
						children: "Type"
					}), /* @__PURE__ */ u(SegmentedControl, {
						options: [
							{
								value: "easing",
								label: "Easing"
							},
							{
								value: "simple",
								label: "Time"
							},
							{
								value: "advanced",
								label: "Physics"
							}
						],
						value: mode,
						onChange: handleModeChange
					})]
				}),
				isEasing ? /* @__PURE__ */ u(k$1, { children: [/* @__PURE__ */ u(EaseInput, {
					ease: easing.ease,
					onChange: (ease) => onChange({
						...easing,
						ease
					})
				}), /* @__PURE__ */ u(Slider, {
					label: "Duration",
					value: easing.duration,
					onChange: (v) => onChange({
						...easing,
						duration: v
					}),
					min: .1,
					max: 2,
					step: .05
				})] }) : isSimple ? /* @__PURE__ */ u(k$1, { children: [/* @__PURE__ */ u(Slider, {
					label: "Duration",
					value: spring.visualDuration ?? .3,
					onChange: (v) => updateSpring("visualDuration", v),
					min: .1,
					max: 1,
					step: .05
				}), /* @__PURE__ */ u(Slider, {
					label: "Bounce",
					value: spring.bounce ?? .2,
					onChange: (v) => updateSpring("bounce", v),
					min: 0,
					max: 1,
					step: .05
				})] }) : /* @__PURE__ */ u(k$1, { children: [
					/* @__PURE__ */ u(Slider, {
						label: "Stiffness",
						value: spring.stiffness ?? 400,
						onChange: (v) => updateSpring("stiffness", v),
						min: 1,
						max: 1e3,
						step: 10
					}),
					/* @__PURE__ */ u(Slider, {
						label: "Damping",
						value: spring.damping ?? 17,
						onChange: (v) => updateSpring("damping", v),
						min: 1,
						max: 100,
						step: 1
					}),
					/* @__PURE__ */ u(Slider, {
						label: "Mass",
						value: spring.mass ?? 1,
						onChange: (v) => updateSpring("mass", v),
						min: .1,
						max: 10,
						step: .1
					})
				] })
			]
		})
	});
}
/** Editable "x1, y1, x2, y2" field; commits on blur/Enter, ignores invalid input. */
function EaseInput({ ease, onChange }) {
	const [draft, setDraft] = d(null);
	const cancelled = A$1(false);
	return /* @__PURE__ */ u("div", {
		class: "up-labeled-row",
		children: [/* @__PURE__ */ u("span", {
			class: "up-labeled-row-label",
			children: "Ease"
		}), /* @__PURE__ */ u("input", {
			type: "text",
			class: "up-text-input up-ease-input",
			"aria-label": "Bézier coordinates",
			spellcheck: false,
			value: draft ?? formatEase([...ease]),
			onFocus: () => {
				cancelled.current = false;
				setDraft(formatEase([...ease]));
			},
			onInput: (e) => setDraft(e.target.value),
			onBlur: () => {
				const parsed = draft === null || cancelled.current ? null : parseEase(draft);
				if (parsed) onChange(parsed);
				setDraft(null);
			},
			onKeyDown: (e) => {
				if (e.key === "Enter") e.target.blur();
				if (e.key === "Escape") {
					cancelled.current = true;
					e.target.blur();
				}
			}
		})]
	});
}
//#endregion
//#region src/ui/color/ScrubField.tsx
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const DRAG_THRESHOLD = 3;
/** Pointer lock hides the OS cursor; this stand-in stays where the drag began. */
function virtualCursor(field) {
	const root = field.getRootNode();
	let cursor = root.querySelector(".up-vcursor");
	if (!cursor) {
		cursor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		cursor.setAttribute("class", "up-vcursor");
		cursor.setAttribute("viewBox", "0 0 24 24");
		cursor.innerHTML = "<path d=\"M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z\" fill=\"#fff\" stroke=\"#000\" stroke-width=\"1.2\" stroke-linejoin=\"round\"/>";
		(root instanceof Document ? root.body : root).appendChild(cursor);
	}
	return cursor;
}
/**
* Press and drag left/right to change the value (Shift ×10, Alt ×0.1). The
* pointer is locked so long drags never hit the screen edge; a press without
* movement switches to typing.
*/
function ScrubField({ label, value, onChange, min, max, step, digits = 0, suffix = "", wrap, class: cls }) {
	const fieldRef = A$1(null);
	const inputRef = A$1(null);
	const [editing, setEditing] = d(false);
	const [scrubbing, setScrubbing] = d(false);
	const [draft, setDraft] = d("");
	const cancelled = A$1(false);
	const latest = A$1({
		value,
		onChange,
		min,
		max,
		step,
		wrap
	});
	latest.current = {
		value,
		onChange,
		min,
		max,
		step,
		wrap
	};
	const fmt = (v) => v.toFixed(digits) + suffix;
	const apply = (v) => {
		const { min, max, wrap, onChange } = latest.current;
		onChange(wrap ? ((v - min) % (max - min) + (max - min)) % (max - min) + min : clamp(v, min, max));
	};
	y(() => {
		if (!editing) return;
		inputRef.current?.focus();
		inputRef.current?.select();
	}, [editing]);
	const onMouseDown = (e) => {
		const field = fieldRef.current;
		if (e.button !== 0 || editing || !field) return;
		e.preventDefault();
		document.getSelection()?.removeAllRanges();
		const focused = activeElement();
		if (focused instanceof HTMLInputElement) focused.blur();
		const root = field.getRootNode();
		const locked = () => root.pointerLockElement === field;
		const cursor = virtualCursor(field);
		cursor.style.left = `${e.clientX}px`;
		cursor.style.top = `${e.clientY}px`;
		const start = latest.current.value;
		let moved = 0;
		let acc = 0;
		const onLockChange = () => cursor.classList.toggle("up-vcursor-on", locked());
		const onMove = (ev) => {
			moved += Math.abs(ev.movementX);
			if (moved < DRAG_THRESHOLD) return;
			setScrubbing(true);
			acc += ev.movementX * latest.current.step * (ev.shiftKey ? 10 : ev.altKey ? .1 : 1);
			apply(start + acc);
		};
		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.removeEventListener("pointerlockchange", onLockChange);
			if (locked()) document.exitPointerLock();
			cursor.classList.remove("up-vcursor-on");
			setScrubbing(false);
			if (moved < DRAG_THRESHOLD) {
				cancelled.current = false;
				setDraft(fmt(latest.current.value));
				setEditing(true);
			}
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		document.addEventListener("pointerlockchange", onLockChange);
		try {
			field.requestPointerLock()?.catch?.(() => {});
		} catch {}
	};
	const commit = () => {
		setEditing(false);
		if (cancelled.current) return;
		const v = parseFloat(draft);
		if (!Number.isNaN(v)) apply(v);
	};
	return /* @__PURE__ */ u("label", {
		ref: fieldRef,
		class: `up-cp-field ${scrubbing ? "up-cp-field-scrubbing" : ""} ${editing ? "up-cp-field-editing" : ""} ${cls ?? ""}`,
		onMouseDown,
		children: [/* @__PURE__ */ u("span", { children: label }), /* @__PURE__ */ u("input", {
			ref: inputRef,
			spellcheck: false,
			tabIndex: editing ? 0 : -1,
			value: editing ? draft : fmt(value),
			onInput: (e) => setDraft(e.target.value),
			onBlur: commit,
			onKeyDown: (e) => {
				e.stopPropagation();
				if (e.key === "Enter") inputRef.current?.blur();
				if (e.key === "Escape") {
					cancelled.current = true;
					inputRef.current?.blur();
				}
			}
		})]
	});
}
function HexField({ value, onCommit }) {
	const [draft, setDraft] = d(null);
	const inputRef = A$1(null);
	const cancelled = A$1(false);
	return /* @__PURE__ */ u("label", {
		class: "up-cp-field up-cp-field-text",
		children: [/* @__PURE__ */ u("span", { children: "#" }), /* @__PURE__ */ u("input", {
			ref: inputRef,
			spellcheck: false,
			value: draft ?? value.slice(1, 7).toUpperCase(),
			onFocus: () => {
				cancelled.current = false;
				setDraft(value.slice(1, 7).toUpperCase());
			},
			onInput: (e) => setDraft(e.target.value),
			onBlur: () => {
				if (draft !== null && !cancelled.current) onCommit("#" + draft.replace(/^#/, ""));
				setDraft(null);
			},
			onKeyDown: (e) => {
				e.stopPropagation();
				if (e.key === "Enter") inputRef.current?.blur();
				if (e.key === "Escape") {
					cancelled.current = true;
					inputRef.current?.blur();
				}
			}
		})]
	});
}
//#endregion
//#region src/ui/color/ColorEditor.tsx
const clamp01 = (n) => Math.min(1, Math.max(0, n));
/** Pointer-captured drag that reports the position within the element as 0–1. */
function dragXY(onMove) {
	return (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		const el = e.currentTarget;
		el.setPointerCapture(e.pointerId);
		const report = (ev) => {
			const r = el.getBoundingClientRect();
			onMove(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height));
		};
		report(e);
		const up = () => {
			el.removeEventListener("pointermove", report);
			el.removeEventListener("pointerup", up);
		};
		el.addEventListener("pointermove", report);
		el.addEventListener("pointerup", up);
	};
}
const FORMATS = [
	"hex",
	"oklch",
	"rgb"
];
const nextFormat = (f) => FORMATS[(FORMATS.indexOf(f) + 1) % FORMATS.length];
function ColorEditor({ color, onChange, format, onFormat, classic, contrastWith }) {
	const set = (patch) => onChange({
		...color,
		...patch
	});
	const rgb = hsvToRgb(color);
	const opaque = toHex({
		...color,
		a: 1
	});
	const pure = toHex({
		h: color.h,
		s: 1,
		v: 1,
		a: 1
	});
	const EyeDropper = window.EyeDropper;
	const [l, c, h] = toOklch(color);
	const setOk = (nl, nc, nh) => onChange(fromOklch(nl, nc, nh, color));
	const alphaField = /* @__PURE__ */ u(ScrubField, {
		label: "A",
		value: color.a * 100,
		onChange: (v) => set({ a: v / 100 }),
		min: 0,
		max: 100,
		step: .5,
		suffix: "%",
		class: "up-cp-field-alpha"
	});
	return /* @__PURE__ */ u("div", {
		class: "up-cp-editor",
		children: [
			/* @__PURE__ */ u("div", {
				class: "up-cp-area",
				style: { background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pure})` },
				onPointerDown: dragXY((x, y) => set({
					s: x,
					v: 1 - y
				})),
				children: /* @__PURE__ */ u("i", {
					class: "up-cp-thumb",
					style: {
						left: `${color.s * 100}%`,
						top: `${(1 - color.v) * 100}%`,
						background: opaque
					}
				})
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-row",
				children: [
					EyeDropper && /* @__PURE__ */ u("button", {
						type: "button",
						class: "up-cp-icon-btn",
						title: "Pick from screen",
						onClick: async () => {
							try {
								const { sRGBHex } = await new EyeDropper().open();
								const picked = parseSolid(sRGBHex, color.h);
								if (picked) onChange({
									...picked,
									a: color.a
								});
							} catch {}
						},
						children: /* @__PURE__ */ u("svg", {
							viewBox: "0 0 24 24",
							children: /* @__PURE__ */ u("path", { d: "M14.5 4.5l5 5M11 8l5 5M4 20l1-4 9.5-9.5 3 3L8 19z" })
						})
					}),
					/* @__PURE__ */ u("div", {
						class: "up-cp-sliders",
						children: [/* @__PURE__ */ u("div", {
							class: "up-cp-slider up-cp-hue",
							onPointerDown: dragXY((x) => set({ h: x * 359.9 })),
							children: /* @__PURE__ */ u("i", {
								class: "up-cp-thumb",
								style: {
									left: `${color.h / 360 * 100}%`,
									background: pure
								}
							})
						}), /* @__PURE__ */ u("div", {
							class: "up-cp-slider up-cp-alpha",
							onPointerDown: dragXY((x) => set({ a: Math.round(x * 100) / 100 })),
							children: [/* @__PURE__ */ u("b", { style: { background: `linear-gradient(to right, transparent, ${opaque})` } }), /* @__PURE__ */ u("i", {
								class: "up-cp-thumb",
								style: { left: `${color.a * 100}%` }
							})]
						})]
					}),
					/* @__PURE__ */ u("div", {
						class: "up-cp-preview",
						children: /* @__PURE__ */ u("b", { style: { background: toHex(color) } })
					})
				]
			}),
			classic && /* @__PURE__ */ u("div", {
				class: "up-cp-dots",
				children: CLASSIC.map(([name, hex]) => /* @__PURE__ */ u(Dot, {
					hex,
					title: `${name} · ${hex}`,
					selected: opaque,
					onPick: (v) => onChange({
						...parseSolid(v, color.h),
						a: color.a
					})
				}, hex))
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-fields",
				children: [
					/* @__PURE__ */ u("button", {
						type: "button",
						class: "up-cp-format",
						title: `Format: ${format.toUpperCase()} (click to switch)`,
						onClick: onFormat,
						children: [format.toUpperCase(), /* @__PURE__ */ u("svg", {
							viewBox: "0 0 24 24",
							children: /* @__PURE__ */ u("path", { d: "M8 9l4-4 4 4M8 15l4 4 4-4" })
						})]
					}),
					format === "hex" && /* @__PURE__ */ u(HexField, {
						value: toHex(color, false),
						onCommit: (hex) => {
							const parsed = parseSolid(hex, color.h);
							if (parsed) onChange({
								...parsed,
								a: color.a
							});
							return !!parsed;
						}
					}),
					format === "oklch" && /* @__PURE__ */ u(k$1, { children: [
						/* @__PURE__ */ u(ScrubField, {
							label: "L",
							value: l * 100,
							onChange: (v) => setOk(v / 100, c, h),
							min: 0,
							max: 100,
							step: .25
						}),
						/* @__PURE__ */ u(ScrubField, {
							label: "C",
							value: c,
							onChange: (v) => setOk(l, v, h),
							min: 0,
							max: .37,
							step: .001,
							digits: 3,
							class: "up-cp-field-wide"
						}),
						/* @__PURE__ */ u(ScrubField, {
							label: "H",
							value: h,
							onChange: (v) => setOk(l, c, v),
							min: 0,
							max: 360,
							step: .5,
							wrap: true
						})
					] }),
					format === "rgb" && [
						0,
						1,
						2
					].map((i) => /* @__PURE__ */ u(ScrubField, {
						label: "RGB"[i],
						value: rgb[i] * 255,
						onChange: (v) => {
							const next = [...rgb];
							next[i] = v / 255;
							onChange(rgbToHsv(next, color.a, color.h));
						},
						min: 0,
						max: 255,
						step: .5
					}, i)),
					alphaField
				]
			}),
			contrastWith && contrastWith.length > 0 && /* @__PURE__ */ u(ContrastBadge, {
				color,
				backgrounds: contrastWith
			})
		]
	});
}
function Dot({ hex, title, selected, onPick, onPreview }) {
	const on = hex.toLowerCase() === selected.toLowerCase();
	const light = toOklch(parseSolid(hex))[0] > .9;
	return /* @__PURE__ */ u("button", {
		type: "button",
		class: `up-cp-dot ${on ? "up-cp-dot-on" : ""} ${light ? "up-cp-dot-light" : ""}`,
		style: { "--c": hex },
		title,
		onClick: () => onPick(hex),
		onMouseEnter: onPreview && (() => onPreview(hex))
	});
}
function ContrastBadge({ color, backgrounds }) {
	const [index, setIndex] = d(0);
	const bg = backgrounds[index % backgrounds.length];
	const bgColor = parseSolid(bg);
	if (!bgColor) return null;
	const ratio = contrastRatio(color, bgColor);
	const grade = contrastGrade(ratio);
	return /* @__PURE__ */ u("button", {
		type: "button",
		class: "up-cp-contrast",
		title: `Contrast against ${bg} (WCAG 2). Click to switch background.`,
		onClick: () => setIndex((i) => i + 1),
		children: [
			/* @__PURE__ */ u("span", {
				class: "up-cp-contrast-sample",
				style: {
					background: bg,
					color: toHex(color)
				},
				children: "Aa"
			}),
			/* @__PURE__ */ u("span", {
				class: "up-cp-contrast-ratio",
				children: [ratio.toFixed(2), ":1"]
			}),
			/* @__PURE__ */ u("span", {
				class: `up-cp-contrast-grade ${grade === "Fail" ? "up-cp-contrast-fail" : ""}`,
				children: grade
			}),
			/* @__PURE__ */ u("span", {
				class: "up-cp-contrast-bg",
				children: ["vs ", formatOf(bg) === "hex" ? bg.toUpperCase() : bg]
			})
		]
	});
}
//#endregion
//#region src/ui/color/GradientEditor.tsx
/** How far below the bar a dragged stop must go to be removed. */
const REMOVE_DISTANCE = 28;
function GradientEditor({ gradient: g, selected, onChange, format, onFormat }) {
	const barRef = A$1(null);
	const sel = Math.min(selected, g.stops.length - 1);
	const update = (patch, nextSel = sel) => onChange({
		...g,
		...patch
	}, nextSel);
	const removeStop = (i) => {
		if (g.stops.length <= 2) return;
		update({ stops: g.stops.filter((_, k) => k !== i) }, Math.max(0, i - 1));
	};
	const posAt = (clientX) => {
		const r = barRef.current.getBoundingClientRect();
		return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
	};
	const onBarDown = (e) => {
		if (e.button !== 0 || e.target.classList.contains("up-cp-stop")) return;
		const pos = posAt(e.clientX);
		update({ stops: [...g.stops, {
			pos,
			color: sampleGradient(g, pos)
		}] }, g.stops.length);
	};
	const onStopDown = (i) => (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		const el = e.currentTarget;
		el.setPointerCapture(e.pointerId);
		el.closest(".up-cp-gradient")?.focus({ preventScroll: true });
		let stops = g.stops;
		let removing = false;
		onChange(g, i);
		const move = (ev) => {
			const bar = barRef.current.getBoundingClientRect();
			removing = g.stops.length > 2 && ev.clientY - bar.bottom > REMOVE_DISTANCE;
			el.classList.toggle("up-cp-stop-removing", removing);
			stops = stops.map((s, k) => k === i ? {
				...s,
				pos: posAt(ev.clientX)
			} : s);
			onChange({
				...g,
				stops
			}, i);
		};
		const up = () => {
			el.removeEventListener("pointermove", move);
			el.removeEventListener("pointerup", up);
			if (removing) onChange({
				...g,
				stops: stops.filter((_, k) => k !== i)
			}, Math.max(0, i - 1));
		};
		el.addEventListener("pointermove", move);
		el.addEventListener("pointerup", up);
	};
	const stop = g.stops[sel];
	return /* @__PURE__ */ u("div", {
		class: "up-cp-gradient",
		tabIndex: -1,
		onKeyDown: (e) => {
			if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
				e.preventDefault();
				removeStop(sel);
			}
		},
		children: [
			/* @__PURE__ */ u("div", {
				class: "up-cp-gbar-wrap",
				children: /* @__PURE__ */ u("div", {
					ref: barRef,
					class: "up-cp-gbar",
					onPointerDown: onBarDown,
					title: "Click to add a stop",
					children: [/* @__PURE__ */ u("b", { style: { background: gradientCss(g, true) } }), g.stops.map((s, i) => /* @__PURE__ */ u("i", {
						class: `up-cp-stop ${i === sel ? "up-cp-stop-on" : ""}`,
						style: {
							left: `${s.pos * 100}%`,
							background: toHex(s.color)
						},
						onPointerDown: onStopDown(i)
					}, i))]
				})
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-row up-cp-between",
				children: [/* @__PURE__ */ u(Segmented, {
					value: g.type,
					options: [
						["linear", "Linear"],
						["radial", "Radial"],
						["conic", "Conic"]
					],
					onChange: (type) => update({ type })
				}), /* @__PURE__ */ u(ScrubField, {
					label: "∠",
					value: g.angle,
					onChange: (angle) => update({ angle }),
					min: 0,
					max: 360,
					step: 1,
					wrap: true,
					suffix: "°",
					class: `up-cp-field-angle ${g.type === "radial" ? "up-cp-hidden" : ""}`
				})]
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-row up-cp-between",
				children: [/* @__PURE__ */ u(Segmented, {
					value: g.interp,
					options: [
						["srgb", "sRGB"],
						["oklab", "OKLab"],
						["oklch", "OKLCH"]
					],
					onChange: (interp) => update({ interp })
				}), /* @__PURE__ */ u("span", {
					class: "up-cp-hint",
					children: "blend"
				})]
			}),
			/* @__PURE__ */ u(ColorEditor, {
				color: stop.color,
				onChange: (color) => update({ stops: g.stops.map((s, k) => k === sel ? {
					...s,
					color
				} : s) }),
				format,
				onFormat
			})
		]
	});
}
function Segmented({ value, options, onChange }) {
	return /* @__PURE__ */ u("div", {
		class: "up-cp-seg",
		role: "radiogroup",
		children: options.map(([v, label]) => /* @__PURE__ */ u("button", {
			type: "button",
			role: "radio",
			"aria-checked": v === value,
			class: v === value ? "up-cp-seg-on" : "",
			onClick: () => onChange(v),
			children: label
		}, v))
	});
}
//#endregion
//#region src/color/saved.ts
const KEY = "tunekit:saved-colors";
const listeners = /* @__PURE__ */ new Set();
function read() {
	try {
		const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
let items = read();
function write(next) {
	items = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(items));
	} catch {}
	listeners.forEach((fn) => fn());
}
const SavedColors = {
	get: () => items,
	add(item) {
		if (!items.some((i) => i.value === item.value)) write([...items, item]);
	},
	remove(value) {
		write(items.filter((i) => i.value !== value));
	},
	subscribe(fn) {
		listeners.add(fn);
		return () => listeners.delete(fn);
	}
};
function useSavedColors() {
	return C(SavedColors.subscribe, SavedColors.get);
}
//#endregion
//#region src/ui/color/Library.tsx
const CHEVRON = /* @__PURE__ */ u("svg", {
	viewBox: "0 0 24 24",
	children: /* @__PURE__ */ u("path", { d: "M9 6l6 6-6 6" })
});
/** Collapsible; the body renders on first open so a closed picker stays cheap. */
function Section({ title, jp, count, defaultOpen = false, free, children }) {
	const [open, setOpen] = d(defaultOpen);
	const [built, setBuilt] = d(defaultOpen);
	return /* @__PURE__ */ u("div", {
		class: "up-cp-sect",
		children: [/* @__PURE__ */ u("button", {
			type: "button",
			class: `up-cp-sect-head ${open ? "up-cp-sect-open" : ""}`,
			"aria-expanded": open,
			onClick: () => {
				setOpen(!open);
				setBuilt(true);
			},
			children: [
				title,
				jp && /* @__PURE__ */ u("span", {
					class: "up-cp-sect-jp",
					children: jp
				}),
				count !== void 0 && /* @__PURE__ */ u("span", {
					class: "up-cp-sect-n",
					children: count
				}),
				CHEVRON
			]
		}), built && /* @__PURE__ */ u("div", {
			class: `up-cp-sect-body ${free ? "up-cp-sect-free" : ""}`,
			hidden: !open,
			children: children()
		})]
	});
}
function Chip({ background, title, label, onPick, onPreview, onRemove }) {
	return /* @__PURE__ */ u("div", {
		class: "up-cp-chip",
		role: "button",
		tabIndex: 0,
		title,
		onClick: onPick,
		onMouseEnter: onPreview,
		onKeyDown: (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onPick();
			}
		},
		onContextMenu: onRemove && ((e) => {
			e.preventDefault();
			onRemove();
		}),
		children: [
			/* @__PURE__ */ u("b", { style: { background } }),
			label && /* @__PURE__ */ u("span", {
				class: "up-cp-chip-label",
				children: label
			}),
			onRemove && /* @__PURE__ */ u("button", {
				type: "button",
				class: "up-cp-chip-x",
				"aria-label": "Remove",
				onClick: (e) => {
					e.stopPropagation();
					onRemove();
				},
				children: "×"
			})
		]
	});
}
function SavedSection({ kind, current, onPick }) {
	const items = useSavedColors().filter((i) => i.kind === kind);
	return /* @__PURE__ */ u(Section, {
		title: "Saved",
		defaultOpen: true,
		free: true,
		children: () => /* @__PURE__ */ u("div", {
			class: `up-cp-chips ${kind === "gradient" ? "up-cp-chips-wide" : ""}`,
			children: [items.map((item) => /* @__PURE__ */ u(Chip, {
				background: item.value,
				title: item.value,
				onPick: () => onPick(item.value),
				onRemove: () => SavedColors.remove(item.value)
			}, item.value)), /* @__PURE__ */ u("button", {
				type: "button",
				class: "up-cp-chip up-cp-chip-add",
				title: kind === "solid" ? "Save current color" : "Save current gradient",
				onClick: () => SavedColors.add({
					kind,
					value: current
				}),
				children: /* @__PURE__ */ u("svg", {
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ u("path", { d: "M12 5v14M5 12h14" })
				})
			})]
		})
	});
}
const NEUTRAL_CHROMA = .025;
const BY_HUE = (() => {
	const hues = CLASSIC.map(([, hex]) => toOklch(parseSolid(hex))[2]);
	const columns = CLASSIC.map(() => []);
	const neutrals = [];
	for (const [, , hex] of WAIRO) {
		const [l, c, h] = toOklch(parseSolid(hex));
		if (c < NEUTRAL_CHROMA) {
			neutrals.push([l, hex]);
			continue;
		}
		const dist = (a) => Math.min(Math.abs(a - h), 360 - Math.abs(a - h));
		columns[hues.reduce((best, hue, i) => dist(hue) < dist(hues[best]) ? i : best, 0)].push([l, hex]);
	}
	const byLightness = (a, b) => b[0] - a[0];
	columns.forEach((col) => col.sort(byLightness));
	neutrals.sort(byLightness);
	const rows = Math.max(...columns.map((c) => c.length));
	const grid = [];
	for (let r = 0; r < rows; r++) for (const col of columns) grid.push(col[r]?.[1] ?? null);
	return {
		grid,
		neutrals: neutrals.map(([, hex]) => hex)
	};
})();
function TraditionalSection({ selected, onColor, onPreview, defaultOpen }) {
	return /* @__PURE__ */ u(Section, {
		title: "Traditional colors",
		jp: "日本の伝統色",
		count: WAIRO.length,
		defaultOpen,
		children: () => /* @__PURE__ */ u(k$1, { children: [
			/* @__PURE__ */ u("div", {
				class: "up-cp-dots",
				children: BY_HUE.grid.map((hex, i) => hex ? /* @__PURE__ */ u(Dot, {
					hex,
					title: hex,
					selected,
					onPick: onColor,
					onPreview
				}, hex) : /* @__PURE__ */ u("span", {}, `gap-${i}`))
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-dots-label",
				children: "Neutrals"
			}),
			/* @__PURE__ */ u("div", {
				class: "up-cp-dots",
				children: BY_HUE.neutrals.map((hex) => /* @__PURE__ */ u(Dot, {
					hex,
					title: hex,
					selected,
					onPick: onColor,
					onPreview
				}, hex))
			})
		] })
	});
}
const WAGRAD_CSS = () => WAGRAD.map(([name, kanji, hexes]) => [
	name,
	kanji,
	gradientCss(gradientFromHexes(hexes))
]);
function JapaneseGradientsSection({ onGradient, onPreview, defaultOpen }) {
	return /* @__PURE__ */ u(Section, {
		title: "Japanese gradients",
		jp: "和",
		count: WAGRAD.length,
		defaultOpen,
		children: () => /* @__PURE__ */ u("div", {
			class: "up-cp-chips up-cp-chips-wide",
			children: WAGRAD_CSS().map(([name, kanji, css]) => /* @__PURE__ */ u(Chip, {
				background: css,
				title: `${name} ${kanji}`,
				label: kanji,
				onPick: () => onGradient(css),
				onPreview: onPreview && (() => onPreview(css))
			}, name + kanji))
		})
	});
}
function WadaSection({ onColor, onGradient, onPreview }) {
	return /* @__PURE__ */ u(Section, {
		title: "Wada combinations",
		jp: "配色事典",
		count: WADA.k.length,
		children: () => /* @__PURE__ */ u("div", {
			class: "up-cp-combos",
			children: WADA.k.map((indexes, n) => /* @__PURE__ */ u("div", {
				class: "up-cp-combo",
				children: [
					/* @__PURE__ */ u("span", {
						class: "up-cp-combo-no",
						children: n + 1
					}),
					/* @__PURE__ */ u("div", {
						class: "up-cp-combo-strip",
						children: indexes.map((i) => {
							const [name, hex] = WADA.c[i];
							return /* @__PURE__ */ u("i", {
								style: { background: hex },
								title: `${name} · ${hex}`,
								onClick: () => onColor(hex),
								onMouseEnter: () => onPreview?.(hex)
							}, i);
						})
					}),
					onGradient && /* @__PURE__ */ u("button", {
						type: "button",
						title: "Use as gradient",
						onClick: () => onGradient(gradientCss(gradientFromHexes(indexes.map((i) => WADA.c[i][1])))),
						onMouseEnter: () => onPreview?.(gradientCss(gradientFromHexes(indexes.map((i) => WADA.c[i][1])))),
						children: "⇢"
					})
				]
			}, n))
		})
	});
}
function UiGradientsSection({ onGradient, onPreview }) {
	return /* @__PURE__ */ u(Section, {
		title: "uiGradients",
		count: UIGRADIENTS.length,
		children: () => /* @__PURE__ */ u(UiGradientsBody, {
			onGradient,
			onPreview
		})
	});
}
function UiGradientsBody({ onGradient, onPreview }) {
	const [query, setQuery] = d("");
	const q = query.trim().toLowerCase();
	return /* @__PURE__ */ u(k$1, { children: [/* @__PURE__ */ u("input", {
		class: "up-cp-search",
		placeholder: `Search ${UIGRADIENTS.length} gradients…`,
		value: query,
		onInput: (e) => setQuery(e.target.value),
		onKeyDown: (e) => e.stopPropagation()
	}), /* @__PURE__ */ u("div", {
		class: "up-cp-chips up-cp-chips-wide",
		children: UIGRADIENTS.filter(([name]) => name.toLowerCase().includes(q)).map(([name, colors]) => {
			const css = gradientCss(gradientFromHexes(colors));
			return /* @__PURE__ */ u(Chip, {
				background: css,
				title: name,
				onPick: () => onGradient(css),
				onPreview: onPreview && (() => onPreview(css))
			}, name);
		})
	})] });
}
let curated = null;
const loadCurated = () => curated ??= import("./curated-3iZeuxmB.mjs").then((n) => n.n).then((m) => m.CURATED);
const GRADIENT_ONLY = new Set(["webgradients"]);
const SEARCH_FROM = 40;
function CuratedSections({ onColor, onGradient, onPreview }) {
	const [list, setList] = d(null);
	y(() => {
		let live = true;
		loadCurated().then((c) => live && setList(c));
		return () => {
			live = false;
		};
	}, []);
	if (!list) return null;
	return /* @__PURE__ */ u(k$1, { children: list.filter((c) => onGradient || !GRADIENT_ONLY.has(c.id)).map((c) => /* @__PURE__ */ u(Section, {
		title: c.title,
		count: c.palettes.length,
		children: () => /* @__PURE__ */ u(CuratedBody, {
			collection: c,
			onColor,
			onGradient,
			onPreview
		})
	}, c.id)) });
}
function CuratedBody({ collection, onColor, onGradient, onPreview }) {
	const [query, setQuery] = d("");
	const q = query.trim().toLowerCase();
	const shown = collection.palettes.filter(([name]) => name.toLowerCase().includes(q));
	return /* @__PURE__ */ u(k$1, { children: [
		collection.palettes.length > SEARCH_FROM && /* @__PURE__ */ u("input", {
			class: "up-cp-search",
			placeholder: `Search ${collection.palettes.length}…`,
			value: query,
			onInput: (e) => setQuery(e.target.value),
			onKeyDown: (e) => e.stopPropagation()
		}),
		GRADIENT_ONLY.has(collection.id) && onGradient ? /* @__PURE__ */ u("div", {
			class: "up-cp-chips up-cp-chips-wide",
			children: shown.map(([name, colors]) => {
				const css = gradientCss(gradientFromHexes(colors));
				return /* @__PURE__ */ u(Chip, {
					background: css,
					title: name,
					onPick: () => onGradient(css),
					onPreview: onPreview && (() => onPreview(css))
				}, name);
			})
		}) : /* @__PURE__ */ u("div", {
			class: "up-cp-combos",
			children: shown.map(([name, colors]) => /* @__PURE__ */ u("div", {
				class: "up-cp-combo",
				children: [
					/* @__PURE__ */ u("span", {
						class: "up-cp-combo-name",
						title: name,
						children: name
					}),
					/* @__PURE__ */ u("div", {
						class: "up-cp-combo-strip",
						children: colors.map((hex, i) => /* @__PURE__ */ u("i", {
							style: { background: hex },
							title: hex,
							onClick: () => onColor(hex),
							onMouseEnter: () => onPreview?.(hex)
						}, i))
					}),
					onGradient && /* @__PURE__ */ u("button", {
						type: "button",
						title: "Use as gradient",
						onClick: () => onGradient(gradientCss(gradientFromHexes(colors))),
						onMouseEnter: () => onPreview?.(gradientCss(gradientFromHexes(colors))),
						children: "⇢"
					})
				]
			}, name))
		}),
		/* @__PURE__ */ u("div", {
			class: "up-cp-credit",
			children: [
				collection.credit,
				" · ",
				/* @__PURE__ */ u("a", {
					href: collection.source.split(",")[0],
					target: "_blank",
					rel: "noreferrer",
					children: "source"
				})
			]
		})
	] });
}
//#endregion
//#region src/ui/color/ColorControl.tsx
const POPOVER_WIDTH = 288;
const MIN_SIZE = {
	w: 260,
	h: 240
};
const SIZE_KEY = "tunekit-color-popover";
const loadSize = () => {
	try {
		const s = JSON.parse(localStorage.getItem(SIZE_KEY) ?? "null");
		return s && s.w > 0 && s.h > 0 ? s : null;
	} catch {
		return null;
	}
};
const saveSize = (s) => {
	try {
		if (s) localStorage.setItem(SIZE_KEY, JSON.stringify(s));
		else localStorage.removeItem(SIZE_KEY);
	} catch {}
};
const FALLBACK = {
	h: 0,
	s: 0,
	v: 0,
	a: 1
};
const TAB_ICONS = {
	solid: /* @__PURE__ */ u("svg", {
		viewBox: "0 0 24 24",
		children: /* @__PURE__ */ u("circle", {
			cx: "12",
			cy: "12",
			r: "8",
			fill: "currentColor"
		})
	}),
	gradient: /* @__PURE__ */ u("svg", {
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "2",
		children: [/* @__PURE__ */ u("circle", {
			cx: "12",
			cy: "12",
			r: "8"
		}), /* @__PURE__ */ u("path", {
			d: "M12 4a8 8 0 0 1 0 16z",
			fill: "currentColor"
		})]
	}),
	library: /* @__PURE__ */ u("svg", {
		viewBox: "0 0 24 24",
		fill: "currentColor",
		children: [
			/* @__PURE__ */ u("rect", {
				x: "4",
				y: "4",
				width: "7",
				height: "7",
				rx: "2"
			}),
			/* @__PURE__ */ u("rect", {
				x: "13",
				y: "4",
				width: "7",
				height: "7",
				rx: "2",
				opacity: ".6"
			}),
			/* @__PURE__ */ u("rect", {
				x: "4",
				y: "13",
				width: "7",
				height: "7",
				rx: "2",
				opacity: ".6"
			}),
			/* @__PURE__ */ u("rect", {
				x: "13",
				y: "13",
				width: "7",
				height: "7",
				rx: "2",
				opacity: ".35"
			})
		]
	})
};
function ColorControl({ label, value, onChange, portalContainer, gradient, contrast }) {
	const allowGradient = !!gradient || isGradient(value);
	const rowRef = A$1(null);
	const swatchRef = A$1(null);
	const popRef = A$1(null);
	const [open, setOpen] = d(false);
	const [size, setSize] = d(loadSize);
	const [solid, setSolid] = d(() => (isGradient(value) ? null : parseSolid(value)) ?? FALLBACK);
	const [grad, setGrad] = d(() => parseGradient(value) ?? gradientFromHexes([
		"#0F2540",
		"#8B81C3",
		"#FEDFE1"
	]));
	const [sel, setSel] = d(0);
	const [format, setFormat] = d(() => formatOf(value));
	const [tab, setTab] = d(() => isGradient(value) ? "gradient" : "solid");
	const [draft, setDraft] = d(null);
	const lastEmitted = A$1(value);
	y(() => {
		if (value === lastEmitted.current) return;
		lastEmitted.current = value;
		if (isGradient(value)) {
			const g = parseGradient(value);
			if (g) setGrad(g);
		} else {
			const c = parseSolid(value, solid.h);
			if (c) setSolid(c);
			setFormat(formatOf(value));
		}
	}, [value]);
	const emit = (next) => {
		lastEmitted.current = next;
		onChange(next);
	};
	const emitSolid = (c, f = format) => {
		setSolid(c);
		emit(formatSolid(c, f));
	};
	const emitGradient = (g, nextSel = sel) => {
		setGrad(g);
		setSel(nextSel);
		emit(gradientCss(g));
	};
	const held = A$1(null);
	const show = (v) => {
		if (isGradient(v)) {
			const g = parseGradient(v);
			if (g) {
				setGrad(g);
				setSel(0);
			}
		} else {
			const c = parseSolid(v, solid.h);
			if (c) setSolid(c);
		}
		emit(v);
	};
	const preview = (v) => {
		if (v === null) {
			const back = held.current;
			held.current = null;
			if (back !== null && back !== value) show(back);
			return;
		}
		held.current ??= value;
		if (v !== value) show(v);
	};
	const previewRef = A$1(preview);
	previewRef.current = preview;
	const pickColor = (hex) => {
		held.current = null;
		emitSolid({
			...parseSolid(hex, solid.h) ?? FALLBACK,
			a: 1
		});
		if (tab !== "library") setTab("solid");
	};
	const pickGradient = (css) => {
		const g = parseGradient(css);
		if (!g) return;
		held.current = null;
		emitGradient(g, 0);
		if (tab !== "library") setTab("gradient");
	};
	const pickSaved = (v) => isGradient(v) ? pickGradient(v) : pickColor(v);
	const switchTab = (next) => {
		setTab(next);
		if (next === "solid" && isGradient(value)) emitSolid({ ...grad.stops[Math.min(sel, grad.stops.length - 1)].color });
		if (next === "gradient" && !isGradient(value)) emitGradient(grad);
	};
	const cycleFormat = () => {
		const f = nextFormat(format);
		setFormat(f);
		if (!isGradient(value)) emitSolid(solid, f);
	};
	const close = q$1((refocus = false) => {
		previewRef.current(null);
		setOpen(false);
		if (refocus) swatchRef.current?.focus({ preventScroll: true });
	}, []);
	_(() => {
		if (!open || !portalContainer) return;
		const row = rowRef.current;
		const update = () => {
			const pop = popRef.current;
			if (!pop) return;
			const inner = pop.firstElementChild;
			const p = getDropdownPosition(row, portalContainer, {
				dropdownHeight: size ? size.h : (inner?.scrollHeight ?? 0) + 2,
				width: size?.w ?? POPOVER_WIDTH,
				maxHeight: size?.h ?? 640,
				preferSide: true,
				fixed: true,
				gap: 8
			});
			Object.assign(pop.style, {
				left: `${p.left}px`,
				top: `${p.top}px`,
				width: `${p.width}px`,
				maxHeight: `${p.maxHeight}px`,
				height: size ? `${Math.min(size.h, p.maxHeight)}px` : "",
				transformOrigin: p.above ? "bottom" : "top"
			});
			const shell = row.closest(".up-shell")?.getBoundingClientRect();
			pop.dataset.side = shell && p.left + p.width <= shell.left + 1 ? "before" : "after";
			pop.style.setProperty("--up-cp-sect-h", size ? `${Math.max(272, size.h - 330)}px` : "");
		};
		const stop = observeDropdownPosition(row, update, () => popRef.current);
		const outside = (e) => {
			const path = e.composedPath();
			if (!path.includes(popRef.current) && !path.includes(row)) close();
		};
		const onKey = (e) => {
			if (e.key === "Escape") close(true);
		};
		document.addEventListener("pointerdown", outside, true);
		window.addEventListener("keydown", onKey);
		return () => {
			stop();
			document.removeEventListener("pointerdown", outside, true);
			window.removeEventListener("keydown", onKey);
		};
	}, [
		open,
		portalContainer,
		close,
		size
	]);
	const resize = (e) => {
		e.preventDefault();
		e.stopPropagation();
		const pop = popRef.current;
		const from = pop.getBoundingClientRect();
		const sign = pop.dataset.side === "before" ? -1 : 1;
		const x0 = e.clientX;
		const y0 = e.clientY;
		let next = null;
		const move = (ev) => {
			next = {
				w: Math.round(Math.min(window.innerWidth - 16, Math.max(MIN_SIZE.w, from.width + sign * (ev.clientX - x0)))),
				h: Math.round(Math.min(window.innerHeight - 16, Math.max(MIN_SIZE.h, from.height + (ev.clientY - y0))))
			};
			setSize(next);
		};
		const up = () => {
			document.removeEventListener("pointermove", move);
			document.removeEventListener("pointerup", up);
			if (next) saveSize(next);
		};
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", up);
	};
	const isGrad = isGradient(value);
	const solidHex = toHex({
		...solid,
		a: 1
	});
	const contrastWith = [...new Set([
		contrast,
		"#ffffff",
		"#000000"
	].filter((c) => !!c))];
	const tabs = allowGradient ? [
		"solid",
		"gradient",
		"library"
	] : ["solid", "library"];
	return /* @__PURE__ */ u("div", {
		ref: rowRef,
		class: "dialkit-color-control",
		"data-open": open ? "true" : void 0,
		children: [
			/* @__PURE__ */ u("span", {
				class: "dialkit-color-label",
				children: label
			}),
			/* @__PURE__ */ u("div", {
				class: "dialkit-color-inputs",
				children: [isGrad && draft === null ? /* @__PURE__ */ u(CopyValue, { value }) : /* @__PURE__ */ u("input", {
					class: "dialkit-color-value",
					spellcheck: false,
					"aria-label": `${label} color value`,
					value: draft ?? value,
					title: value,
					onFocus: () => setDraft(value),
					onInput: (e) => setDraft(e.target.value),
					onBlur: () => {
						const text = draft?.trim() ?? "";
						setDraft(null);
						if (!text || text === value) return;
						if (isGradient(text) ? allowGradient && parseGradient(text) : parseSolid(text)) {
							lastEmitted.current = "";
							onChange(text);
						}
					},
					onKeyDown: (e) => {
						e.stopPropagation();
						if (e.key === "Enter") e.target.blur();
						if (e.key === "Escape") {
							setDraft(value);
							e.target.blur();
						}
					}
				}), /* @__PURE__ */ u("button", {
					ref: swatchRef,
					type: "button",
					class: "dialkit-color-swatch up-cp-swatch",
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-label": `Pick ${label.toLowerCase()} color`,
					style: { "--up-swatch": isGrad ? value : `linear-gradient(${value}, ${value})` },
					onClick: () => setOpen(!open)
				})]
			}),
			open && portalContainer && $(/* @__PURE__ */ u("div", {
				ref: popRef,
				class: "up-cp-pop",
				onWheel: containWheel,
				role: "dialog",
				"aria-label": `${label} color picker`,
				style: { position: "fixed" },
				onKeyDown: (e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						close(true);
					}
					e.stopPropagation();
				},
				children: [/* @__PURE__ */ u("div", {
					class: "up-cp-scroll",
					children: [
						/* @__PURE__ */ u("div", {
							class: "up-cp-tabs",
							role: "tablist",
							children: tabs.map((t) => /* @__PURE__ */ u("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === t,
								class: `up-cp-tab ${tab === t ? "up-cp-tab-on" : ""}`,
								onClick: () => switchTab(t),
								children: [TAB_ICONS[t], t[0].toUpperCase() + t.slice(1)]
							}, t))
						}),
						tab === "solid" && /* @__PURE__ */ u(k$1, { children: [
							/* @__PURE__ */ u(ColorEditor, {
								color: solid,
								onChange: (c) => emitSolid(c),
								format,
								onFormat: cycleFormat,
								classic: true,
								contrastWith
							}),
							/* @__PURE__ */ u(SavedSection, {
								kind: "solid",
								current: formatSolid(solid, format),
								onPick: pickSaved
							}),
							/* @__PURE__ */ u(TraditionalSection, {
								selected: isGrad ? "" : solidHex,
								onColor: pickColor,
								defaultOpen: true
							})
						] }),
						tab === "gradient" && /* @__PURE__ */ u(k$1, { children: [
							/* @__PURE__ */ u(GradientEditor, {
								gradient: grad,
								selected: sel,
								onChange: emitGradient,
								format,
								onFormat: () => setFormat(nextFormat(format))
							}),
							/* @__PURE__ */ u(SavedSection, {
								kind: "gradient",
								current: gradientCss(grad),
								onPick: pickSaved
							}),
							/* @__PURE__ */ u(JapaneseGradientsSection, { onGradient: pickGradient })
						] }),
						tab === "library" && /* @__PURE__ */ u("div", {
							class: "up-cp-library",
							onMouseLeave: () => preview(null),
							children: [
								allowGradient && /* @__PURE__ */ u(JapaneseGradientsSection, {
									onGradient: pickGradient,
									onPreview: preview,
									defaultOpen: true
								}),
								/* @__PURE__ */ u(TraditionalSection, {
									selected: isGrad ? "" : solidHex,
									onColor: pickColor,
									onPreview: preview,
									defaultOpen: !allowGradient
								}),
								/* @__PURE__ */ u(WadaSection, {
									onColor: pickColor,
									onGradient: allowGradient ? pickGradient : void 0,
									onPreview: preview
								}),
								allowGradient && /* @__PURE__ */ u(UiGradientsSection, {
									onGradient: pickGradient,
									onPreview: preview
								}),
								/* @__PURE__ */ u(CuratedSections, {
									onColor: pickColor,
									onGradient: allowGradient ? pickGradient : void 0,
									onPreview: preview
								})
							]
						})
					]
				}), /* @__PURE__ */ u("div", {
					class: "up-cp-grip",
					title: "Drag to resize · double-click to reset",
					onPointerDown: resize,
					onDblClick: () => {
						setSize(null);
						saveSize(null);
					},
					children: /* @__PURE__ */ u("svg", {
						viewBox: "0 0 10 10",
						children: /* @__PURE__ */ u("path", { d: "M9 3L3 9M9 6.5L6.5 9" })
					})
				})]
			}), portalContainer)
		]
	});
}
function CopyValue({ value }) {
	const [copied, setCopied] = d(false);
	const timer = A$1(0);
	y(() => () => clearTimeout(timer.current), []);
	const g = parseGradient(value);
	const summary = g ? `${g.type} · ${g.stops.length} stops` : "gradient";
	return /* @__PURE__ */ u("button", {
		type: "button",
		class: "up-cp-copy",
		"data-copied": copied ? "true" : void 0,
		title: `${value}\n\nClick to copy`,
		onClick: () => {
			navigator.clipboard.writeText(value).then(() => {
				setCopied(true);
				clearTimeout(timer.current);
				timer.current = window.setTimeout(() => setCopied(false), 1400);
			});
		},
		children: [/* @__PURE__ */ u("span", {
			class: "up-cp-copy-text",
			children: copied ? "copied" : summary
		}, copied ? "copied" : "summary"), /* @__PURE__ */ u("span", {
			class: "up-cp-copy-icon",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ u("svg", {
				class: "up-cp-copy-a",
				viewBox: "0 0 24 24",
				children: [/* @__PURE__ */ u("rect", {
					x: "9",
					y: "9",
					width: "11",
					height: "11",
					rx: "2"
				}), /* @__PURE__ */ u("path", { d: "M5 15V6a2 2 0 0 1 2-2h9" })]
			}), /* @__PURE__ */ u("svg", {
				class: "up-cp-copy-b",
				viewBox: "0 0 24 24",
				children: /* @__PURE__ */ u("path", { d: "M5 12.5l4.5 4.5L19 7.5" })
			})]
		})]
	});
}
//#endregion
//#region src/ui/Panel.tsx
function Panel({ panel, values, portalContainer, activeShortcutPath }) {
	const renderControl = (control) => {
		const value = values[control.path];
		const set = (v) => PaneStore.updateValue(panel.id, control.path, v);
		const shortcutActive = activeShortcutPath === control.path;
		switch (control.type) {
			case "slider": return /* @__PURE__ */ u(Slider, {
				label: control.label,
				value,
				onChange: (v) => PaneStore.updateValue(panel.id, control.path, v),
				min: control.min ?? 0,
				max: control.max ?? 100,
				step: control.step ?? 1,
				shortcut: control.shortcut,
				shortcutActive
			}, control.path);
			case "toggle": return /* @__PURE__ */ u(Toggle, {
				label: control.label,
				checked: value,
				onChange: (v) => PaneStore.updateValue(panel.id, control.path, v),
				shortcut: control.shortcut,
				shortcutActive
			}, control.path);
			case "action": return /* @__PURE__ */ u(Action, {
				label: control.label,
				onClick: () => PaneStore.triggerAction(panel.id, control.path)
			}, control.path);
			case "slot": return /* @__PURE__ */ u(Slot, {
				panelId: panel.id,
				path: control.path,
				label: control.label
			}, control.path);
			case "select": return /* @__PURE__ */ u(Select, {
				label: control.label,
				value,
				options: control.options ?? [],
				onChange: (v) => PaneStore.updateValue(panel.id, control.path, v),
				portalContainer
			}, control.path);
			case "text": return /* @__PURE__ */ u(TextInput, {
				label: control.label,
				value,
				onChange: (v) => PaneStore.updateValue(panel.id, control.path, v),
				placeholder: control.placeholder
			}, control.path);
			case "color": return /* @__PURE__ */ u(ColorControl, {
				label: control.label,
				value,
				onChange: set,
				portalContainer,
				gradient: control.gradient,
				contrast: control.contrast
			}, control.path);
			case "image": return /* @__PURE__ */ u(ImageControl, {
				label: control.label,
				value,
				options: control.options,
				onChange: set
			}, control.path);
			case "pad": return /* @__PURE__ */ u(DialPad, {
				label: control.label,
				value,
				x: control.pad?.x,
				y: control.pad?.y,
				labels: control.pad?.labels,
				onChange: set
			}, control.path);
			case "transition": return /* @__PURE__ */ u(TransitionControl, {
				label: control.label,
				value,
				onChange: (v) => PaneStore.updateValue(panel.id, control.path, v)
			}, control.path);
			case "folder": return /* @__PURE__ */ u(Folder, {
				title: control.label,
				defaultOpen: control.defaultOpen,
				children: control.children?.map(renderControl)
			}, control.path);
			default: return null;
		}
	};
	return /* @__PURE__ */ u("div", {
		class: "up-panel-section",
		children: panel.controls.map(renderControl)
	});
}
//#endregion
//#region src/ui/Preset.tsx
function PresetBar({ panelId, presets, activePresetId, portalContainer }) {
	const [isOpen, setIsOpen] = d(false);
	const triggerRef = A$1(null);
	const dropdownRef = A$1(null);
	const [pos, setPos] = d({
		top: 0,
		left: 0,
		width: 0
	});
	const hasPresets = presets.length > 0;
	const active = presets.find((p) => p.id === activePresetId);
	const open = q$1(() => {
		if (!hasPresets) return;
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) setPos({
			top: rect.bottom + 4,
			left: rect.left,
			width: rect.width
		});
		setIsOpen(true);
	}, [hasPresets]);
	const close = q$1(() => setIsOpen(false), []);
	y(() => {
		if (!isOpen) return;
		const handler = (e) => {
			const path = e.composedPath();
			if (triggerRef.current && path.includes(triggerRef.current) || dropdownRef.current && path.includes(dropdownRef.current)) return;
			close();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [isOpen, close]);
	const handleSelect = q$1((presetId) => {
		if (presetId) PaneStore.loadPreset(panelId, presetId);
		else PaneStore.clearActivePreset(panelId);
		close();
	}, [panelId, close]);
	const handleAdd = q$1(() => {
		const nextNum = presets.length + 2;
		PaneStore.savePreset(panelId, `Version ${nextNum}`);
	}, [panelId, presets.length]);
	const handleCopy = q$1(() => {
		const panel = PaneStore.getPanel(panelId);
		const changed = PaneStore.getChangedValues(panelId);
		const hasChanges = Object.keys(changed).length > 0;
		const json = JSON.stringify(hasChanges ? changed : PaneStore.getTunableValues(panelId), null, 2);
		const where = panel?.source ? ` in ${panel.source}` : "";
		const text = hasChanges ? `Update the usePane configuration for "${panel?.name ?? panelId}"${where} with these values:\n\n\`\`\`json\n${json}\n\`\`\`\n\nApply these values as the new defaults in the usePane call. Keys are dot-paths into the config; controls not listed are unchanged.` : `The usePane configuration for "${panel?.name ?? panelId}"${where} is at its defaults:\n\n\`\`\`json\n${json}\n\`\`\``;
		navigator.clipboard.writeText(text).catch(() => {});
	}, [panelId]);
	return /* @__PURE__ */ u("div", {
		class: "up-preset-bar",
		children: [
			/* @__PURE__ */ u("button", {
				ref: triggerRef,
				class: "up-preset-trigger",
				onClick: () => isOpen ? close() : open(),
				children: [/* @__PURE__ */ u("span", { children: active ? active.name : "Default" }), hasPresets && /* @__PURE__ */ u("svg", {
					class: `up-select-chevron ${isOpen ? "up-select-chevron-open" : ""}`,
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					children: /* @__PURE__ */ u("path", { d: "M6 9.5L12 15.5L18 9.5" })
				})]
			}),
			/* @__PURE__ */ u("button", {
				class: "up-preset-add",
				onClick: handleAdd,
				title: "Save preset",
				children: /* @__PURE__ */ u("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					children: /* @__PURE__ */ u("path", { d: "M12 5v14M5 12h14" })
				})
			}),
			/* @__PURE__ */ u("button", {
				class: "up-copy-btn",
				onClick: handleCopy,
				title: "Copy for AI",
				children: /* @__PURE__ */ u("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					children: [/* @__PURE__ */ u("path", { d: "M8 6C8 4.34 9.34 3 11 3h2c1.66 0 3 1.34 3 3v1H8V6Z" }), /* @__PURE__ */ u("path", { d: "M16 5h1c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V8c0-1.66 1.34-3 3-3h1" })]
				})
			}),
			isOpen && portalContainer && $(/* @__PURE__ */ u("div", {
				ref: dropdownRef,
				class: "up-preset-dropdown",
				style: {
					top: `${pos.top}px`,
					left: `${pos.left}px`,
					minWidth: `${pos.width}px`
				},
				children: [/* @__PURE__ */ u("div", {
					class: `up-preset-item ${!activePresetId ? "up-preset-item-active" : ""}`,
					onClick: () => handleSelect(null),
					children: /* @__PURE__ */ u("span", { children: "Default" })
				}), presets.map((preset) => /* @__PURE__ */ u("div", {
					class: `up-preset-item ${preset.id === activePresetId ? "up-preset-item-active" : ""}`,
					onClick: () => handleSelect(preset.id),
					children: [/* @__PURE__ */ u("span", { children: preset.name }), !preset.file && /* @__PURE__ */ u("button", {
						class: "up-preset-delete",
						onClick: (e) => {
							e.stopPropagation();
							PaneStore.deletePreset(panelId, preset.id);
						},
						title: "Delete",
						children: /* @__PURE__ */ u("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							"stroke-width": "2",
							"stroke-linecap": "round",
							"stroke-linejoin": "round",
							children: /* @__PURE__ */ u("path", { d: "M18 6L6 18M6 6l12 12" })
						})
					})]
				}, preset.id))]
			}), portalContainer)
		]
	});
}
//#endregion
//#region src/ui/useShortcuts.ts
/** Window-level shortcut handling (dialkit's ShortcutListener, as a hook). */
function useShortcuts() {
	const [active, setActive] = d(null);
	const keys = A$1(/* @__PURE__ */ new Set());
	const dragging = A$1(false);
	const lastX = A$1(null);
	const acc = A$1(0);
	y(() => {
		const resetPointer = () => {
			dragging.current = false;
			lastX.current = null;
			acc.current = 0;
		};
		const scrubBy = (dx, interaction) => {
			const target = resolveHeldTarget(keys.current, interaction);
			if (!target) return false;
			acc.current += dx;
			const steps = Math.trunc(acc.current / 4);
			if (steps !== 0) {
				acc.current -= steps * 4;
				applySliderDelta(target, getEffectiveStep(target.control, target.shortcut), steps);
			}
			return true;
		};
		const onKeyDown = (e) => {
			if (isInputFocused()) return;
			const key = e.key.toLowerCase();
			if (key.startsWith("arrow") && keys.current.size > 0) {
				const target = resolveHeldTarget(keys.current, "scroll") ?? resolveHeldTarget(keys.current, "drag") ?? resolveHeldTarget(keys.current, "move");
				if (target) {
					e.preventDefault();
					const dir = key === "arrowright" || key === "arrowup" ? 1 : -1;
					applySliderDelta(target, getEffectiveStep(target.control, target.shortcut), dir);
					return;
				}
			}
			const held = keys.current.has(key);
			keys.current.add(key);
			const target = resolveShortcutTarget(key, getActiveModifier(e));
			if (target) {
				setActive({
					panelId: target.panelId,
					path: target.path
				});
				if (!held && target.control.type === "toggle") {
					const v = PaneStore.getValue(target.panelId, target.path);
					PaneStore.updateValue(target.panelId, target.path, !v);
				}
			}
			if (!held) resetPointer();
		};
		const onKeyUp = (e) => {
			keys.current.delete(e.key.toLowerCase());
			resetPointer();
			let next = null;
			for (const k of keys.current) {
				const t = resolveShortcutTarget(k, getActiveModifier(e));
				if (t) {
					next = {
						panelId: t.panelId,
						path: t.path
					};
					break;
				}
			}
			setActive(next);
		};
		const onWheel = (e) => {
			if (isInputFocused()) return;
			const modifier = getActiveModifier(e);
			for (const key of keys.current) {
				const t = resolveShortcutTarget(key, modifier);
				if (!t || t.control.type !== "slider" || (t.shortcut.interaction ?? "scroll") !== "scroll") continue;
				e.preventDefault();
				applySliderDelta(t, getEffectiveStep(t.control, t.shortcut), e.deltaY > 0 ? -1 : 1);
				return;
			}
			const [t] = resolveScrollOnlyTargets();
			if (t) {
				e.preventDefault();
				applySliderDelta(t, getEffectiveStep(t.control, t.shortcut), e.deltaY > 0 ? -1 : 1);
			}
		};
		const onMouseDown = (e) => {
			if (isInputFocused() || keys.current.size === 0) return;
			if (resolveHeldTarget(keys.current, "drag")) {
				dragging.current = true;
				lastX.current = e.clientX;
				acc.current = 0;
				e.preventDefault();
			}
		};
		const onMouseMove = (e) => {
			if (isInputFocused() || keys.current.size === 0) return;
			const interaction = dragging.current ? "drag" : "move";
			if (lastX.current === null) {
				lastX.current = e.clientX;
				return;
			}
			const dx = e.clientX - lastX.current;
			lastX.current = e.clientX;
			if (!scrubBy(dx, interaction)) acc.current = 0;
		};
		const onBlur = () => {
			keys.current.clear();
			resetPointer();
			setActive(null);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("mousedown", onMouseDown);
		window.addEventListener("mouseup", resetPointer);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("blur", onBlur);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("wheel", onWheel);
			window.removeEventListener("mousedown", onMouseDown);
			window.removeEventListener("mouseup", resetPointer);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("blur", onBlur);
		};
	}, []);
	return active;
}
//#endregion
//#region src/ui/App.tsx
const LS_KEY = "tunekit-widget";
const LS_LAYOUT_KEY = "tunekit-layout";
const LS_COLLAPSED_KEY = "tunekit-collapsed";
function loadLS(key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function saveLS(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}
function TabsIcon() {
	return /* @__PURE__ */ u("svg", {
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		children: [/* @__PURE__ */ u("path", { d: "M3 9h18M3 9V6a2 2 0 0 1 2-2h4l2 5" }), /* @__PURE__ */ u("rect", {
			x: "3",
			y: "4",
			width: "18",
			height: "16",
			rx: "2"
		})]
	});
}
function StackIcon() {
	return /* @__PURE__ */ u("svg", {
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		children: [/* @__PURE__ */ u("rect", {
			x: "3",
			y: "3",
			width: "18",
			height: "7",
			rx: "2"
		}), /* @__PURE__ */ u("rect", {
			x: "3",
			y: "14",
			width: "18",
			height: "7",
			rx: "2"
		})]
	});
}
/** Tuning rows whose knobs line up into an arrow pointing into the screen; drawn for the left edge. */
function KnobArrowIcon() {
	return /* @__PURE__ */ u("svg", {
		class: "up-knob-arrow",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-linecap": "round",
		children: [
			/* @__PURE__ */ u("path", {
				d: "M3 5h18M3 12h18M3 19h18",
				"stroke-width": "1.6",
				opacity: "0.25"
			}),
			/* @__PURE__ */ u("circle", {
				class: "up-knob-arrow-k up-knob-arrow-k1",
				cx: "9",
				cy: "5",
				r: "2.6",
				fill: "currentColor",
				stroke: "none"
			}),
			/* @__PURE__ */ u("circle", {
				class: "up-knob-arrow-k2",
				cx: "15",
				cy: "12",
				r: "2.6",
				fill: "currentColor",
				stroke: "none"
			}),
			/* @__PURE__ */ u("circle", {
				class: "up-knob-arrow-k up-knob-arrow-k3",
				cx: "9",
				cy: "19",
				r: "2.6",
				fill: "currentColor",
				stroke: "none"
			})
		]
	});
}
function App({ portalContainer, childrenSlot, defaultLayout = "tabs" }) {
	const adoptSlot = q$1((el) => {
		if (el && childrenSlot && childrenSlot.parentNode !== el) el.appendChild(childrenSlot);
	}, [childrenSlot]);
	const shellRef = A$1(null);
	const activeShortcut = useShortcuts();
	const [panels, setPanels] = d([]);
	const [values, setValues] = d({});
	const [activeTabId, setActiveTabId] = d(null);
	const savedShell = loadLS(LS_KEY);
	const savedCollapsed = loadLS(LS_COLLAPSED_KEY);
	const [corner, setCorner] = d(savedShell?.corner ?? "bottom-right");
	const [width, setWidth] = d(savedShell?.width ?? 320);
	const [height, setHeight] = d(savedShell?.height ?? 420);
	const [collapsed, setCollapsed] = d(savedCollapsed);
	const [docking, setDocking] = d(false);
	const [layout, setLayout] = d(() => loadLS(LS_LAYOUT_KEY) ?? defaultLayout);
	const [, setViewportTick] = d(0);
	y(() => {
		const onResize = () => setViewportTick((n) => n + 1);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	const fitted = fitToViewport(width, height);
	const shellW = fitted.width;
	const shellH = fitted.height;
	y(() => {
		const update = () => {
			const p = PaneStore.getPanels();
			setPanels(p);
			const v = {};
			for (const panel of p) v[panel.id] = PaneStore.getValues(panel.id);
			setValues(v);
		};
		update();
		return PaneStore.subscribeGlobal(update);
	}, []);
	y(() => {
		const unsubs = [];
		for (const panel of panels) unsubs.push(PaneStore.subscribe(panel.id, () => {
			setValues((prev) => ({
				...prev,
				[panel.id]: PaneStore.getValues(panel.id)
			}));
		}));
		return () => unsubs.forEach((u) => u());
	}, [panels]);
	y(() => {
		saveLS(LS_KEY, {
			corner,
			width,
			height
		});
	}, [
		corner,
		width,
		height
	]);
	y(() => {
		if (collapsed) saveLS(LS_COLLAPSED_KEY, collapsed);
		else try {
			localStorage.removeItem(LS_COLLAPSED_KEY);
		} catch {}
	}, [collapsed]);
	y(() => {
		saveLS(LS_LAYOUT_KEY, layout);
	}, [layout]);
	const pos = calculatePosition(corner, shellW, shellH);
	const currentPanel = panels.find((p) => p.id === activeTabId) ?? panels[0] ?? null;
	y(() => {
		if (currentPanel) PaneStore.setActiveTab(currentPanel.name);
	}, [currentPanel?.name]);
	const handleDrag = q$1((e) => {
		if (e.target.closest("button")) return;
		e.preventDefault();
		const shell = shellRef.current;
		if (!shell) return;
		const initMX = e.clientX;
		const initMY = e.clientY;
		const initX = pos.x;
		const initY = pos.y;
		let lastMX = initMX;
		let lastMY = initMY;
		let hasMoved = false;
		let rafId = null;
		shell.classList.add("up-shell-dragging");
		const onMove = (ev) => {
			if (rafId) return;
			hasMoved = true;
			lastMX = ev.clientX;
			lastMY = ev.clientY;
			rafId = requestAnimationFrame(() => {
				const cx = initX + (lastMX - initMX);
				const cy = initY + (lastMY - initMY);
				shell.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
				const r = cx + shellW;
				const b = cy + shellH;
				const outL = Math.max(0, -cx);
				const outR = Math.max(0, r - window.innerWidth);
				const outT = Math.max(0, -cy);
				const outB = Math.max(0, b - window.innerHeight);
				const hOut = Math.min(shellW, outL + outR);
				const vOut = Math.min(shellH, outT + outB);
				if (hOut * shellH + vOut * shellW - hOut * vOut > shellW * shellH * .35) {
					const wcx = cx + shellW / 2;
					const wcy = cy + shellH / 2;
					const scx = window.innerWidth / 2;
					const scy = window.innerHeight / 2;
					const tCorner = wcx < scx ? wcy < scy ? "top-left" : "bottom-left" : wcy < scy ? "top-right" : "bottom-right";
					const orientation = Math.max(outL, outR) > Math.max(outT, outB) ? "horizontal" : "vertical";
					const dock = dockOnEdge(getCollapsedEdge(tCorner, orientation), lastMX, lastMY);
					setCorner(dock.corner);
					setDocking(true);
					setCollapsed({
						corner: dock.corner,
						orientation,
						anchor: dock.anchor
					});
					cleanup();
				}
				rafId = null;
			});
		};
		const onUp = () => {
			cleanup();
			shell.classList.remove("up-shell-dragging");
			const totalMove = Math.sqrt((lastMX - initMX) ** 2 + (lastMY - initMY) ** 2);
			if (!hasMoved || totalMove < 60) {
				shell.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
				return;
			}
			const newCorner = getSnapCorner(initX + (lastMX - initMX), initY + (lastMY - initMY), shellW, shellH);
			const snapped = calculatePosition(newCorner, shellW, shellH);
			shell.style.transition = "transform 0.25s cubic-bezier(0, 0, 0.2, 1)";
			shell.style.transform = `translate3d(${snapped.x}px, ${snapped.y}px, 0)`;
			const onEnd = () => {
				shell.style.transition = "";
				shell.removeEventListener("transitionend", onEnd);
			};
			shell.addEventListener("transitionend", onEnd);
			setCorner(newCorner);
		};
		const cleanup = () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			if (rafId) cancelAnimationFrame(rafId);
		};
		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	}, [
		pos.x,
		pos.y,
		shellW,
		shellH
	]);
	const collapsedDragged = A$1(false);
	const [dockTarget, setDockTarget] = d(null);
	const expand = q$1((to) => {
		if (!collapsed) return;
		setCollapsed(null);
		setCorner(to ?? collapsed.corner);
	}, [collapsed]);
	const handleCollapsedDrag = q$1((e) => {
		if (!collapsed || e.button !== 0) return;
		e.preventDefault();
		const el = e.currentTarget;
		collapsedDragged.current = false;
		const initMX = e.clientX;
		const initMY = e.clientY;
		const rect = el.getBoundingClientRect();
		const grabX = initMX - rect.left;
		const grabY = initMY - rect.top;
		let lastX = initMX;
		let lastY = initMY;
		const setEdgeClass = (edge) => {
			el.classList.remove("up-collapsed-left", "up-collapsed-right", "up-collapsed-top", "up-collapsed-bottom");
			el.classList.add(`up-collapsed-${edge}`);
		};
		const onMove = (ev) => {
			lastX = ev.clientX;
			lastY = ev.clientY;
			if (!collapsedDragged.current) {
				if (Math.hypot(lastX - initMX, lastY - initMY) <= 4) return;
				collapsedDragged.current = true;
				el.classList.add("up-collapsed-dragging");
			}
			const expanding = isInExpandZone(lastX, lastY);
			el.classList.toggle("up-collapsed-will-expand", expanding);
			const dock = expanding ? null : collapsedFromPoint(lastX, lastY);
			const r = dock?.rect;
			const pulled = r && Math.hypot(r.x + r.width / 2 - lastX, r.y + r.height / 2 - lastY) < 90;
			setDockTarget(dock ? `${dock.edge}-${dock.anchor}` : "");
			setEdgeClass(pulled ? dock.edge : getCollapsedEdge(collapsed.corner, collapsed.orientation));
			if (pulled) {
				el.style.left = `${r.x}px`;
				el.style.top = `${r.y}px`;
				el.style.width = `${r.width}px`;
				el.style.height = `${r.height}px`;
			} else {
				el.style.left = `${lastX - grabX}px`;
				el.style.top = `${lastY - grabY}px`;
				el.style.width = `${rect.width}px`;
				el.style.height = `${rect.height}px`;
			}
		};
		const onUp = () => {
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
			if (!collapsedDragged.current) return;
			el.classList.remove("up-collapsed-dragging", "up-collapsed-will-expand");
			setDockTarget(null);
			if (isInExpandZone(lastX, lastY)) {
				expand(cornerFromPoint(lastX, lastY));
				return;
			}
			const next = collapsedFromPoint(lastX, lastY);
			el.style.left = `${next.rect.x}px`;
			el.style.top = `${next.rect.y}px`;
			el.style.width = `${next.rect.width}px`;
			el.style.height = `${next.rect.height}px`;
			setEdgeClass(next.edge);
			setCollapsed({
				corner: next.corner,
				orientation: next.orientation,
				anchor: next.anchor
			});
		};
		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	}, [collapsed, expand]);
	const handleResize = q$1((handle, e) => {
		e.preventDefault();
		e.stopPropagation();
		const initMX = e.clientX;
		const initMY = e.clientY;
		const initW = shellW;
		const initH = shellH;
		const initPos = calculatePosition(corner, shellW, shellH);
		const shell = shellRef.current;
		if (!shell) return;
		shell.classList.add("up-shell-dragging");
		const onMove = (ev) => {
			const dx = ev.clientX - initMX;
			const dy = ev.clientY - initMY;
			const result = calculateResizedSizeAndPosition(handle, initW, initH, initPos.x, initPos.y, dx, dy);
			setWidth(result.width);
			setHeight(result.height);
			shell.style.transform = `translate3d(${result.x}px, ${result.y}px, 0)`;
		};
		const onUp = () => {
			shell.classList.remove("up-shell-dragging");
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
		};
		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
	}, [
		shellW,
		shellH,
		corner
	]);
	const resizeHandles = (() => {
		const [v, h] = corner.split("-");
		const handles = [];
		if (v === "top") handles.push("bottom");
		else handles.push("top");
		if (h === "left") handles.push("right");
		else handles.push("left");
		handles.push(`${v === "top" ? "bottom" : "top"}-${h === "left" ? "right" : "left"}`);
		return handles;
	})();
	if (panels.length === 0) return null;
	if (collapsed) {
		const rect = getCollapsedPosition(collapsed.corner, collapsed.orientation, collapsed.anchor);
		const edge = getCollapsedEdge(collapsed.corner, collapsed.orientation);
		const title = panels.length === 1 ? panels[0].name : "tunekit";
		return /* @__PURE__ */ u(k$1, { children: [dockTarget !== null && allDocks().map((d) => /* @__PURE__ */ u("i", {
			class: `up-dock-mark up-dock-mark-${d.edge} ${dockTarget === `${d.edge}-${d.anchor}` ? "up-dock-mark-on" : ""}`,
			style: {
				left: `${d.rect.x}px`,
				top: `${d.rect.y}px`,
				width: `${d.rect.width}px`,
				height: `${d.rect.height}px`
			}
		}, `${d.edge}-${d.anchor}`)), /* @__PURE__ */ u("button", {
			type: "button",
			class: `up-collapsed up-collapsed-${edge} ${docking ? "up-collapsed-enter" : ""}`,
			onAnimationEnd: () => setDocking(false),
			style: {
				left: `${rect.x}px`,
				top: `${rect.y}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`
			},
			"aria-label": `Open ${title}`,
			title: `Open ${title}`,
			onPointerDown: handleCollapsedDrag,
			onClick: () => {
				if (collapsedDragged.current) return;
				expand();
			},
			children: /* @__PURE__ */ u(KnobArrowIcon, {})
		})] });
	}
	const stacked = layout === "stack" && panels.length > 1;
	const renderPanel = (panel) => /* @__PURE__ */ u(Panel, {
		panel,
		values: values[panel.id] ?? {},
		portalContainer,
		activeShortcutPath: activeShortcut?.panelId === panel.id ? activeShortcut.path : null
	});
	return /* @__PURE__ */ u("div", {
		ref: shellRef,
		class: "up-shell",
		onWheel: containWheel,
		style: {
			width: `${shellW}px`,
			height: `${shellH}px`,
			transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`
		},
		children: [
			/* @__PURE__ */ u("div", {
				class: "up-header",
				onPointerDown: handleDrag,
				children: [/* @__PURE__ */ u("div", {
					class: "up-header-left",
					children: /* @__PURE__ */ u("span", {
						class: "up-header-title",
						children: panels.length === 1 ? currentPanel?.name ?? "tunekit" : "tunekit"
					})
				}), panels.length > 1 && /* @__PURE__ */ u("div", {
					class: "up-header-actions",
					children: /* @__PURE__ */ u("button", {
						type: "button",
						class: "up-header-btn",
						"aria-label": stacked ? "Show panels as tabs" : "Show all panels on one page",
						title: stacked ? "Tabs" : "Single page",
						onClick: () => setLayout(stacked ? "tabs" : "stack"),
						children: stacked ? /* @__PURE__ */ u(TabsIcon, {}) : /* @__PURE__ */ u(StackIcon, {})
					})
				})]
			}),
			!stacked && panels.length > 1 && /* @__PURE__ */ u("div", {
				class: "up-tabs",
				children: panels.map((panel) => /* @__PURE__ */ u("button", {
					class: `up-tab ${panel.id === currentPanel?.id ? "up-tab-active" : ""}`,
					onClick: () => setActiveTabId(panel.id),
					children: panel.name
				}, panel.id))
			}),
			!stacked && currentPanel && /* @__PURE__ */ u(PresetBar, {
				panelId: currentPanel.id,
				presets: PaneStore.getPresets(currentPanel.id),
				activePresetId: PaneStore.getActivePresetId(currentPanel.id),
				portalContainer
			}),
			/* @__PURE__ */ u("div", {
				class: `up-content ${stacked ? "up-content-stacked" : ""}`,
				children: [/* @__PURE__ */ u("div", { ref: adoptSlot }), stacked ? panels.map((panel) => /* @__PURE__ */ u(Folder, {
					title: panel.name,
					variant: "section",
					toolbar: /* @__PURE__ */ u(PresetBar, {
						panelId: panel.id,
						presets: PaneStore.getPresets(panel.id),
						activePresetId: PaneStore.getActivePresetId(panel.id),
						portalContainer
					}),
					children: renderPanel(panel)
				}, panel.id)) : currentPanel && renderPanel(currentPanel)]
			}),
			resizeHandles.map((h) => /* @__PURE__ */ u("div", {
				class: `up-resize up-resize-${h}`,
				onPointerDown: (e) => handleResize(h, e)
			}, h))
		]
	});
}
//#endregion
//#region src/mount.ts
let refCount = 0;
let unmount = null;
let childrenSlotEl = null;
function getChildrenSlot() {
	return childrenSlotEl;
}
function initPane(options = {}) {
	refCount++;
	if (!unmount) unmount = mount(options);
	let released = false;
	return () => {
		if (released) return;
		released = true;
		refCount--;
		if (refCount === 0 && unmount) {
			unmount();
			unmount = null;
		}
	};
}
function mount(options) {
	const host = document.createElement("div");
	host.id = "tunekit-root";
	host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483645;pointer-events:none;";
	document.documentElement.appendChild(host);
	const shadow = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = STYLES + DIALKIT_STYLES;
	shadow.appendChild(style);
	childrenSlotEl = document.createElement("div");
	childrenSlotEl.className = "up-children";
	const container = document.createElement("div");
	container.className = "up-root";
	container.style.cssText = "pointer-events:auto;";
	shadow.appendChild(container);
	const portalContainer = document.createElement("div");
	portalContainer.className = "up-portal";
	shadow.appendChild(portalContainer);
	J$1(_$1(App, {
		portalContainer,
		childrenSlot: childrenSlotEl,
		defaultLayout: options.layout
	}), container);
	return () => {
		J$1(null, container);
		host.remove();
		childrenSlotEl = null;
	};
}
//#endregion
//#region src/react/PaneRoot.ts
const IS_DEV = typeof process !== "undefined" && process.env?.NODE_ENV ? process.env.NODE_ENV !== "production" : import.meta.env?.MODE ? import.meta.env.MODE !== "production" : true;
function PaneRoot(props) {
	const [slot, setSlot] = useState(null);
	const enabled = props.productionEnabled ?? IS_DEV;
	useEffect(() => {
		if (!enabled) return;
		const cleanup = initPane({ layout: props.layout });
		setSlot(getChildrenSlot());
		return cleanup;
	}, [enabled]);
	if (props.children && slot) return createPortal(props.children, slot);
	return null;
}
//#endregion
//#region src/react/PaneSlot.tsx
function PaneSlot({ panel, path, children }) {
	const panelId = useSyncExternalStore((cb) => PaneStore.subscribeGlobal(cb), () => PaneStore.getPanels().find((p) => p.name === panel)?.id ?? null, () => null);
	const slotNode = useSyncExternalStore((cb) => panelId ? PaneStore.subscribeSlot(panelId, path, cb) : () => {}, () => panelId ? PaneStore.getSlotNode(panelId, path) : null, () => null);
	if (!slotNode || !children) return null;
	return createPortal(children, slotNode);
}
//#endregion
//#region src/react/useActiveTab.ts
function useActiveTab() {
	return useSyncExternalStore((cb) => PaneStore.subscribeActiveTab(cb), () => PaneStore.getActiveTab(), () => PaneStore.getActiveTab());
}
//#endregion
export { PaneRoot, PaneSlot, PaneStore, initPane, useActiveTab, usePane, usePaneController };
