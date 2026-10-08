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
  /**
   * Render the pane inside this element instead of floating over the page:
   * it fills the element's width, with no drag, dock, resize or saved position.
   * Each hosted call is its own mount (not shared with the floating pane or
   * other hosts) and is torn down by the function it returns.
   */
  host?: HTMLElement;
};

export function getChildrenSlot(): HTMLDivElement | null {
  return childrenSlotEl;
}

export function initPane(options: InitPaneOptions = {}): () => void {
  if (options.host) return once(mountHosted(options.host, options));

  refCount++;
  if (!unmount) unmount = mount(options);

  return once(() => {
    refCount--;
    if (refCount === 0 && unmount) {
      unmount();
      unmount = null;
    }
  });
}

function once(fn: () => void): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fn();
  };
}

function mount(options: InitPaneOptions): () => void {
  const host = document.createElement("div");
  host.id = "tunekit-root";
  host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483645;pointer-events:none;";
  document.documentElement.appendChild(host);

  childrenSlotEl = document.createElement("div");
  childrenSlotEl.className = "up-children";

  const unrender = renderShadow(host, { childrenSlot: childrenSlotEl, layout: options.layout, hosted: false });

  return () => {
    unrender();
    host.remove();
    childrenSlotEl = null;
  };
}

function mountHosted(target: HTMLElement, options: InitPaneOptions): () => void {
  // A child of the caller's element carries the shadow root, so the caller's
  // own element keeps its children and can't already have a shadow root.
  const host = document.createElement("div");
  host.className = "tunekit-hosted";
  host.style.cssText = "display:block;width:100%;";
  target.appendChild(host);

  const unrender = renderShadow(host, { childrenSlot: null, layout: options.layout, hosted: true });

  return () => {
    unrender();
    host.remove();
  };
}

function renderShadow(
  host: HTMLElement,
  props: { childrenSlot: HTMLDivElement | null; layout?: PaneLayout; hosted: boolean },
): () => void {
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES + DIALKIT_STYLES;
  shadow.appendChild(style);

  const container = document.createElement("div");
  container.className = "up-root";
  container.style.cssText = "pointer-events:auto;";
  shadow.appendChild(container);

  // After the shell so equal z-indexes resolve in the overlay's favour.
  const portalContainer = document.createElement("div");
  portalContainer.className = "up-portal";
  shadow.appendChild(portalContainer);

  render(
    h(App, {
      portalContainer,
      childrenSlot: props.childrenSlot,
      defaultLayout: props.layout,
      hosted: props.hosted,
    }),
    container,
  );

  return () => render(null, container);
}
