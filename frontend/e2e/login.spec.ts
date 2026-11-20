import { test, expect } from "@playwright/test";

test("admin can sign in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@osca-bulan.gov.ph");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@osca-bulan.gov.ph");
  await page.getByLabel(/password/i).fill("wrong-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/dashboard/);
});
