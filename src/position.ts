import type { Corner, DockAnchor } from "./types.ts";

export const SAFE_AREA = 12;
export const MIN_WIDTH = 280;
export const MIN_HEIGHT = 200;
export const COLLAPSED_THICKNESS = 26;
export const COLLAPSED_LENGTH = 56;

export type CollapsedEdge = "left" | "right" | "top" | "bottom";

/** Fit a preferred panel size into the current viewport (never persisted). */
export function fitToViewport(
  width: number,
  height: number,
): { width: number; height: number } {
  return {
    width: Math.max(0, Math.min(width, window.innerWidth - SAFE_AREA * 2)),
    height: Math.max(0, Math.min(height, window.innerHeight - SAFE_AREA * 2)),
  };
}

export function calculatePosition(
  corner: Corner,
  width: number,
  height: number,
): { x: number; y: number } {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const right = ww - width - SAFE_AREA;
  const center = (ww - width) / 2;
  const bottom = wh - height - SAFE_AREA;

  switch (corner) {
    case "top-left":
      return { x: SAFE_AREA, y: SAFE_AREA };
    case "top-center":
      return { x: center, y: SAFE_AREA };
    case "top-right":
      return { x: right, y: SAFE_AREA };
    case "bottom-left":
      return { x: SAFE_AREA, y: bottom };
    case "bottom-center":
      return { x: center, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}

const SNAP_CORNERS: Corner[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

/** Snap target nearest to where the panel was dropped. */
export function getSnapCorner(x: number, y: number, width: number, height: number): Corner {
  const distance = (c: Corner) => {
    const p = calculatePosition(c, width, height);
    return (p.x - x) ** 2 + (p.y - y) ** 2;
  };
  return SNAP_CORNERS.reduce((best, c) => (distance(c) < distance(best) ? c : best));
}

export function getCollapsedEdge(
  corner: Corner,
  orientation: "horizontal" | "vertical",
): CollapsedEdge {
  if (orientation === "horizontal") return corner.endsWith("left") ? "left" : "right";
  return corner.startsWith("top") ? "top" : "bottom";
}

type Rect = { x: number; y: number; width: number; height: number };

const ANCHORS: DockAnchor[] = ["start", "center", "end"];

/** Pixel offset of an anchor along an edge `span` long. */
function anchorOffset(anchor: DockAnchor, span: number): number {
  if (anchor === "start") return SAFE_AREA;
  if (anchor === "end") return span - SAFE_AREA - COLLAPSED_LENGTH;
  return (span - COLLAPSED_LENGTH) / 2;
}

function edgeRect(edge: CollapsedEdge, anchor: DockAnchor): Rect {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  if (edge === "left" || edge === "right") {
    return {
      x: edge === "left" ? 0 : ww - COLLAPSED_THICKNESS,
      y: anchorOffset(anchor, wh),
      width: COLLAPSED_THICKNESS,
      height: COLLAPSED_LENGTH,
    };
  }
  return {
    x: anchorOffset(anchor, ww),
    y: edge === "top" ? 0 : wh - COLLAPSED_THICKNESS,
    width: COLLAPSED_LENGTH,
    height: COLLAPSED_THICKNESS,
  };
}

/** Rect of the collapsed handle, flush against its edge at one of the magnet points. */
export function getCollapsedPosition(
  corner: Corner,
  orientation: "horizontal" | "vertical",
  anchor?: DockAnchor,
): Rect {
  const edge = getCollapsedEdge(corner, orientation);
  const fallback: DockAnchor =
    orientation === "horizontal"
      ? corner.startsWith("top") ? "start" : "end"
      : corner.endsWith("left") ? "start" : "end";
  return edgeRect(edge, anchor ?? fallback);
}

export type Dock = {
  corner: Corner;
  orientation: "horizontal" | "vertical";
  anchor: DockAnchor;
  edge: CollapsedEdge;
  rect: Rect;
};

/** All 12 magnet points: each corner from both of its edges, plus every edge's middle. */
export function allDocks(): Dock[] {
  const edges: CollapsedEdge[] = ["top", "right", "bottom", "left"];
  return edges.flatMap((edge) => ANCHORS.map((anchor) => dockAt(edge, anchor, null)));
}

function dockAt(edge: CollapsedEdge, anchor: DockAnchor, pointer: { x: number; y: number } | null): Dock {
  const vertical = edge === "left" || edge === "right";
  // The corner decides where the panel opens on expand; a middle anchor takes the pointer's half.
  const half = (lo: string, hi: string, pos: number | undefined, span: number) =>
    anchor === "start" ? lo : anchor === "end" ? hi : (pos ?? 0) < span / 2 ? lo : hi;
  const corner = (
    vertical
      ? `${half("top", "bottom", pointer?.y, window.innerHeight)}-${edge}`
      : `${edge}-${half("left", "right", pointer?.x, window.innerWidth)}`
  ) as Corner;
  return { corner, orientation: vertical ? "horizontal" : "vertical", anchor, edge, rect: edgeRect(edge, anchor) };
}

/** Nearest magnet point on `edge` to a position along it. */
export function dockOnEdge(edge: CollapsedEdge, x: number, y: number): Dock {
  const vertical = edge === "left" || edge === "right";
  const along = vertical ? y : x;
  const span = vertical ? window.innerHeight : window.innerWidth;
  const anchor = ANCHORS.reduce((best, a) =>
    Math.abs(anchorOffset(a, span) + COLLAPSED_LENGTH / 2 - along) <
    Math.abs(anchorOffset(best, span) + COLLAPSED_LENGTH / 2 - along)
      ? a
      : best,
  );
  return dockAt(edge, anchor, { x, y });
}

/** A dragged handle this close to a magnet point jumps onto it. */
export const MAGNET_RADIUS = 90;

/** Releasing the handle further than this from every edge expands the panel. */
export const EXPAND_ZONE = 140;

/** Magnet point for a pointer anywhere on screen: nearest edge, then nearest point on it. */
export function collapsedFromPoint(x: number, y: number): Dock {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  const dists = { left: x, right: ww - x, top: y, bottom: wh - y };
  const edge = (Object.keys(dists) as CollapsedEdge[]).reduce((a, b) =>
    dists[b] < dists[a] ? b : a,
  );
  return dockOnEdge(edge, x, y);
}

export function isInExpandZone(x: number, y: number): boolean {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  return Math.min(x, ww - x, y, wh - y) > EXPAND_ZONE;
}

/** Corner the panel opens in when expanded from a point on screen. */
export function cornerFromPoint(x: number, y: number): Corner {
  const v = y < window.innerHeight / 2 ? "top" : "bottom";
  const h = x < window.innerWidth / 2 ? "left" : "right";
  return `${v}-${h}`;
}

export function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: Math.max(SAFE_AREA, Math.min(x, window.innerWidth - width - SAFE_AREA)),
    y: Math.max(
      SAFE_AREA,
      Math.min(y, window.innerHeight - height - SAFE_AREA),
    ),
  };
}

export function calculateResizedSizeAndPosition(
  handle: string,
  initialWidth: number,
  initialHeight: number,
  initialX: number,
  initialY: number,
  deltaX: number,
  deltaY: number,
): { width: number; height: number; x: number; y: number } {
  const maxW = window.innerWidth - SAFE_AREA * 2;
  const maxH = window.innerHeight - SAFE_AREA * 2;
  let w = initialWidth;
  let h = initialHeight;
  let x = initialX;
  let y = initialY;

  if (handle.includes("right")) {
    const avail = window.innerWidth - initialX - SAFE_AREA;
    w = Math.min(maxW, Math.max(MIN_WIDTH, Math.min(initialWidth + deltaX, avail)));
  }
  if (handle.includes("left")) {
    const avail = initialX + initialWidth - SAFE_AREA;
    const proposed = Math.min(maxW, Math.max(MIN_WIDTH, Math.min(initialWidth - deltaX, avail)));
    x = initialX - (proposed - initialWidth);
    w = proposed;
  }
  if (handle.includes("bottom")) {
    const avail = window.innerHeight - initialY - SAFE_AREA;
    h = Math.min(maxH, Math.max(MIN_HEIGHT, Math.min(initialHeight + deltaY, avail)));
  }
  if (handle.includes("top")) {
    const avail = initialY + initialHeight - SAFE_AREA;
    const proposed = Math.min(maxH, Math.max(MIN_HEIGHT, Math.min(initialHeight - deltaY, avail)));
    y = initialY - (proposed - initialHeight);
    h = proposed;
  }

  return { width: w, height: h, x, y };
}
