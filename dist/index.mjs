import { a as normalizeConfig, i as flattenValues, n as initPane, r as PaneStore, t as getChildrenSlot } from "./mount-BakjxrbQ.mjs";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
