import "dialkit/styles.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Matrix } from "./matrix.tsx";
import { Compare, DialkitSide, TunekitSide } from "./views.tsx";

// tunekit has no position prop; seed its persisted shell state so the two
// panels don't stack in the same corner on first load.
if (!localStorage.getItem("tunekit-widget")) {
  localStorage.setItem("tunekit-widget", JSON.stringify({ corner: "top-left", width: 320, height: 560 }));
}

const ROUTES = {
  compare: { label: "Side by side", view: Compare },
  tunekit: { label: "tunekit demo", view: TunekitSide },
  dialkit: { label: "dialkit demo", view: DialkitSide },
  matrix: { label: "Feature matrix", view: Matrix },
} as const;

type Route = keyof typeof ROUTES;

function useRoute(): Route {
  const read = () => {
    const r = location.hash.replace("#/", "");
    return (r in ROUTES ? r : "compare") as Route;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

function App() {
  const route = useRoute();
  const View = ROUTES[route].view;
  return (
    <>
      <nav style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 4, background: "#111c", padding: 4, borderRadius: 8, backdropFilter: "blur(6px)" }}>
        {(Object.keys(ROUTES) as Route[]).map((r) => (
          <a key={r} href={`#/${r}`} style={{ padding: "4px 10px", borderRadius: 6, color: r === route ? "#fff" : "#888", background: r === route ? "#333" : "transparent", textDecoration: "none" }}>
            {ROUTES[r].label}
          </a>
        ))}
      </nav>
      <View key={route} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
