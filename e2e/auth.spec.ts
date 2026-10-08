import { expect, test } from "@playwright/test";
import { E2E } from "./constants";
import { admin, login, loginAsAdmin } from "./helpers";

test("halaman admin mengarahkan tamu ke login", async ({ page }) => {
  await page.goto("/admin/properties");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("kata sandi salah menampilkan pesan umum dan tidak masuk", async ({ page }) => {
  await login(page, admin.email, "salah-total-123");
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login, lihat dashboard, keluar", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("EDITOR tidak bisa membuka pengguna maupun lead", async ({ page }) => {
  await login(page, E2E.editor, E2E.password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "Leads" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  for (const path of ["/admin/users", "/admin/leads", "/admin/audit", "/admin/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "You do not have access" }), path).toBeVisible();
  }
});

test("AGENT hanya melihat lead miliknya", async ({ page }) => {
  await login(page, E2E.agent, E2E.password);
  await page.goto("/admin/leads");
  await expect(page.getByText(E2E.ownLead)).toBeVisible();
  await expect(page.getByText(E2E.otherLead)).toHaveCount(0);
  await page.goto("/admin/properties/new");
  await expect(page.getByRole("heading", { name: "You do not have access" })).toBeVisible();
});
