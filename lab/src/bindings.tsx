import { useDialKitController } from "dialkit";
import { useCallback, useMemo, useState } from "react";
import { usePane, usePaneController } from "tunekit";
import { toDialkit } from "./adapters.ts";
import { fieldSchema, heroSchema, lightSchema, motionSchema, shortcuts, viewSchema } from "./schema.ts";
import type { SceneParams, SceneSignals } from "./scene/params.ts";

export type Binding = { params: SceneParams; signals: SceneSignals };

function randomHex(): string {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}

function useSignals() {
  const [signals, setSignals] = useState<SceneSignals>({ pulse: 0, resetCamera: 0 });
  const bump = useCallback(
    (key: keyof SceneSignals) => setSignals((s) => ({ ...s, [key]: s[key] + 1 })),
    [],
  );
  return [signals, bump] as const;
}

export function useTunekitBinding(): Binding {
  const [signals, bump] = useSignals();
  const persist = (name: string) => ({ key: `lab:tunekit:${name}` });
  const hero = usePane("Hero", heroSchema, {
    persist: persist("hero"),
    shortcuts: shortcuts.hero,
    onAction: (path) => path === "pulse" && bump("pulse"),
  });
  const fieldPane = usePaneController("Field", fieldSchema, {
    persist: persist("field"),
    shortcuts: shortcuts.field,
    onAction: (path) => {
      if (path !== "randomize") return;
      fieldPane.setValues({ palette: { colorA: randomHex(), colorB: randomHex() } });
    },
  });
  const field = fieldPane.values;
  const light = usePane("Lighting", lightSchema, { persist: persist("light") });
  const view = usePane("View", viewSchema, {
    persist: persist("view"),
    shortcuts: shortcuts.view,
    onAction: (path) => path === "resetCamera" && bump("resetCamera"),
  });
  const motion = usePane("Motion", motionSchema, { persist: persist("motion") });

  const params = { hero, field, light, view, motion } as unknown as SceneParams;
  return { params, signals };
}

const dk = {
  hero: toDialkit(heroSchema),
  field: toDialkit(fieldSchema),
  light: toDialkit(lightSchema),
  view: toDialkit(viewSchema),
  motion: toDialkit(motionSchema),
};

export function useDialkitBinding(): Binding {
  const [signals, bump] = useSignals();
  const persist = (name: string) => ({ key: `lab:dialkit:${name}` });
  const hero = useDialKitController("Hero", dk.hero, {
    id: "hero",
    persist: persist("hero"),
    shortcuts: shortcuts.hero,
    onAction: (path) => path === "pulse" && bump("pulse"),
  });
  const field = useDialKitController("Field", dk.field, {
    id: "field",
    persist: persist("field"),
    shortcuts: shortcuts.field,
    onAction: (path) => {
      if (path !== "randomize") return;
      field.setValue("palette.colorA", randomHex());
      field.setValue("palette.colorB", randomHex());
    },
  });
  const light = useDialKitController("Lighting", dk.light, { id: "light", persist: persist("light") });
  const view = useDialKitController("View", dk.view, {
    id: "view",
    persist: persist("view"),
    shortcuts: shortcuts.view,
    onAction: (path) => path === "resetCamera" && bump("resetCamera"),
  });
  const motion = useDialKitController("Motion", dk.motion, { id: "motion", persist: persist("motion") });

  const params = useMemo(
    () =>
      ({
        hero: hero.values,
        field: field.values,
        light: light.values,
        view: view.values,
        motion: motion.values,
      }) as unknown as SceneParams,
    [hero.values, field.values, light.values, view.values, motion.values],
  );
  return { params, signals };
}
