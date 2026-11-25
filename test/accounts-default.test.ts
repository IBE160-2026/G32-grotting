import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_DEFAULTS, parseConfig } from "@/shared/server/config";

// Story 6.12: accounts are on by default, and the default is set in one place
// (`FEATURE_DEFAULTS` in config.ts): no compose file, example environment file,
// README, Dockerfile or CI step sets the flag, and CI needs no new secret.

const read = (path: string) => readFileSync(path, "utf8");

describe("AD-4 the accounts flag default (Story 6.12)", () => {
  it("is on in FEATURE_DEFAULTS and on for a local run that sets nothing", () => {
    expect(FEATURE_DEFAULTS.accounts).toBe(true);
    expect(parseConfig({}).features.accounts).toBe(true);
    expect(parseConfig({ APP_ENV: "local" }).features.accounts).toBe(true);
  });

  it("does not switch on on Hosted by itself, so a redeploy would not need a key", () => {
    const hosted = parseConfig({
      APP_ENV: "hosted",
      ACCESS_CODE: "a-long-random-code-1234",
      DATABASE_URL: "postgresql://user:pw@db.example.com:5432/postgres",
    });
    expect(hosted.features.accounts).toBe(false);
  });

  it("is set by no compose file, example environment, README, Dockerfile or workflow", () => {
    for (const path of [
      "compose.yaml",
      "Dockerfile",
      "README.md",
      ".github/workflows/ci.yml",
      ".github/workflows/keep-alive.yml",
    ]) {
      expect(read(path), path).not.toContain("FEATURE_ACCOUNTS");
    }
    // `.env.example` may name the setting, never give it a value.
    // (The test image leaves `.env*` out, so the file may not be there.)
    const example = existsSync(".env.example") ? read(".env.example") : "";
    for (const line of example.split(/\r?\n/)) {
      if (line.includes("FEATURE_ACCOUNTS")) {
        expect(line.trimStart().startsWith("#"), line).toBe(true);
        expect(line).not.toContain("=");
      }
    }
  });

  it("needs no new secret in CI, compose or the Dockerfile", () => {
    for (const path of [
      "compose.yaml",
      "Dockerfile",
      ".github/workflows/ci.yml",
    ]) {
      expect(read(path), path).not.toMatch(/ENCRYPTION_KEY|\$\{\{\s*secrets\./);
    }
  });
});
