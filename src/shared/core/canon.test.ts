import { describe, expect, it } from "vitest";
import { canon } from "./canon";

describe("NFR-6 canon", () => {
  it("trims, converts CRLF to LF and collapses whitespace", () => {
    expect(canon("  a\r\nb \t c  ")).toBe("a b c");
  });

  it("converts a lone CR to whitespace", () => {
    expect(canon("a\rb")).toBe("a b");
  });

  it("normalises decomposed characters to NFC", () => {
    expect(canon("e\u0301")).toBe("\u00e9");
  });

  it("keeps Norwegian letters", () => {
    expect(canon("  Sårvurdering  på\r\nsykehus ")).toBe(
      "Sårvurdering på sykehus",
    );
  });

  it("is idempotent", () => {
    const once = canon(" x\r\n\r\ny\u0301  z ");
    expect(canon(once)).toBe(once);
  });
});
