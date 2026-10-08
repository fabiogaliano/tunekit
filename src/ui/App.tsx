import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  calculatePosition,
  calculateResizedSizeAndPosition,
  allDocks,
  collapsedFromPoint,
  cornerFromPoint,
  dockOnEdge,
  fitToViewport,
  isInExpandZone,
  getSnapCorner,
  getCollapsedEdge,
  getCollapsedPosition,
  MAGNET_RADIUS,
} from "../position.ts";
import { PaneStore } from "../store.ts";
import type {
  CollapsedState,
  Corner,
  PaneValue,
  PanelState,
} from "../types.ts";
import { containWheel } from "./containWheel.ts";
import { Folder } from "./Folder.tsx";
import { Panel } from "./Panel.tsx";
import { PresetBar } from "./Preset.tsx";
import { useShortcuts } from "./useShortcuts.ts";

const LS_KEY = "tunekit-widget";
const LS_LAYOUT_KEY = "tunekit-layout";

export type PaneLayout = "tabs" | "stack";
const LS_COLLAPSED_KEY = "tunekit-collapsed";

function loadLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveLS(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

type ShellState = {
  corner: Corner;
  width: number;
  height: number;
};

// =========================================================================
// Collapsed handle icon — a dial knob: track arc, value arc, pointer.
// =========================================================================
function TabsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9h18M3 9V6a2 2 0 0 1 2-2h4l2 5" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
    </svg>
  );
}

