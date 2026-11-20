import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173", // change if your port is different
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: "./frontend", // change to your frontend folder name
      url: "http://localhost:5173", // change if your port is different
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "php artisan serve",
      cwd: "./backend",
      url: "http://127.0.0.1:8000/up",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});