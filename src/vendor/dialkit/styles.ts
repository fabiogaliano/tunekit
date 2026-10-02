// Styles for the vendored dialkit controls (theme.css @ 0301abd, MIT).
// Kept on dialkit's class names so upstream changes diff cleanly; the
// --dial-* variables are mapped onto tunekit's palette below.
export const DIALKIT_STYLES = /* css */ `
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
