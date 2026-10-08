"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { CameraConfig, LightPreset, Vec3, ViewerApi } from "./types";

const round = (v: THREE.Vector3): Vec3 => [Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000];
type Controls = { target: THREE.Vector3; update(): void; minDistance: number; maxDistance: number; maxPolarAngle: number };

/** Cahaya studio prosedural (tanpa mengunduh HDR dari luar, jadi bekerja offline dan tidak ada permintaan pihak ketiga). */
const LIGHTS: Record<LightPreset, { bg: string; items: { pos: [number, number, number]; scale: [number, number, number]; color: string; intensity: number }[] }> = {
  studio: { bg: "#E9EBE7", items: [
    { pos: [0, 6, 0], scale: [12, 12, 1], color: "#ffffff", intensity: 2.6 },
    { pos: [-7, 2, 3], scale: [8, 6, 1], color: "#ffffff", intensity: 1.4 },
    { pos: [7, 2, -3], scale: [8, 6, 1], color: "#e8eef2", intensity: 1.2 },
  ] },
  daylight: { bg: "#DCE5EA", items: [
    { pos: [0, 7, 0], scale: [14, 14, 1], color: "#dbeafe", intensity: 2.4 },
    { pos: [6, 4, 4], scale: [5, 5, 1], color: "#fff4d6", intensity: 3.2 },
    { pos: [-7, 1, -2], scale: [8, 5, 1], color: "#ffffff", intensity: 1 },
  ] },
  sunset: { bg: "#E8D9CF", items: [
    { pos: [0, 5, 0], scale: [10, 10, 1], color: "#ffd9b8", intensity: 1.8 },
    { pos: [7, 1.5, 3], scale: [6, 4, 1], color: "#ff9a56", intensity: 3.6 },
    { pos: [-7, 2, -3], scale: [8, 6, 1], color: "#b7c4e0", intensity: 0.9 },
  ] },
};

