import { useEffect, useState, type ReactNode, type ReactPortal } from "react";
import { createPortal } from "react-dom";
import { getChildrenSlot, initPane } from "../mount.ts";
import type { PaneLayout } from "../ui/App.tsx";

type ImportMetaEnv = { env?: { MODE?: string } };

// Bundlers replace one of these at build time; when neither is known, assume dev.
const IS_DEV =
  typeof process !== "undefined" && process.env?.NODE_ENV
    ? process.env.NODE_ENV !== "production"
    : (import.meta as ImportMetaEnv).env?.MODE
      ? (import.meta as ImportMetaEnv).env!.MODE !== "production"
      : true;

type PaneRootProps = {
  children?: ReactNode;
  /** Initial layout with several panels: one tab each, or all stacked on one page. */
  layout?: PaneLayout;
  /** Render in production builds too. Off by default, so a forgotten root never ships. */
  productionEnabled?: boolean;
};

export function PaneRoot(props: PaneRootProps): ReactPortal | null {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const enabled = props.productionEnabled ?? IS_DEV;

  useEffect(() => {
    if (!enabled) return;
    const cleanup = initPane({ layout: props.layout });
    setSlot(getChildrenSlot());
    return cleanup;
  }, [enabled]);

  if (props.children && slot) {
    return createPortal(props.children, slot);
  }

  return null;
}
