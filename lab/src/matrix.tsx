type Row = [feature: string, tunekit: string, dialkit: string];

const ROWS: Row[] = [
  ["Frameworks", "React (UI is Preact, bundled)", "React, Solid, Vue, Svelte, vanilla"],
  ["Style isolation", "Shadow DOM", "Global CSS (.dialkit-*), manual import"],
  ["Config syntax", "Explicit {type:…} only", "Shorthand: [v,min,max], bool, '#hex', nested object"],
  ["Slider / toggle / select / color / text", "✓", "✓"],
  ["Spring + easing editors", "✓ (static curves)", "✓ (draggable bezier handles, per-mode cache)"],
  ["Action buttons", "✓", "✓"],
  ["Embedded React content", "✓ slot + <PaneSlot>", "—"],
  ["XY pad", "—", "✓"],
  ["Image picker / upload", "—", "✓"],
  ["Timeline dock", "—", "✓ dialkit/timeline"],
  ["Multiple panels", "Tabs in one shell", "Stacked sections in one root"],
  ["Shell", "Drag, corner-snap, edge-dock handle, resize, viewport-fit", "Drag, collapse to icon, fixed corners"],
  ["Position API", "— (localStorage only)", "position prop, inline mode"],
  ["Persist shell geometry", "✓ localStorage", "—"],
  ["Persist values / presets", "✓ opt-in persist", "✓ opt-in persist"],
  ["Presets + Copy-for-AI", "✓ (changed values + source file)", "✓"],
  ["Agent bridge", "✓ tunekit/vite: .tunekit/values.json + set.json", "—"],
  ["Keyboard", "Roving focus, arrows, Home/End", "Full roving focus, arrows, Home/End"],
  ["Hotkey-scrub shortcuts", "✓ per-control", "✓ per-control"],
  ["Theme", "Dark only", "light / dark / system"],
  ["Controller API", "usePaneController: id, setValue(s), resetValues", "useDialKitController: setValue(s), reset"],
  ["Production gating", "Off in prod unless productionEnabled", "Off in prod unless productionEnabled"],
];

export function Matrix() {
  return (
    <div style={{ padding: "64px 24px 24px", maxWidth: 980, margin: "0 auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>{["", "tunekit 1.0.0", "dialkit 2.0.2"].map((h) => <th key={h} style={cell(true)}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {ROWS.map(([f, u, d]) => (
            <tr key={f}><td style={cell(true)}>{f}</td><td style={cell()}>{u}</td><td style={cell()}>{d}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cell(head = false) {
  return {
    textAlign: "left" as const,
    padding: "8px 10px",
    borderBottom: "1px solid #222",
    fontWeight: head ? 600 : 400,
    color: head ? "#fff" : "#bbb",
    verticalAlign: "top" as const,
  };
}
