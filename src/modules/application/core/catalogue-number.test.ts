import { describe, expect, it } from "vitest";
import { formatCatalogueNumber } from "./catalogue-number";

describe("formatCatalogueNumber", () => {
  it("pads to three digits", () => {
    expect(formatCatalogueNumber(1)).toBe("JA-001");
    expect(formatCatalogueNumber(2)).toBe("JA-002");
    expect(formatCatalogueNumber(42)).toBe("JA-042");
    expect(formatCatalogueNumber(999)).toBe("JA-999");
  });

  it("grows from 1000", () => {
    expect(formatCatalogueNumber(1000)).toBe("JA-1000");
    expect(formatCatalogueNumber(12_345)).toBe("JA-12345");
  });
});
