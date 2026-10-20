import { defineConfig } from "@playwright/test";

// tests are run against result of `npm run build-prod`: single file build/schoolMathTest.html (see "test" in package.json)
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "line" : "list",
  use: {
    channel: "chrome", // use installed Google Chrome instead of downloading browsers via `npx playwright install`
    viewport: { width: 1500, height: 1000 },
    trace: "retain-on-failure",
  },
});
