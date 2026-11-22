import { eq, sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DecryptError,
  decryptText,
  encryptedJson,
  encryptedText,
  encryptText,
  hashKey,
  initCrypto,
  openSection,
} from "./crypto";
import { closeDb, getDb } from "./db";

afterAll(closeDb);

// Made-up constants; the first is the test key from vitest.config.ts.
const KEY = "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyEhISE=";
const OTHER_KEY = Buffer.alloc(32, 7).toString("base64");

const holder = globalThis as typeof globalThis & {
  __jobassistantCryptoKey?: Buffer;
};

const people = pgTable("crypto_test_people", {
  id: integer("id").primaryKey(),
  plain: text("plain").notNull(),
  name: encryptedText("name").notNull(),
  section: encryptedJson("section").notNull(),
});

async function rawRows(query: ReturnType<typeof sql>) {
  const db = await getDb();
  const result = await db.execute(query);
  return (
    Array.isArray(result) ? result : (result as { rows: unknown[] }).rows
  ) as Record<string, string>[];
}

describe("AD-11 encryptText and decryptText", () => {
  beforeAll(() => initCrypto(KEY));

  it("round trips text, empty text and non-ASCII text", () => {
    for (const text of ["Kari Nordmann", "", "Søknad: æ ø å – «sitat» 🙂"]) {
      expect(decryptText(encryptText(text))).toBe(text);
    }
  });

  it("stores v1.iv.tag.ciphertext in base64url with a 12-byte iv and 16-byte tag", () => {
    const parts = encryptText("hello").split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    for (const part of parts) expect(part).toMatch(/^[A-Za-z0-9_-]*$/);
    expect(Buffer.from(parts[1] ?? "", "base64url")).toHaveLength(12);
    expect(Buffer.from(parts[2] ?? "", "base64url")).toHaveLength(16);
    expect(parts[3]).not.toContain("hello");
  });

  it("uses a new iv every time", () => {
    const ivs = new Set(
      Array.from({ length: 20 }, () => encryptText("same").split(".")[1]),
    );
    expect(ivs.size).toBe(20);
  });

  it("throws DecryptError when any part of the stored string changes", () => {
    const parts = encryptText("secret CV text").split(".");
    const flip = (part: string) =>
      `${part.startsWith("A") ? "B" : "A"}${part.slice(1)}`;
    for (let i = 0; i < parts.length; i++) {
      const changed = parts.map((part, at) => (at === i ? flip(part) : part));
      expect(() => decryptText(changed.join("."))).toThrow(DecryptError);
    }
    // The last character of a part can carry unused bits; still tampering.
    const last = parts[3] ?? "";
    const tail = last.endsWith("A") ? "Q" : "A";
    expect(() =>
      decryptText(
        [...parts.slice(0, 3), `${last.slice(0, -1)}${tail}`].join("."),
      ),
    ).toThrow(DecryptError);
  });

  it("throws DecryptError on a wrong version, a wrong shape and an empty string", () => {
    const stored = encryptText("x");
    expect(() => decryptText(stored.replace(/^v1/, "v2"))).toThrow(
      DecryptError,
    );
    expect(() => decryptText(`${stored}.extra`)).toThrow(DecryptError);
    expect(() => decryptText("plain text")).toThrow(DecryptError);
    expect(() => decryptText("")).toThrow(DecryptError);
  });

  it("throws DecryptError under another key, without naming a key or a value", () => {
    const stored = encryptText("secret CV text");
    initCrypto(OTHER_KEY);
    try {
      decryptText(stored);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DecryptError);
      const message = String((error as Error).message);
      for (const leak of [KEY, OTHER_KEY, stored, "secret CV text"]) {
        expect(message).not.toContain(leak);
      }
    } finally {
      initCrypto(KEY);
    }
  });

  it("rejects a key that is not 32 bytes of base64 without printing it", () => {
    for (const bad of ["", "c2hvcnQ=", `${KEY}AAAA`, "not base64 at all!"]) {
      let message = "";
      try {
        initCrypto(bad);
      } catch (error) {
        message = String((error as Error).message);
      }
      expect(message).toContain("ENCRYPTION_KEY");
      if (bad !== "") expect(message).not.toContain(bad);
    }
  });

  it("hashes the key to a hex SHA-256", () => {
    expect(hashKey(KEY)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKey(KEY)).toBe(hashKey(KEY));
    expect(hashKey(KEY)).not.toBe(hashKey(OTHER_KEY));
  });
});

describe("AD-11 before initCrypto", () => {
  it("throws 'crypto is not initialised' when a column type or helper is used", () => {
    const saved = holder.__jobassistantCryptoKey;
    holder.__jobassistantCryptoKey = undefined;
    try {
      expect(() => encryptText("x")).toThrow("crypto is not initialised");
      expect(() => decryptText("v1.a.b.c")).toThrow(
        "crypto is not initialised",
      );
      const column = people.name;
      expect(() => column.mapToDriverValue("x")).toThrow(
        "crypto is not initialised",
      );
      expect(() => column.mapFromDriverValue("v1.a.b.c")).toThrow(
        "crypto is not initialised",
      );
      const json = people.section;
      expect(() =>
        json.mapToDriverValue({ available: true, contractVersion: 1, data: 1 }),
      ).toThrow("crypto is not initialised");
      expect(() => json.mapFromDriverValue("v1.a.b.c")).toThrow(
        "crypto is not initialised",
      );
    } finally {
      holder.__jobassistantCryptoKey = saved;
    }
  });
});

