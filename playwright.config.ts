import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `next build && next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      TEST_MODE: "true",
      APP_ENV: "local",
      DATABASE_URL: "pglite://memory",
      E2E: "1",
    },
  },
});
