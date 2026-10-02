import { useSyncExternalStore } from "react";
import type { StatsStore } from "./scene/stats.ts";

export function StatsReadout({ stats }: { stats: StatsStore }) {
  const s = useSyncExternalStore(stats.subscribe, stats.get);
  return (
    <div style={{ display: "flex", gap: 12, fontFamily: "ui-monospace, monospace", fontSize: 11, opacity: 0.85 }}>
      <span>{s.fps} fps</span>
      <span>{s.instances.toLocaleString()} inst</span>
      <span>{s.triangles.toLocaleString()} tris</span>
    </div>
  );
}

export function Caption({ title, label, stats }: { title: string; label: string; stats: StatsStore }) {
  return (
    <div style={{ position: "absolute", left: 16, bottom: 14, pointerEvents: "none", textShadow: "0 1px 4px #000" }}>
      <div style={{ fontWeight: 600, letterSpacing: 0.3 }}>{title}</div>
      <div style={{ opacity: 0.7, marginBottom: 4 }}>{label}</div>
      <StatsReadout stats={stats} />
    </div>
  );
}