describe("AD-11 column types on PGlite", () => {
  const section = (data: unknown) => ({
    available: true as const,
    contractVersion: 1,
    data,
  });

  beforeAll(async () => {
    const db = await getDb(); // opening initialises crypto from the config
    await db.execute(sql`drop table if exists crypto_test_people`);
    await db.execute(
      sql`create table crypto_test_people (id integer primary key, plain text not null, name text not null, section text not null)`,
    );
    await db.insert(people).values([
      {
        id: 1,
        plain: "visible",
        name: "Kari Nordmann",
        section: section({ letter: "Kjære Nordlys AS" }),
      },
      {
        id: 2,
        plain: "also visible",
        name: "Ola Nordmann",
        section: section({ letter: "Hei" }),
      },
    ]);
  });

  it("reads back what was written", async () => {
    const db = await getDb();
    const [row] = await db.select().from(people).where(eq(people.id, 1));
    expect(row?.name).toBe("Kari Nordmann");
    expect(row?.section).toEqual(section({ letter: "Kjære Nordlys AS" }));
  });

  it("stores no plaintext: a raw select shows only v1 ciphertext", async () => {
    const rows = await rawRows(
      sql`select plain, name, section from crypto_test_people where id = 1`,
    );
    const row = rows[0] ?? { plain: "", name: "", section: "" };
    expect(row.plain).toBe("visible");
    for (const value of [row.name, row.section]) {
      expect(value).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]*$/);
    }
    const everything = JSON.stringify(rows);
    for (const secret of ["Kari", "Nordmann", "Nordlys", "contractVersion"]) {
      expect(everything).not.toContain(secret);
    }
  });

  it("keeps contractVersion and data only inside the ciphertext", async () => {
    const [row] = await rawRows(
      sql`select section from crypto_test_people where id = 1`,
    );
    expect(JSON.parse(decryptText(row?.section ?? ""))).toEqual({
      contractVersion: 1,
      data: { letter: "Kjære Nordlys AS" },
    });
  });

  it("reads a tampered json section as unavailable and still returns the rest", async () => {
    const db = await getDb();
    const [stored] = await rawRows(
      sql`select section from crypto_test_people where id = 1`,
    );
    const parts = (stored?.section ?? "").split(".");
    const broken = [...parts.slice(0, 3), `${parts[3]}A`].join(".");
    await db.execute(
      sql`update crypto_test_people set section = ${broken} where id = 1`,
    );
    const rows = await db.select().from(people).orderBy(people.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.name).toBe("Kari Nordmann");
    expect(rows[0]?.section).toEqual({ available: false, reason: "decrypt" });
    expect(rows[1]?.section.available).toBe(true);
  });

  it("reads a json section under another key as unavailable", async () => {
    const db = await getDb();
    await db.execute(
      sql`update crypto_test_people set section = ${encryptText(JSON.stringify({ contractVersion: 1, data: 1 }))} where id = 2`,
    );
    initCrypto(OTHER_KEY);
    try {
      const [row] = await db
        .select({ section: people.section, plain: people.plain })
        .from(people)
        .where(eq(people.id, 2));
      expect(row?.section).toEqual({ available: false, reason: "decrypt" });
      expect(row?.plain).toBe("also visible");
    } finally {
      initCrypto(KEY);
    }
  });

  it("fails loudly on a bad encryptedText value", async () => {
    const db = await getDb();
    await db.execute(
      sql`update crypto_test_people set name = 'not encrypted' where id = 2`,
    );
    await expect(
      db.select().from(people).where(eq(people.id, 2)),
    ).rejects.toThrow(DecryptError);
  });

  it("reads a section that decrypts to something else as unavailable, reason parse", async () => {
    const db = await getDb();
    for (const plaintext of [
      '{"foo":1}',
      "not json",
      '{"contractVersion":"1","data":1}',
      "null",
    ]) {
      await db.execute(
        sql`update crypto_test_people set section = ${encryptText(plaintext)} where id = 1`,
      );
      const [row] = await db
        .select({ section: people.section })
        .from(people)
        .where(eq(people.id, 1));
      expect(row?.section).toEqual({ available: false, reason: "parse" });
    }
  });

  it("refuses a section that would not read back, with a generic error", () => {
    for (const bad of [
      { available: true as const, contractVersion: Number.NaN, data: 1 },
      { available: true as const, contractVersion: Infinity, data: 1 },
      { available: true as const, contractVersion: 1.5, data: 1 },
      { available: true as const, contractVersion: 1, data: undefined },
    ]) {
      expect(() => people.section.mapToDriverValue(bad)).toThrow(
        "Invalid section",
      );
    }
    // null is data JSON keeps.
    expect(() => people.section.mapToDriverValue(section(null))).not.toThrow();
  });

  it("refuses to store an unavailable section", async () => {
    const db = await getDb();
    await expect(
      db
        .update(people)
        .set({ section: { available: false, reason: "decrypt" } })
        .where(eq(people.id, 1)),
    ).rejects.toThrow();
  });
});

describe("AD-11 openSection", () => {
  it("runs the repository parser over data with the stored version", () => {
    const opened = openSection(
      { available: true, contractVersion: 2, data: { n: 3 } },
      (data, version) => ({ version, n: (data as { n: number }).n }),
    );
    expect(opened).toEqual({ available: true, value: { version: 2, n: 3 } });
  });

  it("turns a throwing parser into unavailable, reason parse", () => {
    const opened = openSection(
      { available: true, contractVersion: 1, data: "x" },
      () => {
        throw new Error("bad shape");
      },
    );
    expect(opened).toEqual({ available: false, reason: "parse" });
  });

  it("passes an unavailable section on unchanged", () => {
    const section = { available: false, reason: "decrypt" } as const;
    expect(openSection(section, () => 1)).toEqual(section);
  });
});
