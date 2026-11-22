import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseConfig } from "@/shared/server/config";
import { hashKey } from "@/shared/server/crypto";
import { closeDb, getDb } from "@/shared/server/db";
import {
  checkKeyStep,
  ensureSecret,
  LOCAL_STEPS,
  prepareSecrets,
  runSetup,
} from "./setup";

// Made-up constants.
const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const OTHER_KEY = Buffer.alloc(32, 7).toString("base64");

const dir = mkdtempSync(join(tmpdir(), "ja-setup-secrets-"));
afterAll(async () => {
  await closeDb();
  rmSync(dir, { recursive: true, force: true });
});

let counter = 0;
const newPath = () => join(dir, `run-${counter++}`, "secrets.env");

// An explicit env, without VITEST, so config reads the file as on a local run.
const localEnv = (SECRETS_FILE: string, extra = {}) => ({
  APP_ENV: "local",
  DATABASE_URL: "postgres://u:p@db:5432/x",
  SECRETS_FILE,
  ...extra,
});

function keyIn(path: string): string | undefined {
  return /^ENCRYPTION_KEY=(.*)$/m.exec(readFileSync(path, "utf8"))?.[1];
}

const isKey = (value: string | undefined) =>
  value !== undefined &&
  Buffer.from(value, "base64").length === 32 &&
  Buffer.from(value, "base64").toString("base64") === value;

describe("AD-17 ensureSecret", () => {
  it("creates the file, and its folder, with a 32-byte base64 key", () => {
    const path = newPath();
    expect(ensureSecret(localEnv(path))).toBe(true);
    expect(isKey(keyIn(path))).toBe(true);
    expect(readFileSync(path, "utf8")).toMatch(/^ENCRYPTION_KEY=\S+\n$/);
  });

  it("makes a different key each time", () => {
    const a = newPath();
    const b = newPath();
    ensureSecret(localEnv(a));
    ensureSecret(localEnv(b));
    expect(keyIn(a)).not.toBe(keyIn(b));
  });

  it("writes nothing when the environment has the key", () => {
    const path = newPath();
    expect(ensureSecret(localEnv(path, { ENCRYPTION_KEY: KEY }))).toBe(false);
    expect(existsSync(path)).toBe(false);
  });

  it("never overwrites a file that has the key", () => {
    const path = newPath();
    ensureSecret(localEnv(path));
    const before = readFileSync(path, "utf8");
    expect(ensureSecret(localEnv(path))).toBe(false);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("appends the key to a file with other settings and keeps them", () => {
    const path = newPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "AI_MODEL=from-file");
    expect(ensureSecret(localEnv(path))).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text.startsWith("AI_MODEL=from-file\nENCRYPTION_KEY=")).toBe(true);
    expect(isKey(keyIn(path))).toBe(true);
  });

  it("keeps a file that ends in a newline tidy when it appends", () => {
    const path = newPath();
    ensureSecret(localEnv(path));
    writeFileSync(path, "AI_MODEL=m\n");
    ensureSecret(localEnv(path));
    expect(readFileSync(path, "utf8")).toMatch(
      /^AI_MODEL=m\nENCRYPTION_KEY=\S+\n$/,
    );
  });
});