/** Tuning rows whose knobs line up into an arrow pointing into the screen; drawn for the left edge. */
function KnobArrowIcon() {
  return (
    <svg class="up-knob-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round">
      <path d="M3 5h18M3 12h18M3 19h18" stroke-width="1.6" opacity="0.25" />
      <circle class="up-knob-arrow-k up-knob-arrow-k1" cx="9" cy="5" r="2.6" fill="currentColor" stroke="none" />
      <circle class="up-knob-arrow-k2" cx="15" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle class="up-knob-arrow-k up-knob-arrow-k3" cx="9" cy="19" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// =========================================================================
// App — orchestrates expanded/collapsed panel
// =========================================================================

type AppProps = {
  portalContainer: HTMLElement | null;
  childrenSlot: HTMLDivElement | null;
  defaultLayout?: PaneLayout;
  /** Rendered inside a caller's element: no floating geometry, docking or saved position. */
  hosted?: boolean;
};

export function App({ portalContainer, childrenSlot, defaultLayout = "tabs", hosted = false }: AppProps) {
  const adoptSlot = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && childrenSlot && childrenSlot.parentNode !== el) {
        el.appendChild(childrenSlot);
      }
    },
    [childrenSlot],
  );
  const shellRef = useRef<HTMLDivElement>(null);

  const activeShortcut = useShortcuts();

  // Panels from store
  const [panels, setPanels] = useState<PanelState[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, PaneValue>>>({});
  // By id, not index: a tab unmounting must not silently select its neighbour.
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Shell geometry
  // A hosted pane must not adopt (or overwrite) the floating pane's saved geometry.
  const savedShell = hosted ? null : loadLS<ShellState>(LS_KEY);
  const savedCollapsed = hosted ? null : loadLS<CollapsedState>(LS_COLLAPSED_KEY);

  const [corner, setCorner] = useState<Corner>(savedShell?.corner ?? "bottom-right");
  const [width, setWidth] = useState(savedShell?.width ?? 320);
  const [height, setHeight] = useState(savedShell?.height ?? 420);
  const [collapsed, setCollapsed] = useState<CollapsedState | null>(savedCollapsed);
  const [docking, setDocking] = useState(false);
  const [layout, setLayout] = useState<PaneLayout>(() => loadLS<PaneLayout>(LS_LAYOUT_KEY) ?? defaultLayout);

  // width/height are the user's preferred size; what renders is that size
  // fitted into the current viewport, so a smaller window never loses it.
  const [, setViewportTick] = useState(0);
  useEffect(() => {
    if (hosted) return;
    const onResize = () => setViewportTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const fitted = fitToViewport(width, height);
  const shellW = fitted.width;
  const shellH = fitted.height;

  // Subscribe to store
  useEffect(() => {
    const update = () => {
      const p = PaneStore.getPanels();
      setPanels(p);
      const v: Record<string, Record<string, PaneValue>> = {};
      for (const panel of p) v[panel.id] = PaneStore.getValues(panel.id);
      setValues(v);
    };
    update();
    return PaneStore.subscribeGlobal(update);
  }, []);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    for (const panel of panels) {
      unsubs.push(
        PaneStore.subscribe(panel.id, () => {
          setValues((prev) => ({
            ...prev,
            [panel.id]: PaneStore.getValues(panel.id),
          }));
        }),
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [panels]);

  // Persist
  useEffect(() => {
    if (hosted) return;
    saveLS(LS_KEY, { corner, width, height });
  }, [corner, width, height]);

  useEffect(() => {
    if (hosted) return;
    if (collapsed) saveLS(LS_COLLAPSED_KEY, collapsed);
    else {
      try {
        localStorage.removeItem(LS_COLLAPSED_KEY);
      } catch {
        /* storage unavailable */
      }
    }
  }, [collapsed]);

  useEffect(() => {
    saveLS(LS_LAYOUT_KEY, layout);
  }, [layout]);

  // Position
  const pos = calculatePosition(corner, shellW, shellH);

  const currentPanel =
    panels.find((p) => p.id === activeTabId) ?? panels[0] ?? null;

  useEffect(() => {
    if (currentPanel) PaneStore.setActiveTab(currentPanel.name);
  }, [currentPanel?.name]);

  // ------- Drag (expanded) -------
  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
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
      let rafId: number | null = null;

      shell.classList.add("up-shell-dragging");

      const onMove = (ev: MouseEvent) => {
        if (rafId) return;
        hasMoved = true;
        lastMX = ev.clientX;
        lastMY = ev.clientY;

        rafId = requestAnimationFrame(() => {
          const cx = initX + (lastMX - initMX);
          const cy = initY + (lastMY - initMY);
          shell.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;

          // Check collapse threshold (35% area off-screen)
          const r = cx + shellW;
          const b = cy + shellH;
          const outL = Math.max(0, -cx);
          const outR = Math.max(0, r - window.innerWidth);
          const outT = Math.max(0, -cy);
          const outB = Math.max(0, b - window.innerHeight);
          const hOut = Math.min(shellW, outL + outR);
          const vOut = Math.min(shellH, outT + outB);
          const areaOut = hOut * shellH + vOut * shellW - hOut * vOut;

          if (areaOut > shellW * shellH * 0.35) {
            const wcx = cx + shellW / 2;
            const wcy = cy + shellH / 2;
            const scx = window.innerWidth / 2;
            const scy = window.innerHeight / 2;
            const tCorner: Corner =
              wcx < scx
                ? wcy < scy ? "top-left" : "bottom-left"
                : wcy < scy ? "top-right" : "bottom-right";
            const orientation =
              Math.max(outL, outR) > Math.max(outT, outB)
                ? ("horizontal" as const)
                : ("vertical" as const);

            // Dock at the magnet point nearest to where the pointer pushed the panel off.
            const edge = getCollapsedEdge(tCorner, orientation);
            const dock = dockOnEdge(edge, lastMX, lastMY);
            setCorner(dock.corner);
            setDocking(true);
            setCollapsed({ corner: dock.corner, orientation, anchor: dock.anchor });
            cleanup();
          }
          rafId = null;
        });
      };

      const onUp = () => {
        cleanup();
        shell.classList.remove("up-shell-dragging");

        const totalMove = Math.sqrt(
          (lastMX - initMX) ** 2 + (lastMY - initMY) ** 2,
        );
        if (!hasMoved || totalMove < 60) {
          shell.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
          return;
        }

        const newCorner = getSnapCorner(
          initX + (lastMX - initMX),
          initY + (lastMY - initMY),
          shellW,
          shellH,
        );
        const snapped = calculatePosition(newCorner, shellW, shellH);

        shell.style.transition =
          "transform 0.25s cubic-bezier(0, 0, 0.2, 1)";
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
    },
    [pos.x, pos.y, shellW, shellH],
  );

  // ------- Collapsed handle: click/Enter expands; drag to re-dock or expand -------
  const collapsedDragged = useRef(false);
  // Magnet points are only drawn while the handle is being dragged.
  const [dockTarget, setDockTarget] = useState<string | null>(null);

  const expand = useCallback(
    (to?: Corner) => {
      if (!collapsed) return;
      setCollapsed(null);
      setCorner(to ?? collapsed.corner);
    },
    [collapsed],
  );

  const handleCollapsedDrag = useCallback(
    (e: PointerEvent) => {
      if (!collapsed || e.button !== 0) return;
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      collapsedDragged.current = false;
      const initMX = e.clientX;
      const initMY = e.clientY;
      const rect = el.getBoundingClientRect();
      const grabX = initMX - rect.left;
      const grabY = initMY - rect.top;
      let lastX = initMX;
      let lastY = initMY;
      // Preact owns the class attribute, but mid-drag the shape must follow the edge it's pulled to.
      const setEdgeClass = (edge: string) => {
        el.classList.remove("up-collapsed-left", "up-collapsed-right", "up-collapsed-top", "up-collapsed-bottom");
        el.classList.add(`up-collapsed-${edge}`);
      };

      const onMove = (ev: PointerEvent) => {
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
        const pulled = r && Math.hypot(r.x + r.width / 2 - lastX, r.y + r.height / 2 - lastY) < MAGNET_RADIUS;
        setDockTarget(dock ? `${dock.edge}-${dock.anchor}` : "");
        setEdgeClass(pulled ? dock.edge : getCollapsedEdge(collapsed.corner, collapsed.orientation));
        if (pulled) {
          // Within reach of a point, the handle jumps onto it (in that edge's shape).
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
        // Write the snapped rect directly too: if it equals the previous
        // props, Preact won't touch the styles we mutated while dragging.
        el.style.left = `${next.rect.x}px`;
        el.style.top = `${next.rect.y}px`;
        el.style.width = `${next.rect.width}px`;
        el.style.height = `${next.rect.height}px`;
        setEdgeClass(next.edge);
        setCollapsed({ corner: next.corner, orientation: next.orientation, anchor: next.anchor });
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [collapsed, expand],
  );

  // ------- Resize -------
  const handleResize = useCallback(
    (handle: string, e: MouseEvent) => {
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

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - initMX;
        const dy = ev.clientY - initMY;
        const result = calculateResizedSizeAndPosition(
          handle,
          initW,
          initH,
          initPos.x,
          initPos.y,
          dx,
          dy,
        );
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
    },
    [shellW, shellH, corner],
  );

  // ------- Resize handles -------
  const resizeHandles = (() => {
    const [v, h] = corner.split("-") as [string, string];
    const handles: string[] = [];
    if (v === "top") handles.push("bottom");
    else handles.push("top");
    if (h === "left") handles.push("right");
    else handles.push("left");
    handles.push(`${v === "top" ? "bottom" : "top"}-${h === "left" ? "right" : "left"}`);
    return handles;
  })();

  if (panels.length === 0) return null;

  // ------- Collapsed state -------
  if (collapsed) {
    const rect = getCollapsedPosition(collapsed.corner, collapsed.orientation, collapsed.anchor);
    const edge = getCollapsedEdge(collapsed.corner, collapsed.orientation);
    const title = panels.length === 1 ? panels[0]!.name : "tunekit";
    return (
      <>
      {dockTarget !== null &&
        allDocks().map((d) => (
          <i
            key={`${d.edge}-${d.anchor}`}
            class={`up-dock-mark up-dock-mark-${d.edge} ${dockTarget === `${d.edge}-${d.anchor}` ? "up-dock-mark-on" : ""}`}
            style={{
              left: `${d.rect.x}px`,
              top: `${d.rect.y}px`,
              width: `${d.rect.width}px`,
              height: `${d.rect.height}px`,
            }}
          />
        ))}
      <button
        type="button"
        class={`up-collapsed up-collapsed-${edge} ${docking ? "up-collapsed-enter" : ""}`}
        onAnimationEnd={() => setDocking(false)}
        style={{
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }}
        aria-label={`Open ${title}`}
        title={`Open ${title}`}
        onPointerDown={handleCollapsedDrag}
        onClick={() => {
          if (collapsedDragged.current) return;
          expand();
        }}
      >
        <KnobArrowIcon />
      </button>
      </>
    );
  }

  // ------- Expanded state -------
  // Hosted: the caller's element owns placement and scrolling, so the shell
  // flows in it — no transform, no wheel containment (it would swallow the
  // host's own scroll), no drag or resize.
  // A single panel has nothing to stack, so it always uses the plain view.
  const stacked = layout === "stack" && panels.length > 1;

  const renderPanel = (panel: PanelState) => (
    <Panel
      panel={panel}
      values={values[panel.id] ?? {}}
      portalContainer={portalContainer}
      activeShortcutPath={activeShortcut?.panelId === panel.id ? activeShortcut.path : null}
    />
  );

  return (
    <div
      ref={shellRef}
      class={hosted ? "up-shell up-shell-hosted" : "up-shell"}
      onWheel={hosted ? undefined : containWheel}
      style={
        hosted
          ? undefined
          : {
              width: `${shellW}px`,
              height: `${shellH}px`,
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            }
      }
    >
      {/* Header */}
      <div class="up-header" onPointerDown={hosted ? undefined : handleDrag}>
        <div class="up-header-left">
          <span class="up-header-title">
            {panels.length === 1 ? currentPanel?.name ?? "tunekit" : "tunekit"}
          </span>
        </div>
        {panels.length > 1 && (
          <div class="up-header-actions">
            <button
              type="button"
              class="up-header-btn"
              aria-label={stacked ? "Show panels as tabs" : "Show all panels on one page"}
              title={stacked ? "Tabs" : "Single page"}
              onClick={() => setLayout(stacked ? "tabs" : "stack")}
            >
              {stacked ? <TabsIcon /> : <StackIcon />}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {!stacked && panels.length > 1 && (
        <div class="up-tabs">
          {panels.map((panel) => (
            <button
              key={panel.id}
              class={`up-tab ${panel.id === currentPanel?.id ? "up-tab-active" : ""}`}
              onClick={() => setActiveTabId(panel.id)}
            >
              {panel.name}
            </button>
          ))}
        </div>
      )}

      {!stacked && currentPanel && (
        <PresetBar
          panelId={currentPanel.id}
          presets={PaneStore.getPresets(currentPanel.id)}
          activePresetId={PaneStore.getActivePresetId(currentPanel.id)}
          portalContainer={portalContainer}
        />
      )}

      {/* Panel content */}
      <div class={`up-content ${stacked ? "up-content-stacked" : ""}`}>
        {/* React children slot — inside scrollable content */}
        <div ref={adoptSlot} />
        {stacked
          ? panels.map((panel) => (
              <Folder
                key={panel.id}
                title={panel.name}
                variant="section"
                toolbar={
                  <PresetBar
                    panelId={panel.id}
                    presets={PaneStore.getPresets(panel.id)}
                    activePresetId={PaneStore.getActivePresetId(panel.id)}
                    portalContainer={portalContainer}
                  />
                }
              >
                {renderPanel(panel)}
              </Folder>
            ))
          : currentPanel && renderPanel(currentPanel)}
      </div>

      {/* Resize handles */}
      {!hosted && resizeHandles.map((h) => (
        <div
          key={h}
          class={`up-resize up-resize-${h}`}
          onPointerDown={(e: PointerEvent) => handleResize(h, e)}
        />
      ))}
    </div>
  );
}
