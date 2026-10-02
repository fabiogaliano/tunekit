import { render, h } from "preact";
import { STYLES } from "./styles.ts";
import { DIALKIT_STYLES } from "./vendor/dialkit/styles.ts";
import { App, type PaneLayout } from "./ui/App.tsx";

// Each caller (e.g. every <PaneRoot>) holds a reference; the shadow host is
// only torn down when the last one releases it.
let refCount = 0;
let unmount: (() => void) | null = null;
let childrenSlotEl: HTMLDivElement | null = null;

export type InitPaneOptions = {
  /** Initial layout when the user hasn't picked one yet. The first caller wins. */
  layout?: PaneLayout;
};

export function getChildrenSlot(): HTMLDivElement | null {
  return childrenSlotEl;
}

export function initPane(options: InitPaneOptions = {}): () => void {
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

function mount(options: InitPaneOptions): () => void {
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

  // After the shell so equal z-indexes resolve in the overlay's favour.
  const portalContainer = document.createElement("div");
  portalContainer.className = "up-portal";
  shadow.appendChild(portalContainer);

  render(h(App, { portalContainer, childrenSlot: childrenSlotEl, defaultLayout: options.layout }), container);

  return () => {
    render(null, container);
    host.remove();
    childrenSlotEl = null;
  };
}
