function canScroll(el: HTMLElement, dx: number, dy: number): boolean {
  const style = getComputedStyle(el);
  const scrollsY = /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
  const scrollsX = /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth;
  if (dy !== 0 && scrollsY) {
    if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
  }
  if (dx !== 0 && scrollsX) {
    if (dx < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
  }
  return false;
}

/**
 * Wheel handler for floating surfaces: scrolls inside them never reach the page.
 * `overscroll-behavior: contain` alone misses wheels over parts that don't scroll
 * (the header, or content shorter than the panel), which chain straight to the page.
 */
export function containWheel(e: WheelEvent): void {
  const root = e.currentTarget as HTMLElement;
  for (let el = e.target as HTMLElement | null; el && el !== root.parentElement; el = el.parentElement) {
    if (canScroll(el, e.deltaX, e.deltaY)) return;
    if (el === root) break;
  }
  e.preventDefault();
}
