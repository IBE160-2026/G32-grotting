import { defineConfig } from "@playwright/test";

const PORT = 3100;
// A second server on the same build runs as Hosted (Story 1.6). The build never
// reads run-time settings, so it needs no build of its own; Playwright starts
// the servers in order, so it starts after the first has built.
const HOSTED_PORT = 3101;
// A third server runs with live AI settings and a made-up key, so Test mode is
// off and the AI notice (Story 3.6) can be tested in a browser. The key is not
// a real one: phase 1 is code only, and the tests answer the Letter request
// (phase 2) in the browser, so nothing reaches a provider.
const LIVE_PORT = 3102;
// Repeated in e2e/access.spec.ts.
const HOSTED_ACCESS_CODE = "e2e-access-code-0123456789";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: [
    {
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
    {
      command: `next start -p ${HOSTED_PORT}`,
      url: `http://localhost:${HOSTED_PORT}/tilgang`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        APP_ENV: "hosted",
        ACCESS_CODE: HOSTED_ACCESS_CODE,
        DATABASE_URL: "pglite://memory",
        E2E: "1",
      },
    },
    {
      command: `next start -p ${LIVE_PORT}`,
      url: `http://localhost:${LIVE_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "false",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        AI_PROVIDER: "openrouter",
        AI_MODEL: "anthropic/claude-sonnet-5.5",
        AI_API_KEY: "e2e-not-a-real-key",
      },
    },
  ],
});
