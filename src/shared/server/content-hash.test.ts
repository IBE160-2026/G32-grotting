import { describe, expect, it } from "vitest";
import { contentHash } from "./content-hash";

describe("FR-5b contentHash", () => {
  it("is a 64-character hex string", () => {
    expect(contentHash("Vi søker en utvikler")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives one hash to texts that differ only in whitespace and line endings", () => {
    expect(contentHash("Vi søker\r\nen  utvikler \n")).toBe(
      contentHash("Vi søker en utvikler"),
    );
  });

  it("gives another hash to another text", () => {
    expect(contentHash("Vi søker en utvikler")).not.toBe(
      contentHash("Vi søker en designer"),
    );
  });

  it("treats a decomposed and a composed letter as the same text", () => {
    expect(contentHash("a\u030a")).toBe(contentHash("\u00e5"));
  });
});
