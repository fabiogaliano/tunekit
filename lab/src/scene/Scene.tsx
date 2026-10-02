import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Animator } from "./animate.ts";
import type { SceneParams, SceneSignals } from "./params.ts";
import type { StatsStore } from "./stats.ts";

const TONE_MAPPING: Record<string, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  none: THREE.NoToneMapping,
};

type Props = { params: SceneParams; signals: SceneSignals; stats: StatsStore };

export function Scene(props: Props) {
  const { world } = props.params.view;
  return (
    // With the sky on, the canvas clears to transparent and this CSS gradient shows through.
    <div style={{ width: "100%", height: "100%", background: world.sky ? world.skyGradient : undefined }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 9], fov: 45 }} gl={{ antialias: true }}>
        <World {...props} />
      </Canvas>
    </div>
  );
}

function World({ params, signals, stats }: Props) {
  const { world } = params.view;
  return (
    <>
      {!world.sky && <color attach="background" args={[world.background]} />}
      {world.fog && <fog attach="fog" args={[world.background, world.fogNear, world.fogFar]} />}
      <Renderer params={params} />
      <CameraRig params={params} signals={signals} />
      <Lights params={params} />
      <Hero params={params} signals={signals} />
      {params.field.enabled && <Field params={params} />}
      <StatsProbe stats={stats} />
    </>
  );
}

function Renderer({ params }: { params: SceneParams }) {
  const gl = useThree((s) => s.gl);
  const { toneMapping, exposure } = params.view.world;
  useEffect(() => {
    gl.toneMapping = TONE_MAPPING[toneMapping] ?? THREE.AgXToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, toneMapping, exposure]);
  return null;
}

