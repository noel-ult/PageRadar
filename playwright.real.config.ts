import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/real.spec.ts",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --port 3200 --webpack",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    env: {
      APP_ORIGIN: "http://localhost:3200",
      INTERNAL_API_URL: process.env.INTERNAL_API_URL!,
      NEXT_PUBLIC_GRAPHQL_URL: "/graphql",
      PAGERADAR_DIST_DIR: ".next-e2e-real",
    },
  },
});
