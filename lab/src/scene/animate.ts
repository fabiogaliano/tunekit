export type Transition =
  | {
      type: "spring";
      stiffness?: number;
      damping?: number;
      mass?: number;
      visualDuration?: number;
      bounce?: number;
    }
  | { type: "easing"; duration: number; ease: [number, number, number, number] };

// Same visualDuration/bounce → physics mapping Motion uses, so both panels'
// "Time" springs feel identical to what they'd produce in a Motion app.
function springConstants(t: Extract<Transition, { type: "spring" }>) {
  const usesPhysics =
    t.stiffness !== undefined || t.damping !== undefined || t.mass !== undefined;
  if (usesPhysics && t.visualDuration === undefined && t.bounce === undefined) {
    return { k: t.stiffness ?? 100, c: t.damping ?? 10, m: t.mass ?? 1 };
  }
  const vd = Math.max(0.05, t.visualDuration ?? 0.3);
  const bounce = Math.min(1, Math.max(0, t.bounce ?? 0.2));
  const k = (2 * Math.PI / vd) ** 2;
  return { k, c: 2 * (1 - bounce) * Math.sqrt(k), m: 1 };
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      const next = t - (sx(t) - x) / d;
      if (Math.abs(next - t) < 1e-6) { t = next; break; }
      t = next;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

/** Frame-stepped scalar animator driven by a panel transition value. */
export class Animator {
  value: number;
  private velocity = 0;
  private target: number;
  private from = 0;
  private elapsed = 0;

  constructor(initial: number, public transition: Transition) {
    this.value = initial;
    this.target = initial;
  }

  to(target: number) {
    if (target === this.target) return;
    this.target = target;
    this.from = this.value;
    this.elapsed = 0;
  }

  jump(value: number) {
    this.value = value;
    this.from = value;
    this.velocity = 0;
    this.elapsed = 0;
  }

  step(dt: number): number {
    const t = this.transition;
    if (t.type === "easing") {
      this.elapsed += dt;
      const p = Math.min(1, this.elapsed / Math.max(0.01, t.duration));
      this.value = this.from + (this.target - this.from) * cubicBezier(...t.ease)(p);
      return this.value;
    }
    const { k, c, m } = springConstants(t);
    // Substep so stiff springs stay stable at 60fps (explicit Euler blows up when ω·dt ≳ 2).
    const n = Math.max(1, Math.ceil(dt * Math.sqrt(k / m) / 0.5));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (-k * (this.value - this.target) - c * this.velocity) / m;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}