function Model({ url, config, apiRef }: { url: string; config: CameraConfig | null | undefined; apiRef: MutableRefObject<ViewerApi | null> }) {
  const { scene } = useGLTF(url);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const invalidate = useThree((s) => s.invalidate);

  // Letakkan model di tengah dengan dasarnya di y=0, supaya kamera, bayangan, dan batas zoom konsisten untuk model apa pun.
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    return { root, height: size.y, maxDim: Math.max(size.x, size.y, size.z) || 1 };
  }, [scene]);

  const apply = useCallback((c: CameraConfig | null | undefined) => {
    const { maxDim, height } = prepared;
    camera.fov = c?.fov ?? 40;
    const target = c ? new THREE.Vector3(...c.target) : new THREE.Vector3(0, height / 2, 0);
    const dist = (maxDim / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.6;
    camera.position.copy(c ? new THREE.Vector3(...c.position) : target.clone().add(new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(dist)));
    camera.near = Math.max(maxDim / 200, 0.01);
    camera.far = maxDim * 200;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.minDistance = maxDim * 0.15; controls.maxDistance = maxDim * 6; controls.maxPolarAngle = Math.PI * 0.52; // tidak masuk ke bawah lantai
      controls.target.copy(target); controls.update();
    } else camera.lookAt(target);
    invalidate();
  }, [prepared, camera, controls, invalidate]);

  useEffect(() => { apply(config); }, [apply, config]);

  useEffect(() => {
    apiRef.current = {
      getView: () => ({ position: round(camera.position), target: round(controls?.target ?? new THREE.Vector3()), fov: Math.round(camera.fov) }),
      zoom: (f) => {
        const t = controls?.target ?? new THREE.Vector3();
        const off = camera.position.clone().sub(t).multiplyScalar(f);
        off.setLength(Math.min(Math.max(off.length(), prepared.maxDim * 0.15), prepared.maxDim * 6));
        camera.position.copy(t).add(off);
        controls?.update(); invalidate();
      },
      reset: () => apply(config),
    };
    return () => { apiRef.current = null; };
  }, [apiRef, apply, camera, controls, config, invalidate, prepared]);

  return (
    <>
      <primitive object={prepared.root} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={prepared.maxDim * 2} blur={2.4} far={prepared.maxDim} frames={1} />
    </>
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error("3D viewer failed", e); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Notice({ title, text }: { title: string; text: string }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone px-6 text-center"><p className="font-serif text-2xl">{title}</p><p className="mt-2 max-w-sm text-sm text-mist">{text}</p></div>;
}

function Progress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div role="status" className="absolute inset-0 flex flex-col items-center justify-center bg-stone/80">
      <p className="text-sm">Loading 3D model {Math.round(progress)}%</p>
      <div className="mt-3 h-px w-48 bg-basalt/20"><div className="h-px bg-basalt transition-all" style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

const hasWebGL = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
const lowEnd = () => { const n = navigator as Navigator & { deviceMemory?: number }; return (n.hardwareConcurrency ?? 8) <= 2 || (n.deviceMemory ?? 8) <= 2; };

export default function ModelViewer({ url, label, lightPreset = "studio", camera, viewRef, className = "h-[62vh] min-h-[380px]" }: {
  url: string; label: string; lightPreset?: LightPreset; camera?: CameraConfig | null; viewRef?: MutableRefObject<ViewerApi | null>; className?: string;
}) {
  const own = useRef<ViewerApi | null>(null);
  const api = viewRef ?? own;
  const wrap = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [lost, setLost] = useState(false);
  const [low, setLow] = useState(false);
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [full, setFull] = useState(false);
  const L = LIGHTS[lightPreset] ?? LIGHTS.studio;

  useEffect(() => {
    setSupported(hasWebGL());
    const l = lowEnd(); setLow(l); if (l) setDpr([0.75, 1]);
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => { document.removeEventListener("fullscreenchange", onFs); useGLTF.clear(url); }; // bebaskan memori GPU
  }, [url]);

  async function toggleFull() {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenEnabled) { if (document.fullscreenElement) await document.exitFullscreen(); else await el.requestFullscreen().catch(() => setFull(true)); }
    else setFull((v) => !v); // iOS Safari: mode layar penuh lewat CSS
  }

  const btn = "flex h-10 w-10 items-center justify-center bg-paper/90 text-lg leading-none transition-colors hover:bg-paper";
  const unsupported = <Notice title="3D is not available on this device" text="Your browser or device cannot show 3D models. The photos and floor plans show the same property." />;
  const failed = <Notice title="The 3D model could not load" text="Please try again later. The photos and floor plans are still available." />;

  return (
    <div ref={wrap} role="group" aria-label={`3D model: ${label}`} tabIndex={0} style={{ background: L.bg }}
      className={`relative w-full overflow-hidden ${full ? "fixed inset-0 z-50 !h-screen" : className}`}>
      {supported === false || lost ? unsupported : supported === null ? null : (
        <Boundary fallback={failed}>
          <Canvas frameloop="demand" dpr={dpr} camera={{ fov: 40, near: 0.1, far: 1000, position: [4, 3, 4] }} gl={{ antialias: !low, alpha: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setLost(true); })}>
            <PerformanceMonitor onDecline={() => setDpr([0.6, 1])} />
            <ambientLight intensity={0.35} />
            <Environment resolution={low ? 128 : 256} background={false}>
              {L.items.map((it, i) => <Lightformer key={i} form="rect" position={it.pos} scale={it.scale} color={it.color} intensity={it.intensity} target={[0, 0, 0]} />)}
            </Environment>
            <OrbitControls makeDefault enablePan enableDamping={!low} dampingFactor={0.08} zoomSpeed={0.8} />
            <Model url={url} config={camera} apiRef={api} />
          </Canvas>
          <Progress />
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button type="button" className={btn} aria-label="Zoom in" onClick={() => api.current?.zoom(0.8)}>+</button>
            <button type="button" className={btn} aria-label="Zoom out" onClick={() => api.current?.zoom(1.25)}>−</button>
            <button type="button" className={`${btn} text-xs`} aria-label="Reset view" onClick={() => api.current?.reset()}>Reset</button>
            <button type="button" className={`${btn} text-xs`} aria-label={full ? "Exit full screen" : "Full screen"} aria-pressed={full} onClick={toggleFull}>{full ? "Exit" : "Full"}</button>
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] bg-paper/80 px-2 py-1 text-xs text-mist">Drag to rotate · scroll or pinch to zoom · right-click or two fingers to move</p>
        </Boundary>
      )}
    </div>
  );
}
