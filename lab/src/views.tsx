import { DialRoot } from "dialkit";
import { useMemo } from "react";
import { PaneRoot, PaneSlot } from "uipane";
import { useDialkitBinding, useUipaneBinding } from "./bindings.tsx";
import { Caption, StatsReadout } from "./Overlay.tsx";
import { Scene } from "./scene/Scene.tsx";
import { createStatsStore } from "./scene/stats.ts";

const half = { position: "relative", flex: 1, minWidth: 0, height: "100%" } as const;

export function UipaneSide() {
  const { params, signals } = useUipaneBinding();
  const stats = useMemo(createStatsStore, []);
  return (
    <div style={half}>
      <Scene params={params} signals={signals} stats={stats} />
      <Caption title="uipane" label={params.motion.label} stats={stats} />
      <PaneRoot />
      <PaneSlot panel="Hero" path="stats">
        <StatsReadout stats={stats} />
      </PaneSlot>
    </div>
  );
}

export function DialkitSide({ position = "top-right" }: { position?: "top-right" | "top-left" }) {
  const { params, signals } = useDialkitBinding();
  const stats = useMemo(createStatsStore, []);
  return (
    <div style={half}>
      <Scene params={params} signals={signals} stats={stats} />
      <Caption title="dialkit" label={params.motion.label} stats={stats} />
      <DialRoot position={position} theme="dark" />
    </div>
  );
}

export function Compare() {
  return (
    <div style={{ display: "flex", height: "100%", gap: 2, background: "#222" }}>
      <UipaneSide />
      <DialkitSide />
    </div>
  );
}
