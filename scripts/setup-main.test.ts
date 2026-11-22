import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "ja-setup-main-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("AD-17 setup main(): the secrets step comes before the config", () => {
  it("writes the key first, so accounts on and no key still reach the database", () => {
    const file = join(dir, "fresh", "secrets.env");
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "--conditions=react-server",
        "scripts/setup.ts",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          VITEST: "", // empty counts as unset: not a test run
          E2E: "",
          ENCRYPTION_KEY: "",
          APP_ENV: "local",
          DATABASE_URL: "postgres://u:p@127.0.0.1:1/x",
          FEATURE_ACCOUNTS: "true",
          SECRETS_FILE: file,
        },
      },
    );
    expect(existsSync(file)).toBe(true);
    const key = /^ENCRYPTION_KEY=(.*)$/m.exec(readFileSync(file, "utf8"))?.[1];
    expect(key).toBeDefined();
    const bytes = Buffer.from(key ?? "", "base64");
    expect(bytes).toHaveLength(32);
    expect(bytes.toString("base64")).toBe(key);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("ECONNREFUSED");
    expect(run.stderr).not.toContain("ENCRYPTION_KEY is missing");
  }, 30_000);
});
