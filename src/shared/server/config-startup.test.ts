import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { isTestRunEnv } from "./config";

// Made-up constant.
const KEY = Buffer.alloc(32, 9).toString("base64");

const dir = mkdtempSync(join(tmpdir(), "ja-config-startup-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

// A local, non-test run as the app sees it.
function stubLocalRun(secretsFile: string) {
  vi.stubEnv("VITEST", "");
  vi.stubEnv("E2E", "");
  vi.stubEnv("ENCRYPTION_KEY", "");
  vi.stubEnv("APP_ENV", "local");
  vi.stubEnv("FEATURE_ACCOUNTS", "true");
  vi.stubEnv("DATABASE_URL", "pglite://memory");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("SECRETS_FILE", secretsFile);
}

function spyOnExit() {
  const exit = vi
    .spyOn(process, "exit")
    .mockImplementation((() => undefined) as never);
  const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  return { exit, stderr };
}

describe("AD-17 isTestRunEnv", () => {
  it("is true for VITEST set or E2E=1, and false for empty or other values", () => {
    expect(isTestRunEnv({ VITEST: "true" })).toBe(true);
    expect(isTestRunEnv({ E2E: "1" })).toBe(true);
    expect(isTestRunEnv({ VITEST: "" })).toBe(false);
    expect(isTestRunEnv({ E2E: "0" })).toBe(false);
    expect(isTestRunEnv({})).toBe(false);
  });
});

describe("AD-17 startup with the secrets file", () => {
  it("getConfig and assertStartupConfig read the key from the file by default", async () => {
    const file = join(dir, "good.env");
    writeFileSync(file, `ENCRYPTION_KEY=${KEY}\n`);
    stubLocalRun(file);
    const { exit } = spyOnExit();
    vi.resetModules();
    const config = await import("./config");
    expect(config.getConfig().encryptionKey === KEY).toBe(true);
    config.assertStartupConfig();
    expect(exit).not.toHaveBeenCalled();
  });

  it("reports an unreadable SECRETS_FILE on stderr and exits 1", async () => {
    const folder = join(dir, "a-folder");
    mkdirSync(folder);
    stubLocalRun(folder);
    const { exit, stderr } = spyOnExit();
    vi.resetModules();
    const { assertStartupConfig } = await import("./config");
    expect(() => assertStartupConfig()).not.toThrow();
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(stderr.mock.calls[0]?.[0])).toContain("SECRETS_FILE");
  });
});
