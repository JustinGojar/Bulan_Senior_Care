import { test, expect } from "@playwright/test";
import { accounts, login } from "./helpers";

// Change these paths to your real admin-only pages.
const adminOnlyPages = ["/reports", "/users"];

test.describe("Role-based access", () => {
  for (const path of adminOnlyPages) {
    test(`leader cannot open ${path}`, async ({ page }) => {
      await login(page, accounts.leader.email, accounts.leader.password);
      await page.goto(path);
      await expect(page).not.toHaveURL(new RegExp(path));
    });
  }
});