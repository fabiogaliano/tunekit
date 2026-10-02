// uipane addition: dialkit assumes light DOM. Inside a shadow root,
// document-level events and document.activeElement are retargeted to the
// shadow host, which breaks its outside-click and focus checks.

/** The focused element, descending through open shadow roots. */
export function activeElement(): Element | null {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/** The node an event really started on, even when observed from `document`. */
export function eventTarget(event: Event): Node {
  return (event.composedPath()[0] ?? event.target) as Node;
}
