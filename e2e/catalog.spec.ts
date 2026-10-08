import { expect, test } from "@playwright/test";
import { loginAsAdmin, slugOf } from "./helpers";

test("alur utama: admin menerbitkan properti, pengunjung menemukan dan menghubungi, admin melihat lead", async ({ page, browser }) => {
  const title = `E2E Villa ${Date.now()}`;
  const visitor = `Pengunjung ${Date.now()}`;

  // 1. Admin membuat dan menerbitkan properti
  await loginAsAdmin(page);
  await page.goto("/admin/properties/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Property type").selectOption({ index: 1 });
  await page.getByLabel("Price", { exact: true }).fill("3500000000");
  await page.getByRole("button", { name: "Location", exact: true }).click();
  await page.getByLabel("Area").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page).toHaveURL(/\/edit\?created=1/);

  // 2. Pengunjung (sesi terpisah) menemukannya lewat pencarian
  const ctx = await browser.newContext();
  const v = await ctx.newPage();
  await v.goto(`/properties?q=${encodeURIComponent(title)}`);
  await expect(v.getByRole("link", { name: title })).toBeVisible();
  await v.getByRole("link", { name: title }).first().click();
  await expect(v).toHaveURL(new RegExp(`/properties/${slugOf(title)}$`));
  await expect(v.getByRole("heading", { level: 1, name: title })).toBeVisible();
  expect(await v.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);

  // 3. Pengunjung mengirim pertanyaan
  await v.getByLabel("Ask a question").check();
  await v.getByLabel("Full name").fill(visitor);
  await v.getByLabel("Phone or WhatsApp").fill("081300001234");
  await v.getByRole("button", { name: "Send message" }).click();
  await expect(v.getByText(/Thank you/)).toBeVisible();

  // 4. Properti muncul di sitemap
  const sitemap = await ctx.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain(`/properties/${slugOf(title)}`);
  await ctx.close();

  // 5. Admin melihat lead
  await page.goto(`/admin/leads?q=${encodeURIComponent(visitor)}`);
  await expect(page.getByRole("link", { name: visitor })).toBeVisible();
});

test("favorit dan perbandingan tersimpan di perangkat", async ({ page }) => {
  await page.goto("/properties");
  const cards = page.locator("article");
  test.skip((await cards.count()) === 0, "Butuh minimal satu properti terbit");
  await cards.first().getByRole("button", { name: /^Save / }).click();
  await cards.first().getByRole("button", { name: /^Add .* to comparison$/ }).click();
  await expect(page.getByRole("link", { name: /^Saved \(1\)$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Compare \(1\)$/ })).toBeVisible();
  await page.getByRole("link", { name: /^Compare/ }).click();
  await expect(page.getByRole("heading", { name: "Compare properties" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("table")).toBeVisible(); // bertahan setelah muat ulang
});

test("halaman publik utama dapat dibuka tanpa galat", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/properties", "/locations", "/agents", "/about", "/contact", "/favorites", "/compare"]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expect(page.locator("h1").first(), path).toBeVisible();
  }
  expect(errors).toEqual([]);
});
