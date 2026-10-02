import type { PaneConfig, ShortcutConfig } from "uipane";

// Small SVG tiles, inlined so the image control works offline.
const tile = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">${body}</svg>`)}`;

export const PATTERNS = [
  { value: tile('<rect width="64" height="64" fill="#fff"/>'), label: "Plain" },
  { value: tile('<rect width="64" height="64" fill="#fff"/><path d="M0 0h64v16H0zM0 32h64v16H0z" fill="#999"/>'), label: "Stripes" },
  { value: tile('<rect width="64" height="64" fill="#fff"/><path d="M0 0h32v32H0zM32 32h32v32H32z" fill="#888"/>'), label: "Checker" },
  { value: tile('<rect width="64" height="64" fill="#fff"/><circle cx="16" cy="16" r="9" fill="#888"/><circle cx="48" cy="48" r="9" fill="#888"/>'), label: "Dots" },
];

// Single source of truth for every dial, written in uipane's explicit format.
// adapters.ts derives the dialkit config from it, so both panels expose the
// exact same controls, ranges and defaults.

export const heroSchema = {
  stats: { type: "slot", label: "Live stats" },
  shape: { type: "select", options: ["knot", "torus", "icosahedron", "sphere"], value: "knot" },
  scale: { type: "slider", value: 1, min: 0.2, max: 3 },
  detail: { type: "slider", value: 160, min: 16, max: 400, step: 8 },
  knotP: { type: "slider", value: 2, min: 1, max: 9, step: 1 },
  knotQ: { type: "slider", value: 3, min: 1, max: 9, step: 1 },
  tube: { type: "slider", value: 0.32, min: 0.05, max: 1 },
  spin: { type: "slider", value: 0.4, min: -3, max: 3 },
  wobble: { type: "slider", value: 0.15, min: 0, max: 1 },
  wireframe: { type: "toggle", value: false },
  flatShading: { type: "toggle", value: false },
  material: {
    type: "folder",
    children: {
      color: { type: "color", value: "#7c5cff" },
      roughness: { type: "slider", value: 0.25, min: 0, max: 1 },
      metalness: { type: "slider", value: 0.55, min: 0, max: 1 },
      clearcoat: { type: "slider", value: 0.6, min: 0, max: 1 },
      emissive: { type: "color", value: "#1a0b4d" },
      emissiveIntensity: { type: "slider", value: 0.6, min: 0, max: 4 },
      pattern: { type: "image", options: PATTERNS, value: PATTERNS[0]!.value },
      patternScale: { type: "slider", value: 4, min: 1, max: 16, step: 1 },
    },
  },
  pulse: { type: "action", label: "Pulse" },
} satisfies PaneConfig;

export const fieldSchema = {
  enabled: { type: "toggle", value: true },
  shape: { type: "select", options: ["box", "sphere", "cone"], value: "box" },
  count: { type: "slider", value: 28, min: 4, max: 70, step: 1 },
  spacing: { type: "slider", value: 0.55, min: 0.2, max: 2 },
  size: { type: "slider", value: 0.22, min: 0.02, max: 1 },
  floor: { type: "slider", value: -2.2, min: -6, max: 2 },
  wave: {
    type: "folder",
    children: {
      amplitude: { type: "slider", value: 0.7, min: 0, max: 3 },
      frequency: { type: "slider", value: 0.45, min: 0, max: 2 },
      speed: { type: "slider", value: 1.2, min: 0, max: 6 },
      twist: { type: "slider", value: 0.3, min: 0, max: 2 },
      ripple: { type: "toggle", value: true },
    },
  },
  palette: {
    type: "folder",
    open: false,
    children: {
      colorA: { type: "color", value: "#00e0ff" },
      colorB: { type: "color", value: "#ff3d81" },
      roughness: { type: "slider", value: 0.5, min: 0, max: 1 },
      metalness: { type: "slider", value: 0.2, min: 0, max: 1 },
    },
  },
  randomize: { type: "action", label: "Randomize palette" },
} satisfies PaneConfig;

