import { useSyncExternalStore } from "preact/compat";

export type SavedColor = { kind: "solid" | "gradient"; value: string };

const KEY = "tunekit:saved-colors";
const listeners = new Set<() => void>();

function read(): SavedColor[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Shared by every color control on the page, so a color saved in one is
// available in all of them.
let items = read();

function write(next: SavedColor[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

export const SavedColors = {
  get: () => items,
  add(item: SavedColor) {
    if (!items.some((i) => i.value === item.value)) write([...items, item]);
  },
  remove(value: string) {
    write(items.filter((i) => i.value !== value));
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useSavedColors(): SavedColor[] {
  return useSyncExternalStore(SavedColors.subscribe, SavedColors.get);
}
