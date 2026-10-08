import { expect, type Page } from "@playwright/test";

export const admin = { email: process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? "admin@example.com", password: process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "" };

export async function login(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/admin$/);
}

export const slugOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
