import type { Transition } from "./animate.ts";

export type SceneParams = {
  hero: {
    shape: string;
    scale: number;
    detail: number;
    knotP: number;
    knotQ: number;
    tube: number;
    spin: number;
    wobble: number;
    wireframe: boolean;
    flatShading: boolean;
    material: {
      color: string;
      roughness: number;
      metalness: number;
      clearcoat: number;
      emissive: string;
      emissiveIntensity: number;
      pattern: string;
      patternScale: number;
    };
  };
  field: {
    enabled: boolean;
    shape: string;
    count: number;
    spacing: number;
    size: number;
    floor: number;
    wave: { amplitude: number; frequency: number; speed: number; twist: number; ripple: boolean };
    palette: { colorA: string; colorB: string; roughness: number; metalness: number };
  };
  light: {
    ambient: number;
    key: { intensity: number; color: string; direction: { x: number; y: number } };
    rim: { intensity: number; color: string };
    point: { enabled: boolean; intensity: number; color: string; orbitRadius: number; orbitSpeed: number };
  };
  view: {
    camera: { fov: number; distance: number; height: number; orbit: boolean; orbitSpeed: number };
    world: {
      background: string;
      sky: boolean;
      skyGradient: string;
      fog: boolean;
      fogNear: number;
      fogFar: number;
      toneMapping: string;
      exposure: number;
    };
  };
  motion: {
    pulseSpring: Transition;
    pulseStrength: number;
    hoverEase: Transition;
    hoverScale: number;
    label: string;
  };
};

/** Monotonic counters: bump one to fire a one-shot effect in the scene. */
export type SceneSignals = { pulse: number; resetCamera: number };
