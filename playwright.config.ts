import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./frontend/e2e",
  fullyParallel: true,
  // The PHP development server handles one request at a time.
  workers: 1,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
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
      command: "npm run dev -- --port 5173 --strictPort",
      cwd: "./frontend",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      // Preserve CI's database environment in the PHP server subprocess.
      command: "php artisan serve --no-reload",
      cwd: "./backend",
      url: "http://127.0.0.1:8000/up",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
