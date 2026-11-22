import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";

describe("AD-11 passwords", () => {
  it("stores scrypt$N$r$p$salt$hash with a 16-byte salt and a 64-byte hash", async () => {
    const stored = await hashPassword("correct horse");
    const parts = stored.split("$");
    expect(parts.slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"]);
    expect(Buffer.from(parts[4] ?? "", "base64url")).toHaveLength(16);
    expect(Buffer.from(parts[5] ?? "", "base64url")).toHaveLength(64);
    expect(stored).not.toContain("correct horse");
  });

  it("uses a new salt every time", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same"),
      hashPassword("same"),
    ]);
    expect(a).not.toBe(b);
  });

  it("verifies the right password and refuses a wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("correct horse ", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("is false for an email without an account, after the same work", async () => {
    expect(await verifyPassword("anything", undefined)).toBe(false);
  });

  it("is false for a stored value that is damaged or asks for too much", async () => {
    const good = await hashPassword("pw");
    const [, n, r, p, salt, hash] = good.split("$");
    const bad = [
      "",
      "not a hash",
      `bcrypt$${n}$${r}$${p}$${salt}$${hash}`,
      `scrypt$${n}$${r}$${p}$${salt}`,
      `scrypt$${n}$${r}$${p}$${salt}$${hash}$x`,
      `scrypt$16383$${r}$${p}$${salt}$${hash}`,
      `scrypt$1073741824$${r}$${p}$${salt}$${hash}`,
      `scrypt$${n}$1024$${p}$${salt}$${hash}`,
      `scrypt$${n}$${r}$1024$${salt}$${hash}`,
      `scrypt$${n}$${r}$${p}$!!$${hash}`,
      `scrypt$${n}$${r}$${p}$${salt}$`,
      `scrypt$0$${r}$${p}$${salt}$${hash}`,
      `scrypt$-16384$${r}$${p}$${salt}$${hash}`,
    ];
    for (const stored of bad) {
      expect(await verifyPassword("pw", stored)).toBe(false);
    }
  });
});
