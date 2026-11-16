import { describe, expect, it } from "vitest";
import { normalise } from "./normalise";

describe("FR-6 normalise", () => {
  it("gives one form for hyphen and space variants", () => {
    const variants = ["front-end", "front end", "frontend", "Front‑End"];
    for (const v of variants) {
      expect(normalise(v)).toBe("frontend");
    }
  });

  it("treats every dash variant alike", () => {
    for (const dash of ["-", "‐", "‑", "‒", "–", "—"]) {
      expect(normalise(`front${dash}end`)).toBe("frontend");
    }
  });

  it("joins split compounds", () => {
    expect(normalise("data analyse")).toBe(normalise("dataanalyse"));
    expect(normalise("data   \n analyse")).toBe("dataanalyse");
  });

  it("drops soft hyphens and zero-width characters", () => {
    expect(normalise("pro­sjekt​leder﻿")).toBe("prosjektleder");
  });

  it("folds case and Unicode form, not æøå", () => {
    const upper = normalise("SÅRVURDERING");
    expect(upper).toBe("sårvurdering");
    expect(normalise("sårvurdering")).toBe(upper);
    expect(normalise("sårvurdering")).toBe(upper);
    expect(normalise("saarvurdering")).toBe("saarvurdering");
    expect(normalise("oe")).toBe("oe");
    expect(normalise("ae")).toBe("ae");
    expect(normalise("saarvurdering")).not.toBe(upper);
  });

  it("keeps digits and other punctuation, and spaces next to them", () => {
    expect(normalise("C++ utvikler")).toBe("c++ utvikler");
    expect(normalise("Node.js")).toBe("node.js");
    expect(normalise("ISO 27001")).toBe("iso 27001");
  });

  it("trims and gives an empty string for empty or blank input", () => {
    expect(normalise("")).toBe("");
    expect(normalise("  ")).toBe("");
    expect(normalise(" \t\r\n ")).toBe("");
    expect(normalise("  Agile  ")).toBe("agile");
  });

  it("is deterministic and idempotent", () => {
    const input = "  Front‑End  Data analyse ";
    expect(normalise(input)).toBe(normalise(input));
    expect(normalise(normalise(input))).toBe(normalise(input));
  });
});
