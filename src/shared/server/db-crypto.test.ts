import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { decryptText, encryptText, initCrypto } from "./crypto";
import { closeDb, getDb } from "./db";

// The vitest env key (vitest.config.ts).
const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";

const holder = globalThis as typeof globalThis & {
  __jobassistantCryptoKey?: Buffer;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  initCrypto(KEY);
});
afterAll(closeDb);

describe("AD-11 db.ts initialises crypto on first open", () => {
  it("makes encryption work once the database has opened with a key", async () => {
    holder.__jobassistantCryptoKey = undefined;
    await closeDb();
    await getDb();
    expect(decryptText(encryptText("kari"))).toBe("kari");
  });

  it("leaves crypto uninitialised when no key is configured", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    vi.resetModules();
    holder.__jobassistantCryptoKey = undefined;
    const fresh = await import("./db");
    const freshCrypto = await import("./crypto");
    await fresh.closeDb();
    try {
      await fresh.getDb();
      expect(() => freshCrypto.encryptText("x")).toThrow(
        "crypto is not initialised",
      );
    } finally {
      await fresh.closeDb();
    }
  });
});
