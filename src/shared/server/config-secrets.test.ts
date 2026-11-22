import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  assertEncryptionKey,
  assertStartupConfig,
  DEFAULT_SECRETS_FILE,
  FEATURE_DEFAULTS,
  parseConfig,
  readEnv,
  secretsFilePath,
} from "./config";

// Made-up constants.
const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const OTHER_KEY = Buffer.alloc(32, 7).toString("base64");

const dir = mkdtempSync(join(tmpdir(), "ja-config-secrets-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let counter = 0;
function secretsFile(content: string): string {
  const path = join(dir, `secrets-${counter++}.env`);
  writeFileSync(path, content);
  return path;
}

const hostedEnv = {
  APP_ENV: "hosted",
  ACCESS_CODE: "a-long-random-code-1234",
  DATABASE_URL: "postgresql://user:pw@db.example.com:5432/postgres",
};

describe("AD-17 readEnv and SECRETS_FILE", () => {
  it("merges the file under the environment on a local run outside tests", () => {
    const SECRETS_FILE = secretsFile(
      `ENCRYPTION_KEY=${KEY}\nAI_MODEL=from-file\n`,
    );
    const merged = readEnv({ APP_ENV: "local", SECRETS_FILE });
    expect(merged.ENCRYPTION_KEY).toBe(KEY);
    expect(merged.AI_MODEL).toBe("from-file");
    expect(parseConfig(merged).encryptionKey).toBe(KEY);
  });

  it("treats an unset APP_ENV as local", () => {
    const SECRETS_FILE = secretsFile(`ENCRYPTION_KEY=${KEY}\n`);
    expect(readEnv({ SECRETS_FILE }).ENCRYPTION_KEY).toBe(KEY);
  });

  it("lets the environment win over the file", () => {
    const SECRETS_FILE = secretsFile(`ENCRYPTION_KEY=${KEY}\n`);
    const merged = readEnv({
      APP_ENV: "local",
      SECRETS_FILE,
      ENCRYPTION_KEY: OTHER_KEY,
    });
    expect(merged.ENCRYPTION_KEY).toBe(OTHER_KEY);
  });

  it("lets an empty environment value fall back to the file", () => {
    const SECRETS_FILE = secretsFile(`ENCRYPTION_KEY=${KEY}\n`);
    const merged = readEnv({
      APP_ENV: "local",
      SECRETS_FILE,
      ENCRYPTION_KEY: "",
    });
    expect(merged.ENCRYPTION_KEY).toBe(KEY);
  });

  it("ignores the file in a test run (VITEST or E2E=1)", () => {
    const SECRETS_FILE = secretsFile(`ENCRYPTION_KEY=${KEY}\n`);
    for (const test of [{ VITEST: "true" }, { E2E: "1" }]) {
      const merged = readEnv({ APP_ENV: "local", SECRETS_FILE, ...test });
      expect(merged.ENCRYPTION_KEY).toBeUndefined();
    }
  });

  it("ignores the file on Hosted", () => {
    const SECRETS_FILE = secretsFile(`ENCRYPTION_KEY=${KEY}\n`);
    const merged = readEnv({ ...hostedEnv, SECRETS_FILE });
    expect(merged.ENCRYPTION_KEY).toBeUndefined();
  });

  it("accepts a missing file", () => {
    const env = { APP_ENV: "local", SECRETS_FILE: join(dir, "missing.env") };
    expect(readEnv(env)).toEqual(env);
  });

  it("fails naming SECRETS_FILE when the file cannot be read", () => {
    const folder = join(dir, "a-folder");
    mkdirSync(folder);
    expect(() => readEnv({ APP_ENV: "local", SECRETS_FILE: folder })).toThrow(
      /SECRETS_FILE/,
    );
  });

  it("defaults the path to .data/secrets.env", () => {
    expect(DEFAULT_SECRETS_FILE).toBe(".data/secrets.env");
    expect(secretsFilePath({})).toBe(".data/secrets.env");
    expect(secretsFilePath({ SECRETS_FILE: "" })).toBe(".data/secrets.env");
    expect(secretsFilePath({ SECRETS_FILE: "/x/y.env" })).toBe("/x/y.env");
  });
});

describe("AD-11 encryption key rules in config", () => {
  it("keeps accounts off by default and the key optional", () => {
    expect(FEATURE_DEFAULTS.accounts).toBe(false);
    const config = parseConfig({});
    expect(config.features.accounts).toBe(false);
    expect(config.encryptionKey).toBeUndefined();
  });

  it("carries a valid key and treats an empty one as unset", () => {
    expect(parseConfig({ ENCRYPTION_KEY: KEY }).encryptionKey).toBe(KEY);
    expect(parseConfig({ ENCRYPTION_KEY: "" }).encryptionKey).toBeUndefined();
  });

  it("throws naming ENCRYPTION_KEY, never the value, for a key that is not 32 bytes of base64", () => {
    const bad = [
      "c2hvcnQ=",
      "not base64 at all, and not the right length either!!",
      Buffer.alloc(31, 1).toString("base64"),
      Buffer.alloc(33, 1).toString("base64"),
      // Same 32 bytes, but not the canonical text.
      `${KEY.slice(0, -2)}F=`,
      KEY.replace(/=$/, ""),
      Buffer.alloc(32, 7).toString("base64url"),
    ];
    for (const ENCRYPTION_KEY of bad) {
      for (const env of [{}, hostedEnv]) {
        let message = "";
        try {
          parseConfig({ ...env, ENCRYPTION_KEY });
        } catch (error) {
          message = String((error as Error).message);
        }
        expect(message).toMatch(/ENCRYPTION_KEY/);
        expect(message).not.toContain(ENCRYPTION_KEY);
      }
    }
  });

  it("stops, naming the setting and saying to run setup, with accounts on and no key locally", () => {
    const config = parseConfig({ FEATURE_ACCOUNTS: "true" });
    expect(() => assertEncryptionKey(config)).toThrow(
      /ENCRYPTION_KEY.*run setup/,
    );
  });

  it("fails startup on Hosted with accounts on and no key", () => {
    const config = parseConfig({ ...hostedEnv, FEATURE_ACCOUNTS: "true" });
    expect(() => assertEncryptionKey(config)).toThrow(/ENCRYPTION_KEY/);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    try {
      assertStartupConfig({
        ...hostedEnv,
        FEATURE_ACCOUNTS: "true",
        NEXT_RUNTIME: "nodejs",
      });
      expect(exit).toHaveBeenCalledWith(1);
      expect(String(stderr.mock.calls[0]?.[0])).toMatch(/ENCRYPTION_KEY/);
    } finally {
      stderr.mockRestore();
      exit.mockRestore();
    }
  });

  it("accepts accounts on with a key, and Hosted with accounts off and no key", () => {
    const on = parseConfig({ FEATURE_ACCOUNTS: "true", ENCRYPTION_KEY: KEY });
    expect(on.features.accounts).toBe(true);
    expect(() => assertEncryptionKey(on)).not.toThrow();
    expect(() => assertEncryptionKey(parseConfig(hostedEnv))).not.toThrow();
  });

  it("reads the config before the key exists, but still checks a key that is there", () => {
    expect(
      parseConfig({ FEATURE_ACCOUNTS: "true" }).encryptionKey,
    ).toBeUndefined();
    expect(() =>
      parseConfig({ FEATURE_ACCOUNTS: "true", ENCRYPTION_KEY: "short" }),
    ).toThrow(/ENCRYPTION_KEY/);
  });
});
