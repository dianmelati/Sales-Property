import { defineConfig, devices } from "@playwright/test";

/**
 * Tes end-to-end. Butuh: database yang sudah di-migrasi dan di-seed, serta build produksi (npm run build).
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD  = akun super admin dari seed (ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
 * Tidak dijalankan di lingkungan pembuatan (tidak ada Next.js, PostgreSQL, atau jaringan di sana).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /(catalog|security)\.spec\.ts/, grep: /halaman publik utama|formulir publik|slug yang tidak ada/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