describe("AD-17 prepareSecrets behind the production guard", () => {
  it("writes on a local target", () => {
    const path = newPath();
    expect(prepareSecrets(localEnv(path))).toBe(true);
    expect(isKey(keyIn(path))).toBe(true);
  });

  it("writes nothing in a test run (VITEST set or E2E=1)", () => {
    for (const test of [{ VITEST: "true" }, { E2E: "1" }]) {
      const path = newPath();
      expect(prepareSecrets(localEnv(path, test))).toBe(false);
      expect(existsSync(path)).toBe(false);
    }
  });

  it("writes nothing against a foreign database, Hosted or PGlite", () => {
    const foreign = newPath();
    const hosted = newPath();
    const pglite = newPath();
    expect(
      prepareSecrets(
        localEnv(foreign, { DATABASE_URL: "postgres://u:p@x.example:5432/x" }),
      ),
    ).toBe(false);
    expect(
      prepareSecrets({
        APP_ENV: "hosted",
        ACCESS_CODE: "0123456789abcdef",
        DATABASE_URL: "postgres://u:p@db:5432/x",
        SECRETS_FILE: hosted,
      }),
    ).toBe(false);
    expect(
      prepareSecrets(localEnv(pglite, { DATABASE_URL: "pglite://memory" })),
    ).toBe(false);
    for (const path of [foreign, hosted, pglite]) {
      expect(existsSync(path)).toBe(false);
    }
  });

  it("works when accounts are on and the key does not exist yet", () => {
    const path = newPath();
    expect(prepareSecrets(localEnv(path, { FEATURE_ACCOUNTS: "true" }))).toBe(
      true,
    );
    const config = parseConfig({
      ...localEnv(path, { FEATURE_ACCOUNTS: "true" }),
      ENCRYPTION_KEY: keyIn(path),
    });
    expect(config.encryptionKey).toBe(keyIn(path));
  });
});

describe("AD-11 checkKeyStep", () => {
  const config = (encryptionKey: string | undefined) => ({
    ...parseConfig({
      APP_ENV: "local",
      DATABASE_URL: "postgres://u:p@db:5432/x",
    }),
    encryptionKey,
  });

  async function rows() {
    const db = await getDb();
    const result = await db.execute(sql`select key_hash from local_meta`);
    return (
      Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
    ) as { key_hash: string }[];
  }

  beforeEach(async () => {
    const db = await getDb();
    await db.execute(sql`delete from local_meta`);
  });

  it("stores sha256 of the key on the first start", async () => {
    await checkKeyStep(await getDb(), config(KEY));
    expect(await rows()).toEqual([{ key_hash: hashKey(KEY) }]);
  });

  it("accepts the same key on a later start and keeps one row", async () => {
    const db = await getDb();
    await checkKeyStep(db, config(KEY));
    await checkKeyStep(db, config(KEY));
    expect(await rows()).toHaveLength(1);
  });

  it("stops on another key, naming the way out and printing neither key nor hash", async () => {
    const db = await getDb();
    await checkKeyStep(db, config(KEY));
    let message = "";
    try {
      await checkKeyStep(db, config(OTHER_KEY));
    } catch (error) {
      message = String((error as Error).message);
    }
    expect(message).toContain("the key doesn't match this database");
    expect(message).toContain("docker compose down -v");
    expect(message).toContain(".data/");
    for (const secret of [KEY, OTHER_KEY, hashKey(KEY), hashKey(OTHER_KEY)]) {
      expect(message).not.toContain(secret);
    }
    expect(await rows()).toEqual([{ key_hash: hashKey(KEY) }]);
  });

  it("does nothing without a key", async () => {
    await checkKeyStep(await getDb(), config(undefined));
    expect(await rows()).toHaveLength(0);
  });

  it("only ever holds one row", async () => {
    const db = await getDb();
    await expect(
      db.execute(sql`insert into local_meta (id, key_hash) values (2, 'x')`),
    ).rejects.toThrow();
  });

  it("is part of setup on a local target, and not run against a foreign one", async () => {
    const db = await getDb();
    expect(LOCAL_STEPS).toContain(checkKeyStep);
    const foreign = {
      ...config(KEY),
      ...parseConfig({
        APP_ENV: "local",
        DATABASE_URL: "postgres://u:p@x.example:5432/x",
      }),
      encryptionKey: KEY,
    };
    await runSetup(db, foreign, LOCAL_STEPS);
    expect(await rows()).toHaveLength(0);
    await runSetup(db, config(KEY), LOCAL_STEPS);
    expect(await rows()).toEqual([{ key_hash: hashKey(KEY) }]);
    await expect(runSetup(db, config(OTHER_KEY), LOCAL_STEPS)).rejects.toThrow(
      /doesn't match this database/,
    );
  });
});
