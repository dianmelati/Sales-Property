import "server-only";
import { InvalidImageError } from "@/lib/media/process-image";

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
const bad = (m: string, code: "BAD_TYPE" | "UNREADABLE" = "BAD_TYPE") => { throw new InvalidImageError(code, m); };

type Json = { asset?: { version?: string }; buffers?: { uri?: string }[]; images?: { uri?: string }[]; extensionsRequired?: string[]; nodes?: unknown[] };

function check(j: Json) {
  if (!j.asset?.version?.startsWith("2")) bad("Only glTF 2.0 models are supported.");
  if (j.extensionsRequired?.includes("KHR_texture_basisu")) bad("This model uses KTX2 textures, which the viewer does not support. Export with PNG or JPG textures.");
  if ((j.nodes?.length ?? 0) > 100_000) bad("This model is too complex.");
  // Tidak boleh memuat berkas luar: viewer hanya memuat apa yang ada di dalam satu berkas ini.
  for (const x of [...(j.buffers ?? []), ...(j.images ?? [])]) {
    if (x.uri && !x.uri.startsWith("data:")) bad("This model refers to external files. Export a single self-contained .glb.");
  }
}

/** Memeriksa bahwa berkas benar-benar glTF 2.0 yang berdiri sendiri. Mengembalikan format dan tipe MIME. */
export function inspectModel(buf: Buffer): { ext: "glb" | "gltf"; mime: string } {
  if (buf.length < 20) bad("This file is not a valid 3D model.", "UNREADABLE");
  if (buf.readUInt32LE(0) === 0x46546c67) {
    if (buf.readUInt32LE(4) !== 2) bad("Only glTF 2.0 models are supported.");
    if (buf.readUInt32LE(8) !== buf.length) bad("The file looks incomplete or damaged.", "UNREADABLE");
    const len = buf.readUInt32LE(12);
    if (buf.readUInt32LE(16) !== 0x4e4f534a || 20 + len > buf.length) bad("The file looks damaged.", "UNREADABLE");
    try { check(JSON.parse(buf.toString("utf8", 20, 20 + len))); } catch (e) { if (e instanceof InvalidImageError) throw e; bad("The model data could not be read.", "UNREADABLE"); }
    return { ext: "glb", mime: "model/gltf-binary" };
  }
  const text = buf.toString("utf8").trim();
  if (text.startsWith("{")) {
    let json: Json;
    try { json = JSON.parse(text); } catch { return bad("The model data could not be read.", "UNREADABLE"); }
    check(json);
    return { ext: "gltf", mime: "model/gltf+json" };
  }
  return bad("Upload a .glb or .gltf file.");
}
