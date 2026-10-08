export type Vec3 = [number, number, number];
export interface CameraConfig { position: Vec3; target: Vec3; fov: number }
export const LIGHT_PRESETS = ["studio", "daylight", "sunset"] as const;
export type LightPreset = (typeof LIGHT_PRESETS)[number];
export const PRESET_LABEL: Record<LightPreset, string> = { studio: "Studio (neutral)", daylight: "Daylight (cool, bright)", sunset: "Sunset (warm)" };
export interface ViewerApi { getView(): CameraConfig | null; zoom(factor: number): void; reset(): void }
export interface ModelView { id: string; label: string; url: string; sizeBytes: number; lightPreset: LightPreset; camera: CameraConfig | null }
