import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AD-9 db:check", () => {
  it("passes from zero on PGlite and writes no migration files", () => {
    const hadDir = existsSync("drizzle");
    const hadHistory = existsSync("drizzle/meta/_journal.json");
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "--conditions=react-server",
        "scripts/db-check.ts",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: "postgres://u:p@127.0.0.1:1/x", // must be ignored
          VITEST: "", // empty counts as unset: not a test run
          E2E: "",
        },
      },
    );
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    expect(run.stdout).toContain(
      hadHistory
        ? "Migrations apply from zero on PGlite"
        : "No migration history yet",
    );
    expect(existsSync("drizzle")).toBe(hadDir);
  }, 30_000);
});
