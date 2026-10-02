export type Stats = { fps: number; instances: number; triangles: number };

export function createStatsStore() {
  let stats: Stats = { fps: 0, instances: 0, triangles: 0 };
  const listeners = new Set<() => void>();
  return {
    get: () => stats,
    set(next: Stats) {
      stats = next;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
  };
}

export type StatsStore = ReturnType<typeof createStatsStore>;
