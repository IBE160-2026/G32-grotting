import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";
import { toRunMode } from "./run-mode";

describe("AD-4 toRunMode", () => {
  it("maps each flag to its own key and nothing else", () => {
    const config = parseConfig({
      DATABASE_URL: "pglite://memory",
      FEATURE_GAPS: "true",
      FEATURE_KEYWORD_FALLBACK: "true",
    });
    expect(toRunMode(config)).toEqual({
      testMode: true,
      hosted: false,
      features: {
        accounts: false,
        gaps: true,
        rewording: false,
        keywordFallback: true,
      },
    });
  });

  it("carries no database, AI or secret field", () => {
    const run = toRunMode(
      parseConfig({
        APP_ENV: "hosted",
        ACCESS_CODE: "a-long-access-code-1234",
        DATABASE_URL: "postgres://u:p@db.example.com/x",
        AI_PROVIDER: "p",
        AI_API_KEY: "key-value",
      }),
    );
    expect(Object.keys(run).sort()).toEqual(["features", "hosted", "testMode"]);
    expect(JSON.stringify(run)).not.toMatch(/postgres|key-value|access-code/);
    expect(run.hosted).toBe(true);
    expect(run.testMode).toBe(false);
  });
});