export const lightSchema = {
  ambient: { type: "slider", value: 0.25, min: 0, max: 2 },
  key: {
    type: "folder",
    children: {
      intensity: { type: "slider", value: 2.4, min: 0, max: 8 },
      color: { type: "color", value: "#fff4e0" },
      direction: {
        type: "pad",
        x: [40, -180, 180, 1],
        y: [50, 0, 90, 1],
        labels: { x: "Az", y: "El" },
      },
    },
  },
  rim: {
    type: "folder",
    children: {
      intensity: { type: "slider", value: 3, min: 0, max: 10 },
      color: { type: "color", value: "#4dd2ff" },
    },
  },
  // Shorthand (dialkit-style) works too: boolean → toggle, "#hex" → color,
  // [value, min, max, step?] → slider, plain object → folder.
  point: {
    _collapsed: true,
    enabled: true,
    intensity: [12, 0, 60, 1],
    color: "oklch(0.72 0.19 40)",
    orbitRadius: [3, 0.5, 8],
    orbitSpeed: [0.8, -4, 4],
  },
} satisfies PaneConfig;

export const viewSchema = {
  camera: {
    type: "folder",
    children: {
      fov: { type: "slider", value: 45, min: 15, max: 100, step: 1 },
      distance: { type: "slider", value: 12, min: 3, max: 30 },
      height: { type: "slider", value: 4, min: -10, max: 15 },
      orbit: { type: "toggle", value: true },
      orbitSpeed: { type: "slider", value: 0.15, min: -2, max: 2 },
    },
  },
  world: {
    type: "folder",
    children: {
      background: { type: "color", value: "#08080c" },
      sky: { type: "toggle", value: false },
      skyGradient: {
        type: "color",
        gradient: true,
        value: "linear-gradient(180deg in oklab, #0f2540 0%, #8b81c3 60%, #fedfe1 100%)",
      },
      fog: { type: "toggle", value: true },
      fogNear: { type: "slider", value: 8, min: 0, max: 40, step: 1 },
      fogFar: { type: "slider", value: 28, min: 5, max: 80, step: 1 },
      toneMapping: { type: "select", options: ["aces", "agx", "neutral", "none"], value: "agx" },
      exposure: { type: "slider", value: 1, min: 0.1, max: 3 },
    },
  },
  resetCamera: { type: "action", label: "Reset camera" },
} satisfies PaneConfig;

export const motionSchema = {
  pulseSpring: { type: "spring", visualDuration: 0.6, bounce: 0.55 },
  pulseStrength: { type: "slider", value: 0.6, min: 0, max: 2 },
  hoverEase: { type: "easing", duration: 0.35, ease: [0.2, 0, 0, 1] },
  hoverScale: { type: "slider", value: 1.15, min: 1, max: 2 },
  label: { type: "text", value: "uipane × dialkit", placeholder: "Overlay caption" },
} satisfies PaneConfig;

/** Same shortcut format in both libraries. Hold the key and scroll/drag. */
export const shortcuts: Record<string, Record<string, ShortcutConfig>> = {
  hero: {
    scale: { key: "s" },
    spin: { key: "r", interaction: "drag" },
    wireframe: { key: "w" },
  },
  field: {
    "wave.amplitude": { key: "a" },
    "wave.speed": { key: "d", mode: "fine" },
  },
  view: { "camera.distance": { key: "z", mode: "coarse" } },
};

export const sections = [
  { key: "hero", name: "Hero", schema: heroSchema },
  { key: "field", name: "Field", schema: fieldSchema },
  { key: "light", name: "Lighting", schema: lightSchema },
  { key: "view", name: "View", schema: viewSchema },
  { key: "motion", name: "Motion", schema: motionSchema },
] as const;
