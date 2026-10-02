export type SpringAnimConfig = {
  stiffness?: number;
  damping?: number;
  mass?: number;
};

export type AnimationHandle = {
  stop: () => void;
};

export function animateSpring(
  from: number,
  to: number,
  config: SpringAnimConfig,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): AnimationHandle {
  const { stiffness = 300, damping = 25, mass = 0.8 } = config;
  let position = from;
  let velocity = 0;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let stopped = false;

  function tick(now: number) {
    if (stopped) return;
    if (lastTime === null) {
      lastTime = now;
      rafId = requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;

    const force = -stiffness * (position - to);
    const dampForce = -damping * velocity;
    const accel = (force + dampForce) / mass;
    velocity += accel * dt;
    position += velocity * dt;

    if (Math.abs(position - to) < 0.001 && Math.abs(velocity) < 0.01) {
      onUpdate(to);
      onComplete?.();
      return;
    }

    onUpdate(position);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}

export function animateValue(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): AnimationHandle {
  const startTime = performance.now();
  let rafId: number | null = null;
  let stopped = false;

  function tick(now: number) {
    if (stopped) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = from + (to - from) * eased;
    onUpdate(value);

    if (t >= 1) {
      onComplete?.();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      stopped = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}

export type SpringPhysics = { stiffness: number; damping: number; mass: number };

/** Motion's visualDuration/bounce → physical spring constants (mass 1). */
export function timeToPhysics(visualDuration: number, bounce: number): SpringPhysics {
  const stiffness = Math.pow((2 * Math.PI) / visualDuration, 2);
  return { stiffness, damping: 2 * (1 - bounce) * Math.sqrt(stiffness), mass: 1 };
}

export function physicsToTime({ stiffness, damping, mass }: SpringPhysics): {
  visualDuration: number;
  bounce: number;
} {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  return { visualDuration: (2 * Math.PI) / omega, bounce: Math.max(0, 1 - zeta) };
}

/**
 * Analytic step response (0 → 1, starting at rest). Closed form instead of
 * numeric integration: a fixed-step integrator diverges for stiff, light
 * springs that are still inside the editor's slider ranges.
 */
export function springProgress(t: number, { stiffness, damping, mass }: SpringPhysics): number {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - s);
  const r2 = -w0 * (zeta + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}