function CameraRig({ params, signals }: { params: SceneParams; signals: SceneSignals }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const angle = useRef(0);
  const cam = params.view.camera;

  useEffect(() => {
    angle.current = 0;
  }, [signals.resetCamera]);

  useFrame((_, dt) => {
    if (cam.orbit) angle.current += cam.orbitSpeed * dt;
    camera.position.set(
      Math.sin(angle.current) * cam.distance,
      cam.height,
      Math.cos(angle.current) * cam.distance,
    );
    camera.lookAt(0, 0, 0);
    if (camera.fov !== cam.fov) {
      camera.fov = cam.fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function Lights({ params }: { params: SceneParams }) {
  const { ambient, key, rim, point } = params.light;
  const pointRef = useRef<THREE.PointLight>(null);
  const az = THREE.MathUtils.degToRad(key.direction.x);
  const el = THREE.MathUtils.degToRad(key.direction.y);
  const keyPos: [number, number, number] = [
    Math.cos(el) * Math.sin(az) * 10,
    Math.sin(el) * 10,
    Math.cos(el) * Math.cos(az) * 10,
  ];

  useFrame(({ clock }) => {
    const p = pointRef.current;
    if (!p) return;
    const t = clock.elapsedTime * point.orbitSpeed;
    p.position.set(Math.cos(t) * point.orbitRadius, 1, Math.sin(t) * point.orbitRadius);
  });

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight position={keyPos} intensity={key.intensity} color={key.color} />
      <directionalLight position={[-keyPos[0], 2, -keyPos[2]]} intensity={rim.intensity} color={rim.color} />
      {point.enabled && <pointLight ref={pointRef} intensity={point.intensity} color={point.color} distance={20} />}
    </>
  );
}

function heroGeometry(h: SceneParams["hero"]): THREE.BufferGeometry {
  const d = Math.round(h.detail);
  switch (h.shape) {
    case "torus":
      return new THREE.TorusGeometry(1, h.tube, Math.max(8, d / 4), d);
    case "icosahedron":
      return new THREE.IcosahedronGeometry(1.2, Math.min(6, Math.floor(d / 64)));
    case "sphere":
      return new THREE.SphereGeometry(1.2, d / 2, d / 4);
    default:
      return new THREE.TorusKnotGeometry(1, h.tube, d, Math.max(8, d / 8), h.knotP, h.knotQ);
  }
}

function Hero({ params, signals }: { params: SceneParams; signals: SceneSignals }) {
  const h = params.hero;
  const m = h.material;
  const { pulseSpring, pulseStrength, hoverEase, hoverScale } = params.motion;
  const meshRef = useRef<THREE.Mesh>(null);
  const pulse = useMemo(() => new Animator(1, pulseSpring), []);
  const hover = useMemo(() => new Animator(1, hoverEase), []);
  pulse.transition = pulseSpring;
  hover.transition = hoverEase;

  const texture = usePatternTexture(m.pattern, m.patternScale);

  const geometry = useMemo(
    () => heroGeometry(h),
    [h.shape, h.detail, h.tube, h.knotP, h.knotQ],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const firstPulse = useRef(true);
  useEffect(() => {
    if (firstPulse.current) {
      firstPulse.current = false;
      return;
    }
    pulse.jump(1 + pulseStrength);
    pulse.to(1);
  }, [signals.pulse]);

  useFrame(({ clock }, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    mesh.rotation.y += h.spin * dt;
    mesh.rotation.x = Math.sin(t * 0.7) * h.wobble;
    mesh.rotation.z = Math.cos(t * 0.5) * h.wobble * 0.5;
    mesh.scale.setScalar(h.scale * pulse.step(dt) * hover.step(dt));
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={() => hover.to(hoverScale)}
      onPointerOut={() => hover.to(1)}
      onClick={() => {
        pulse.jump(1 + pulseStrength);
        pulse.to(1);
      }}
    >
      <meshPhysicalMaterial
        key={h.flatShading ? "flat" : "smooth"}
        color={m.color}
        map={texture}
        roughness={m.roughness}
        metalness={m.metalness}
        clearcoat={m.clearcoat}
        emissive={m.emissive}
        emissiveIntensity={m.emissiveIntensity}
        wireframe={h.wireframe}
        flatShading={h.flatShading}
      />
    </mesh>
  );
}

function usePatternTexture(url: string, repeat: number): THREE.Texture | null {
  const texture = useMemo(() => {
    if (!url) return null;
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (texture) texture.repeat.set(repeat, repeat / 4);
  return texture;
}

const FIELD_GEOMETRY: Record<string, () => THREE.BufferGeometry> = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.6, 12, 8),
  cone: () => new THREE.ConeGeometry(0.6, 1.2, 10),
};

function Field({ params }: { params: SceneParams }) {
  const f = params.field;
  const side = Math.round(f.count);
  const total = side * side;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => (FIELD_GEOMETRY[f.shape] ?? FIELD_GEOMETRY.box)(), [f.shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const a = new THREE.Color(f.palette.colorA);
    const b = new THREE.Color(f.palette.colorB);
    const c = new THREE.Color();
    const half = (side - 1) / 2;
    for (let i = 0; i < total; i++) {
      const x = (i % side) - half;
      const z = Math.floor(i / side) - half;
      const d = Math.min(1, Math.hypot(x, z) / (half * Math.SQRT2 || 1));
      mesh.setColorAt(i, c.lerpColors(a, b, d));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [side, total, f.shape, f.palette.colorA, f.palette.colorB]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime * f.wave.speed;
    const half = (side - 1) / 2;
    for (let i = 0; i < total; i++) {
      const gx = (i % side) - half;
      const gz = Math.floor(i / side) - half;
      const x = gx * f.spacing;
      const z = gz * f.spacing;
      const phase = f.wave.ripple
        ? Math.hypot(x, z) * f.wave.frequency * 2 - t
        : (x + z) * f.wave.frequency - t;
      const y = f.floor + Math.sin(phase) * f.wave.amplitude;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, phase * f.wave.twist, Math.cos(phase) * f.wave.twist * 0.5);
      dummy.scale.setScalar(f.size * (0.6 + 0.4 * (Math.sin(phase) * 0.5 + 0.5)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    // Keyed on capacity: InstancedMesh can't grow after construction.
    <instancedMesh key={total} ref={meshRef} args={[geometry, undefined, total]}>
      <meshStandardMaterial roughness={f.palette.roughness} metalness={f.palette.metalness} />
    </instancedMesh>
  );
}

function StatsProbe({ stats }: { stats: StatsStore }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time < 0.5) return;
    let instances = 0;
    scene.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) instances += (o as THREE.InstancedMesh).count;
    });
    stats.set({
      fps: Math.round(acc.current.frames / acc.current.time),
      instances,
      triangles: gl.info.render.triangles,
    });
    acc.current = { frames: 0, time: 0 };
  });
  return null;
}
