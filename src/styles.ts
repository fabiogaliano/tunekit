export const STYLES = /* css */ `
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

.up-cp-swatch {
  background: var(--up-swatch), repeating-conic-gradient(#aaa 0% 25%, #eee 0% 50%) 0 / 8px 8px;
}

/* The popover is promoted to the top layer ([popover]); undo the UA popover box. */
.up-cp-pop {
  inset: auto;
  margin: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  color: var(--up-text-2);
  background: var(--up-bg);
  border: 1px solid var(--up-border-hover);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  font: 13px/1.4 system-ui, -apple-system, sans-serif;
  user-select: none;
  animation: up-cp-enter 0.16s ease-out;
}
.up-cp-pop::-webkit-scrollbar { display: none; }
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
.up-cp-sect-body { max-height: 272px; margin: -6px; padding: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #333 transparent; }
.up-cp-sect-free { max-height: none; overflow: visible; }
.up-cp-sect-body[hidden] { display: none; }
.up-cp-search {
  width: 100%; height: 26px; margin-bottom: 6px; padding: 0 8px; border: 0; border-radius: 7px; outline: 0;
  background: var(--up-surface); color: var(--up-text-1); font: 12px system-ui, sans-serif;
}

.up-cp-chips { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; }
.up-cp-chips-wide { grid-template-columns: repeat(4, 1fr); }
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
