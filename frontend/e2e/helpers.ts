import { Page, expect } from "@playwright/test";

export const accounts = {
  admin: { email: "admin@osca-bulan.gov.ph", password: "password" },
  head: { email: "head@osca-bulan.gov.ph", password: "password" },
  leader: { email: "bsca.lajong@osca-bulan.gov.ph", password: "password" },
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expectLoggedIn(page);
}

export async function expectLoggedIn(page: Page) {
  await expect(page).toHaveURL(/dashboard/);
}
