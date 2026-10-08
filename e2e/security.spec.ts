import { expect, test } from "@playwright/test";

test("header keamanan dan CSP terpasang", async ({ request }) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toBeTruthy();
  expect(h["x-powered-by"]).toBeUndefined();
});

test("area admin tidak diindeks dan API admin menolak tamu", async ({ request }) => {
  expect((await request.get("/api/admin/media")).status()).toBe(401);
  expect((await request.get("/api/admin/leads/export")).status()).toBe(401);
  const post = await request.post("/api/admin/media", { headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } });
  expect(post.status()).toBe(403);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
});

test("formulir publik menolak data tidak sah dengan pesan, bukan galat server", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page.getByText("Enter your name")).toBeVisible();
});

test("slug yang tidak ada menampilkan halaman 404 yang ramah", async ({ page }) => {
  const r = await page.goto("/properties/tidak-ada-slug-ini");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This property is no longer listed" })).toBeVisible();
});
