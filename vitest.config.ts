import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      "server-only": fromRoot("./test/server-only-stub.ts"),
    },
  },
  test: {
    // PGlite starts and migrates in each worker; parallel files make it slow,
    // most of all in the Docker test container, where Story 3.11's tests (the
    // saved Keyword lists need the database in phase 1) started more of them.
    testTimeout: 40_000,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "test/**/*.test.ts"],
    env: {
      APP_ENV: "local",
      DATABASE_URL: "pglite://memory",
      ENCRYPTION_KEY: "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=",
    },
  },
});
