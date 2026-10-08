export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return; // konfigurasi runtime belum tersedia saat build
  (await import("./lib/env-check")).assertConfig();
}
