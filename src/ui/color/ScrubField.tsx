import { useEffect, useRef, useState } from "preact/hooks";
import { activeElement } from "../../vendor/dialkit/shadow.ts";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const DRAG_THRESHOLD = 3;

type ScrubFieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** Value change per pixel of drag. */
  step: number;
  digits?: number;
  suffix?: string;
  /** Hue-like values wrap around instead of clamping. */
  wrap?: boolean;
  class?: string;
};

/** Pointer lock hides the OS cursor; this stand-in stays where the drag began. */
function virtualCursor(field: HTMLElement): SVGSVGElement {
  const root = field.getRootNode() as ShadowRoot | Document;
  let cursor = root.querySelector<SVGSVGElement>(".up-vcursor");
  if (!cursor) {
    cursor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cursor.setAttribute("class", "up-vcursor");
    cursor.setAttribute("viewBox", "0 0 24 24");
    cursor.innerHTML =
      '<path d="M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/>';
    (root instanceof Document ? root.body : root).appendChild(cursor);
  }
  return cursor;
}

/**
 * Press and drag left/right to change the value (Shift ×10, Alt ×0.1). The
 * pointer is locked so long drags never hit the screen edge; a press without
 * movement switches to typing.
 */
export function ScrubField({ label, value, onChange, min, max, step, digits = 0, suffix = "", wrap, class: cls }: ScrubFieldProps) {
  const fieldRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);
  const latest = useRef({ value, onChange, min, max, step, wrap });
  latest.current = { value, onChange, min, max, step, wrap };

  const fmt = (v: number) => v.toFixed(digits) + suffix;
  const apply = (v: number) => {
    const { min, max, wrap, onChange } = latest.current;
    onChange(wrap ? ((((v - min) % (max - min)) + (max - min)) % (max - min)) + min : clamp(v, min, max));
  };

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const onMouseDown = (e: MouseEvent) => {
    const field = fieldRef.current;
    if (e.button !== 0 || editing || !field) return;
    e.preventDefault();
    // A drag over selected text is what wakes PopClip-style tools; leave none.
    document.getSelection()?.removeAllRanges();
    const focused = activeElement();
    if (focused instanceof HTMLInputElement) focused.blur();

    const root = field.getRootNode() as ShadowRoot | Document;
    const locked = () => root.pointerLockElement === field;
    const cursor = virtualCursor(field);
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    const start = latest.current.value;
    let moved = 0;
    let acc = 0;

    const onLockChange = () => cursor.classList.toggle("up-vcursor-on", locked());
    const onMove = (ev: MouseEvent) => {
      moved += Math.abs(ev.movementX);
      if (moved < DRAG_THRESHOLD) return;
      setScrubbing(true);
      acc += ev.movementX * latest.current.step * (ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1);
      apply(start + acc);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (locked()) document.exitPointerLock();
      cursor.classList.remove("up-vcursor-on");
      setScrubbing(false);
      if (moved < DRAG_THRESHOLD) {
        cancelled.current = false;
        setDraft(fmt(latest.current.value));
        setEditing(true);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("pointerlockchange", onLockChange);
    // Browsers only grant pointer lock inside the press gesture itself.
    try {
      (field.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {});
    } catch {
      /* unsupported: falls back to plain movementX */
    }
  };

  const commit = () => {
    setEditing(false);
    if (cancelled.current) return;
    const v = parseFloat(draft);
    if (!Number.isNaN(v)) apply(v);
  };

  return (
    <label
      ref={fieldRef}
      class={`up-cp-field ${scrubbing ? "up-cp-field-scrubbing" : ""} ${editing ? "up-cp-field-editing" : ""} ${cls ?? ""}`}
      onMouseDown={onMouseDown}
    >
      <span>{label}</span>
      <input
        ref={inputRef}
        spellcheck={false}
        tabIndex={editing ? 0 : -1}
        value={editing ? draft : fmt(value)}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            inputRef.current?.blur();
          }
        }}
      />
    </label>
  );
}

type HexFieldProps = { value: string; onCommit: (hex: string) => boolean };

export function HexField({ value, onCommit }: HexFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  return (
    <label class="up-cp-field up-cp-field-text">
      <span>#</span>
      <input
        ref={inputRef}
        spellcheck={false}
        value={draft ?? value.slice(1, 7).toUpperCase()}
        onFocus={() => {
          cancelled.current = false;
          setDraft(value.slice(1, 7).toUpperCase());
        }}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
        onBlur={() => {
          if (draft !== null && !cancelled.current) onCommit("#" + draft.replace(/^#/, ""));
          setDraft(null);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            inputRef.current?.blur();
          }
        }}
      />
    </label>
  );
}
