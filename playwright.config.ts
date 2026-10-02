import { defineConfig, devices } from "@playwright/test";
const production = process.env.PLAYWRIGHT_PRODUCTION === "1";
export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/real.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: production
      ? "node scripts/start-browser-test.mjs"
      : "npm run dev -- --port 3100 --webpack",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    env: production
      ? { NODE_ENV: "production", PORT: "3100", HOSTNAME: "127.0.0.1" }
      : { PAGERADAR_DIST_DIR: ".next-e2e" },
  },
});
