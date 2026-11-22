import { defineConfig } from "@playwright/test";

const PORT = 3100;
// A second server on the same build runs as Hosted (Story 1.6). The build never
// reads run-time settings, so it needs no build of its own; Playwright starts
// the servers in order, so it starts after the first has built.
const HOSTED_PORT = 3101;
// A third server runs with live AI settings and a made-up key, so Test mode is
// off and the AI notice (Story 3.6) can be tested in a browser. The key is not
// a real one: the Keyword fallback is switched off here (Story 3.11), so phase
// 1 is code only, and the tests answer the Letter request (phase 2) in the
// browser, so nothing reaches a provider.
const LIVE_PORT = 3102;
// A fourth server is the third with the Keyword fallback left on (Story 3.11,
// FR-5b). Its phase-1 and phase-2 requests are answered in the browser, so the
// made-up key is never used and nothing reaches a provider.
const FALLBACK_PORT = 3103;
// A fifth server is the default one with the Gap analysis switched off
// (FEATURE_GAPS=false). The Gap analysis is on by default since Story 4.6, so
// the default server runs the Gaps and Letter requests together; this one keeps
// the Letter-only phase 2 under test.
const LETTER_ONLY_PORT = 3104;
// A sixth server is the third with the Gap analysis on, as it is by default
// since Story 4.6 (the third switches it off, so that its tests need only the
// Letter stub). Its Gaps and Letter requests are answered in the browser, so
// the made-up key is never used and nothing reaches a provider.
const LIVE_GAPS_PORT = 3105;
// A seventh server is the default one with rewording switched off
// (FEATURE_REWORDING=false). Rewording is on by default since Story 5.4, so the
// default server shows the suggestions; this one keeps the Gap analysis without
// them under test.
const REWORDING_OFF_PORT = 3106;
// An eighth server is the default one with accounts on (FEATURE_ACCOUNTS=true,
// Story 6.3), still in Test mode, so Profil and the account routes can be tested
// in a browser. The key is made up: 32 bytes, base64.
const ACCOUNTS_PORT = 3107;
const ACCOUNTS_ENCRYPTION_KEY = "ZTItYWNjb3VudHMta2V5LTMyLWJ5dGVzLTAxMjM0NTY=";
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
        FEATURE_KEYWORD_FALLBACK: "false",
        // The tests answer only the Letter request in the browser, and the key
        // is made up, so the Gap analysis (on by default) stays off here.
        FEATURE_GAPS: "false",
      },
    },
    {
      command: `next start -p ${FALLBACK_PORT}`,
      url: `http://localhost:${FALLBACK_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "false",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        AI_PROVIDER: "openrouter",
        AI_MODEL: "anthropic/claude-sonnet-5.5",
        AI_API_KEY: "e2e-not-a-real-key",
        // As on the live server: only the phase-1 and Letter requests are
        // answered in the browser.
        FEATURE_GAPS: "false",
      },
    },
    {
      command: `next start -p ${LETTER_ONLY_PORT}`,
      url: `http://localhost:${LETTER_ONLY_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "true",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        FEATURE_GAPS: "false",
        E2E: "1",
      },
    },
    {
      command: `next start -p ${LIVE_GAPS_PORT}`,
      url: `http://localhost:${LIVE_GAPS_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "false",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        AI_PROVIDER: "openrouter",
        AI_MODEL: "anthropic/claude-sonnet-5.5",
        AI_API_KEY: "e2e-not-a-real-key",
        FEATURE_KEYWORD_FALLBACK: "false",
        // On, as by default: the tests answer both phase-2 requests.
        FEATURE_GAPS: "true",
      },
    },
    {
      command: `next start -p ${REWORDING_OFF_PORT}`,
      url: `http://localhost:${REWORDING_OFF_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "true",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        FEATURE_REWORDING: "false",
        E2E: "1",
      },
    },
    {
      command: `next start -p ${ACCOUNTS_PORT}`,
      url: `http://localhost:${ACCOUNTS_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        TEST_MODE: "true",
        APP_ENV: "local",
        DATABASE_URL: "pglite://memory",
        FEATURE_ACCOUNTS: "true",
        ENCRYPTION_KEY: ACCOUNTS_ENCRYPTION_KEY,
        E2E: "1",
      },
    },
  ],
});
